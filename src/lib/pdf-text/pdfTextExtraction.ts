import { acquireWorkspacePdfDocument } from "../pdf/workspacePdfDocumentLoader";
import { normalizePdfTextForSearch } from "./pdfTextNormalization";
import {
  PdfTextContentLike,
  reconstructPdfTextContent,
} from "./pdfTextReconstruction";
export type { PdfTextContentLike } from "./pdfTextReconstruction";
import {
  ExtractedPdfPageText,
  ExtractedPdfTextItem,
  PdfTextExtractionErrorCode,
  PdfSearchRepresentations,
  PDF_TEXT_INDEX_VERSION,
  createSourcePageKey,
} from "./pdfTextTypes";

const LETTER_BEFORE_LINE_HYPHEN = /(\p{L})-[\t ]*\n[\t ]*(?=\p{L})/gu;

type PdfTextDocumentLike = {
  numPages: number;
  getPage?(pageNumber: number): Promise<{
    getTextContent(): Promise<PdfTextContentLike>;
  }>;
};
export function buildPdfSearchRepresentations(
  logicalText: string,
  itemTexts: readonly string[]
): PdfSearchRepresentations {
  const normal = normalizePdfTextForSearch(logicalText);
  const dehyphenatedRaw = logicalText.replace(LETTER_BEFORE_LINE_HYPHEN, "$1");
  return {
    normal,
    whitespaceCollapsed: normal,
    whitespaceRemoved: normal.replace(/\s/gu, ""),
    dehyphenated: normalizePdfTextForSearch(dehyphenatedRaw),
    adjacentItems: normalizePdfTextForSearch(itemTexts.join("")),
  };
}

export class PdfTextExtractionError extends Error {
  constructor(
    public readonly code: PdfTextExtractionErrorCode,
    message: string,
    public readonly sourceDocumentId?: string,
    public readonly originalPageIndex?: number
  ) {
    super(message);
    this.name = "PdfTextExtractionError";
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new PdfTextExtractionError("INDEX_CANCELLED", "PDF text indexing was cancelled.");
  }
}

export function buildSearchablePdfPageText(textContent: PdfTextContentLike): {
  logicalText: string;
  normalizedText: string;
  searchRepresentations: PdfSearchRepresentations;
  textItems: ExtractedPdfTextItem[];
  reconstructionDiagnostics: ExtractedPdfPageText["reconstructionDiagnostics"];
} {
  const reconstructed = reconstructPdfTextContent(textContent);
  const logicalText = reconstructed.logicalText;
  const textItems = reconstructed.lines.flatMap((line) =>
    line.items
      .filter((item) => Boolean(item.text.trim()))
      .map((item) => ({
        text: item.text,
        normalizedText: normalizePdfTextForSearch(item.text),
      }))
  );
  const searchRepresentations = buildPdfSearchRepresentations(
    logicalText,
    textItems.map((item) => item.text)
  );
  return {
    logicalText,
    normalizedText: searchRepresentations.normal,
    searchRepresentations,
    textItems,
    reconstructionDiagnostics: reconstructed.diagnostic,
  };
}

function mapExtractionError(
  error: unknown,
  sourceDocumentId: string,
  originalPageIndex: number
): PdfTextExtractionError {
  if (error instanceof PdfTextExtractionError) return error;
  const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
  const code: PdfTextExtractionErrorCode =
    name === "PasswordException" ? "ENCRYPTED_OR_UNSUPPORTED" : "TEXT_EXTRACTION_FAILED";
  return new PdfTextExtractionError(
    code,
    "Text could not be extracted from this PDF page.",
    sourceDocumentId,
    originalPageIndex
  );
}

export async function extractPdfPageText({
  sourceDocumentId,
  originalPageIndex,
  signal,
  getPdfDocument,
  now = Date.now,
}: {
  sourceDocumentId: string;
  originalPageIndex: number;
  signal?: AbortSignal;
  getPdfDocument?: (sourceDocumentId: string) => PdfTextDocumentLike | undefined;
  now?: () => number;
}): Promise<ExtractedPdfPageText> {
  throwIfAborted(signal);
  const lease = getPdfDocument
    ? undefined
    : await acquireWorkspacePdfDocument(sourceDocumentId).catch(() => undefined);
  const pdfDocument = getPdfDocument?.(sourceDocumentId) ?? lease?.document;
  if (!pdfDocument) {
    throw new PdfTextExtractionError(
      "SOURCE_MISSING",
      "The original PDF source is unavailable.",
      sourceDocumentId,
      originalPageIndex
    );
  }
  try {
    if (
      !Number.isInteger(originalPageIndex) ||
      originalPageIndex < 0 ||
      (Number.isFinite(pdfDocument.numPages) && originalPageIndex >= pdfDocument.numPages)
    ) {
      throw new PdfTextExtractionError(
        "PAGE_INDEX_OUT_OF_RANGE",
        "The requested original PDF page does not exist.",
        sourceDocumentId,
        originalPageIndex
      );
    }
    if (typeof pdfDocument.getPage !== "function") {
      throw new PdfTextExtractionError(
        "PAGE_LOAD_FAILED",
        "The PDF document cannot load pages.",
        sourceDocumentId,
        originalPageIndex
      );
    }
    const page = await pdfDocument.getPage(originalPageIndex + 1);
    throwIfAborted(signal);
    if (!page || typeof page.getTextContent !== "function") {
      throw new PdfTextExtractionError(
        "PAGE_LOAD_FAILED",
        "The PDF page could not be loaded.",
        sourceDocumentId,
        originalPageIndex
      );
    }
    const textContent = await page.getTextContent();
    throwIfAborted(signal);
    const built = buildSearchablePdfPageText(textContent);
    if (built.textItems.length > 0 && !built.normalizedText) {
      throw new PdfTextExtractionError(
        "MALFORMED_TEXT_CONTENT",
        "PDF.js returned text items that could not be normalized for searching.",
        sourceDocumentId,
        originalPageIndex
      );
    }
    return {
      indexVersion: PDF_TEXT_INDEX_VERSION,
      key: createSourcePageKey(sourceDocumentId, originalPageIndex),
      sourceDocumentId,
      originalPageIndex,
      ...built,
      characterCount: built.logicalText.length,
      extractedAt: now(),
      status: built.normalizedText ? "ready" : "empty",
    };
  } catch (error) {
    throw mapExtractionError(error, sourceDocumentId, originalPageIndex);
  } finally {
    lease?.release();
  }
}

export function createFailedPdfPageText({
  sourceDocumentId,
  originalPageIndex,
  errorCode,
  now = Date.now,
}: {
  sourceDocumentId: string;
  originalPageIndex: number;
  errorCode: PdfTextExtractionErrorCode;
  now?: () => number;
}): ExtractedPdfPageText {
  return {
    indexVersion: PDF_TEXT_INDEX_VERSION,
    key: createSourcePageKey(sourceDocumentId, originalPageIndex),
    sourceDocumentId,
    originalPageIndex,
    logicalText: "",
    normalizedText: "",
    searchRepresentations: buildPdfSearchRepresentations("", []),
    textItems: [],
    characterCount: 0,
    extractedAt: now(),
    status: "failed",
    errorCode,
  };
}
