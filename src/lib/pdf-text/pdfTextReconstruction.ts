import { normalizePdfTextForSearch } from "./pdfTextNormalization";
import { TextDirection } from "./textDirection";

export type PdfTextContentLike = {
  items: Array<
    | {
        str?: unknown;
        hasEOL?: boolean;
        transform?: unknown;
        width?: unknown;
        height?: unknown;
      }
    | unknown
  >;
};

export type PdfTextGeometryItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
  originalIndex: number;
};

export type ReconstructedPdfTextLine = {
  direction: TextDirection;
  text: string;
  items: PdfTextGeometryItem[];
};

export type PdfTextReconstructionDiagnostic = {
  originalItemOrderText: string;
  itemsSortedAscendingX: string;
  itemsSortedDescendingX: string;
  reconstructedLogicalText: string;
  expectedDirection: TextDirection;
};

export type ReconstructedPdfText = {
  logicalText: string;
  normalizedText: string;
  lines: ReconstructedPdfTextLine[];
  diagnostic: PdfTextReconstructionDiagnostic;
};

type InternalGeometryItem = PdfTextGeometryItem & {
  hasGeometry: boolean;
};

type PendingLine = {
  items: InternalGeometryItem[];
  referenceY: number;
  averageHeight: number;
  firstOriginalIndex: number;
  hasGeometry: boolean;
};

type StrongDirection = TextDirection | "neutral";

const RTL_SCRIPT_BLOCK_PATTERN = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/u;
const LETTER_PATTERN = /\p{Letter}/u;
const LATIN_SCRIPT_PATTERN = /\p{Script=Latin}/u;
const NUMBER_PATTERN = /\p{Number}/u;
const CLOSE_PUNCTUATION_PATTERN = /^[,.;:!?%،؛؟)\]}]/u;
const OPEN_PUNCTUATION_PATTERN = /[([{]$/u;

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function directionalCounts(value: string): { rtl: number; ltr: number } {
  let rtl = 0;
  let ltr = 0;
  for (const character of value) {
    if (!LETTER_PATTERN.test(character)) continue;
    if (RTL_SCRIPT_BLOCK_PATTERN.test(character)) rtl += 1;
    else if (LATIN_SCRIPT_PATTERN.test(character)) ltr += 1;
  }
  return { rtl, ltr };
}

export function detectStrongTextDirection(value: string): TextDirection {
  const counts = directionalCounts(value);
  return counts.rtl > counts.ltr ? "rtl" : "ltr";
}

function detectItemDirection(value: string): StrongDirection {
  const counts = directionalCounts(value);
  if (counts.rtl > counts.ltr) return "rtl";
  if (counts.ltr > counts.rtl) return "ltr";
  if (NUMBER_PATTERN.test(value)) return "ltr";
  return "neutral";
}

function toGeometryItem(candidate: unknown, originalIndex: number): InternalGeometryItem | null {
  if (!candidate || typeof candidate !== "object" || !("str" in candidate)) return null;
  const value = candidate as {
    str?: unknown;
    hasEOL?: boolean;
    transform?: unknown;
    width?: unknown;
    height?: unknown;
  };
  const text = typeof value.str === "string" ? value.str : "";
  const transform = Array.isArray(value.transform) ? value.transform : [];
  const hasGeometry =
    transform.length >= 6 &&
    typeof transform[4] === "number" &&
    Number.isFinite(transform[4]) &&
    typeof transform[5] === "number" &&
    Number.isFinite(transform[5]);
  return {
    text,
    x: finiteNumber(transform[4]),
    y: finiteNumber(transform[5]),
    width: Math.max(0, finiteNumber(value.width)),
    height: Math.max(0, finiteNumber(value.height, Math.abs(finiteNumber(transform[3])))),
    hasEOL: Boolean(value.hasEOL),
    originalIndex,
    hasGeometry,
  };
}

function lineTolerance(item: InternalGeometryItem, line: PendingLine): number {
  const itemHeight = item.height || line.averageHeight || 5;
  const lineHeight = line.averageHeight || itemHeight;
  return Math.max(2, Math.min(itemHeight, lineHeight) * 0.4);
}

function groupSegmentIntoLines(items: InternalGeometryItem[]): PendingLine[] {
  const lines: PendingLine[] = [];
  for (const item of items) {
    if (!item.text.trim()) continue;
    const matchingLine = item.hasGeometry
      ? lines.find(
          (line) =>
            line.hasGeometry &&
            Math.abs(item.y - line.referenceY) <= lineTolerance(item, line)
        )
      : lines.find((line) => !line.hasGeometry);
    if (!matchingLine) {
      lines.push({
        items: [item],
        referenceY: item.y,
        averageHeight: item.height,
        firstOriginalIndex: item.originalIndex,
        hasGeometry: item.hasGeometry,
      });
      continue;
    }
    matchingLine.items.push(item);
    const count = matchingLine.items.length;
    matchingLine.referenceY =
      (matchingLine.referenceY * (count - 1) + item.y) / count;
    matchingLine.averageHeight =
      (matchingLine.averageHeight * (count - 1) + item.height) / count;
  }
  return lines;
}

function groupItemsIntoLines(items: InternalGeometryItem[]): PendingLine[] {
  const lines: PendingLine[] = [];
  let segment: InternalGeometryItem[] = [];
  const flush = () => {
    if (segment.length > 0) lines.push(...groupSegmentIntoLines(segment));
    segment = [];
  };

  for (const item of items) {
    segment.push(item);
    if (item.hasEOL) flush();
  }
  flush();

  return lines.sort((left, right) => {
    if (left.hasGeometry && right.hasGeometry) {
      return right.referenceY - left.referenceY ||
        left.firstOriginalIndex - right.firstOriginalIndex;
    }
    return left.firstOriginalIndex - right.firstOriginalIndex;
  });
}

function rightEdge(item: InternalGeometryItem): number {
  return item.x + item.width;
}

function sortItemsByDirection(
  items: InternalGeometryItem[],
  direction: TextDirection
): InternalGeometryItem[] {
  if (!items.every((item) => item.hasGeometry)) {
    return [...items].sort((left, right) => left.originalIndex - right.originalIndex);
  }

  const baseSorted = [...items].sort((left, right) =>
    direction === "rtl"
      ? rightEdge(right) - rightEdge(left) || right.originalIndex - left.originalIndex
      : left.x - right.x || left.originalIndex - right.originalIndex
  );

  const runs: Array<{ direction: TextDirection; items: InternalGeometryItem[] }> = [];
  for (const item of baseSorted) {
    const detected = detectItemDirection(item.text);
    const itemDirection = detected === "neutral"
      ? runs[runs.length - 1]?.direction ?? direction
      : detected;
    const current = runs[runs.length - 1];
    if (!current || current.direction !== itemDirection) {
      runs.push({ direction: itemDirection, items: [item] });
    } else {
      current.items.push(item);
    }
  }

  return runs.flatMap((run) =>
    run.direction === direction
      ? run.items
      : [...run.items].sort((left, right) =>
          run.direction === "rtl"
            ? rightEdge(right) - rightEdge(left) || right.originalIndex - left.originalIndex
            : left.x - right.x || left.originalIndex - right.originalIndex
        )
  );
}

function graphemeCount(value: string): number {
  return Math.max(1, Array.from(value.trim()).length);
}

function horizontalGap(left: InternalGeometryItem, right: InternalGeometryItem): number {
  const leftStart = left.x;
  const leftEnd = rightEdge(left);
  const rightStart = right.x;
  const rightEnd = rightEdge(right);
  if (leftEnd < rightStart) return rightStart - leftEnd;
  if (rightEnd < leftStart) return leftStart - rightEnd;
  return 0;
}

function shouldInsertSpaceBetween(
  previous: PdfTextGeometryItem,
  next: PdfTextGeometryItem,
  _direction: TextDirection
): boolean {
  if (!previous.text || !next.text) return false;
  if (/\s$/u.test(previous.text) || /^\s/u.test(next.text)) return false;
  if (CLOSE_PUNCTUATION_PATTERN.test(next.text)) return false;
  if (OPEN_PUNCTUATION_PATTERN.test(previous.text)) return false;

  const previousInternal = previous as InternalGeometryItem;
  const nextInternal = next as InternalGeometryItem;
  if (!previousInternal.hasGeometry || !nextInternal.hasGeometry) return true;

  const previousCharacterWidth = previous.width / graphemeCount(previous.text);
  const nextCharacterWidth = next.width / graphemeCount(next.text);
  const averageCharacterWidth =
    [previousCharacterWidth, nextCharacterWidth].filter((value) => value > 0)
      .reduce((sum, value, _, values) => sum + value / values.length, 0) ||
    Math.max(previous.height, next.height, 4) * 0.5;
  return horizontalGap(previousInternal, nextInternal) > Math.max(0.75, averageCharacterWidth * 0.3);
}

function joinLineItems(items: InternalGeometryItem[], direction: TextDirection): string {
  let text = "";
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item) continue;
    const previous = items[index - 1];
    if (previous && shouldInsertSpaceBetween(previous, item, direction)) {
      text += " ";
    }
    text += item.text;
  }
  return text.replace(/[\t\f\v ]+/gu, " ").trim();
}

function joinOriginalOrder(items: InternalGeometryItem[]): string {
  const lines: string[] = [];
  let current: string[] = [];
  for (const item of [...items].sort((left, right) => left.originalIndex - right.originalIndex)) {
    if (item.text.trim()) current.push(item.text);
    if (item.hasEOL) {
      if (current.length > 0) lines.push(current.join(" ").trim());
      current = [];
    }
  }
  if (current.length > 0) lines.push(current.join(" ").trim());
  return lines.join("\n");
}

export function reconstructPdfTextContent(
  textContent: PdfTextContentLike
): ReconstructedPdfText {
  const geometryItems = (textContent.items ?? [])
    .map(toGeometryItem)
    .filter((item): item is InternalGeometryItem => Boolean(item));
  const pendingLines = groupItemsIntoLines(geometryItems);
  const lines: ReconstructedPdfTextLine[] = pendingLines.map((line) => {
    const direction = detectStrongTextDirection(
      line.items.map((item) => item.text).join(" ")
    );
    const orderedItems = sortItemsByDirection(line.items, direction);
    return {
      direction,
      text: joinLineItems(orderedItems, direction),
      items: orderedItems.map(({ hasGeometry: _hasGeometry, ...item }) => item),
    };
  }).filter((line) => Boolean(line.text));
  const logicalText = lines.map((line) => line.text).join("\n");
  const ascending = pendingLines.map((line) =>
    joinLineItems(
      [...line.items].sort((left, right) => left.x - right.x || left.originalIndex - right.originalIndex),
      "ltr"
    )
  ).join("\n");
  const descending = pendingLines.map((line) =>
    joinLineItems(
      [...line.items].sort((left, right) => rightEdge(right) - rightEdge(left) || right.originalIndex - left.originalIndex),
      "rtl"
    )
  ).join("\n");

  return {
    logicalText,
    normalizedText: normalizePdfTextForSearch(logicalText),
    lines,
    diagnostic: {
      originalItemOrderText: joinOriginalOrder(geometryItems),
      itemsSortedAscendingX: ascending,
      itemsSortedDescendingX: descending,
      reconstructedLogicalText: logicalText,
      expectedDirection: lines[0]?.direction ?? "ltr",
    },
  };
}
