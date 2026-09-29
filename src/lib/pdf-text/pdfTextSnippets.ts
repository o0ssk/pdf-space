import { normalizePdfSearchTextWithMap } from "./pdfTextNormalization";
import { ParsedPdfTextQuery, PdfTextSearchSnippet } from "./pdfTextTypes";

function compactMappedText(normalized: string, rawIndexes: number[]): {
  text: string;
  rawIndexes: number[];
} {
  const characters: string[] = [];
  const indexes: number[] = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (!character || /\s/u.test(character)) continue;
    characters.push(character);
    indexes.push(rawIndexes[index] ?? index);
  }
  return { text: characters.join(""), rawIndexes: indexes };
}

function dehyphenatedMappedText(
  normalized: string,
  rawIndexes: number[],
  logicalText: string
): { text: string; rawIndexes: number[] } {
  const characters: string[] = [];
  const indexes: number[] = [];
  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized[index] === "-") {
      let next = index + 1;
      while (next < normalized.length && /\s/u.test(normalized[next] ?? "")) next += 1;
      const rawStart = rawIndexes[index] ?? 0;
      const rawEnd = rawIndexes[next] ?? rawStart;
      if (
        index > 0 &&
        next < normalized.length &&
        /\p{L}/u.test(normalized[index - 1] ?? "") &&
        /\p{L}/u.test(normalized[next] ?? "") &&
        logicalText.slice(rawStart, rawEnd + 1).includes("\n")
      ) {
        index = next - 1;
        continue;
      }
    }
    const character = normalized[index];
    if (!character) continue;
    characters.push(character);
    indexes.push(rawIndexes[index] ?? index);
  }
  return { text: characters.join(""), rawIndexes: indexes };
}

export function countPdfTextMatches(normalizedText: string, query: ParsedPdfTextQuery): number {
  const needle = query.normalized;
  if (!needle) return 0;
  let count = 0;
  let cursor = 0;
  while (cursor <= normalizedText.length - needle.length) {
    const found = normalizedText.indexOf(needle, cursor);
    if (found === -1) break;
    count += 1;
    cursor = found + Math.max(1, needle.length);
  }
  if (count > 0 || query.isPhrase || query.terms.length <= 1) return count;
  return Math.max(
    1,
    ...query.terms.map((term) => {
      let termCount = 0;
      let termCursor = 0;
      while (termCursor <= normalizedText.length - term.length) {
        const found = normalizedText.indexOf(term, termCursor);
        if (found === -1) break;
        termCount += 1;
        termCursor = found + Math.max(1, term.length);
      }
      return termCount;
    })
  );
}

export function createPdfTextSearchSnippet({
  logicalText,
  query,
  contextLength = 90,
}: {
  logicalText: string;
  normalizedText?: string;
  query: ParsedPdfTextQuery;
  contextLength?: number;
}): PdfTextSearchSnippet {
  const { normalized, rawIndexes } = normalizePdfSearchTextWithMap(logicalText);
  let normalizedStart = normalized.indexOf(query.normalized);
  let normalizedLength = query.normalized.length;
  let matchedIndexes = rawIndexes;
  if (normalizedStart === -1) {
    const firstTerm = query.terms.find((term) => normalized.includes(term));
    if (firstTerm) {
      normalizedStart = normalized.indexOf(firstTerm);
      normalizedLength = firstTerm.length;
    }
  }
  if (normalizedStart === -1) {
    const dehyphenatedText = dehyphenatedMappedText(normalized, rawIndexes, logicalText);
    normalizedStart = dehyphenatedText.text.indexOf(query.normalized);
    normalizedLength = query.normalized.length;
    matchedIndexes = dehyphenatedText.rawIndexes;
  }
  if (normalizedStart === -1) {
    const compactText = compactMappedText(normalized, rawIndexes);
    const compactQuery = query.normalized.replace(/\s/gu, "");
    normalizedStart = compactText.text.indexOf(compactQuery);
    normalizedLength = compactQuery.length;
    matchedIndexes = compactText.rawIndexes;
  }
  if (normalizedStart === -1) {
    normalizedStart = 0;
    normalizedLength = 0;
  }
  const rawStart = matchedIndexes[normalizedStart] ?? 0;
  const finalNormalizedIndex = Math.max(normalizedStart, normalizedStart + normalizedLength - 1);
  const rawEnd = (matchedIndexes[finalNormalizedIndex] ?? rawStart) + 1;
  const beforeStart = Math.max(0, rawStart - contextLength);
  const afterEnd = Math.min(logicalText.length, rawEnd + contextLength);
  return {
    before: `${beforeStart > 0 ? "…" : ""}${logicalText.slice(beforeStart, rawStart)}`,
    match: logicalText.slice(rawStart, rawEnd),
    after: `${logicalText.slice(rawEnd, afterEnd)}${afterEnd < logicalText.length ? "…" : ""}`,
  };
}
