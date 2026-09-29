export type SourcePageKey = string;

export const PDF_TEXT_INDEX_VERSION = 2;

export type PdfTextSearchScope = "current-document" | "workspace";

export type PdfTextExtractionErrorCode =
  | "SOURCE_MISSING"
  | "SOURCE_LOAD_FAILED"
  | "PAGE_INDEX_OUT_OF_RANGE"
  | "PAGE_LOAD_FAILED"
  | "TEXT_EXTRACTION_FAILED"
  | "MALFORMED_TEXT_CONTENT"
  | "ENCRYPTED_OR_UNSUPPORTED"
  | "INDEX_CANCELLED"
  | "UNKNOWN";

export type ExtractedPdfTextItem = {
  text: string;
  normalizedText: string;
};

export type PdfTextPageStatus =
  | "pending"
  | "extracting"
  | "ready"
  | "empty"
  | "failed"
  | "cancelled";

export type PdfSearchRepresentations = {
  normal: string;
  whitespaceCollapsed: string;
  whitespaceRemoved: string;
  dehyphenated: string;
  adjacentItems: string;
};

export type PdfTextMatchedRepresentation = keyof PdfSearchRepresentations;

export type ExtractedPdfPageText = {
  indexVersion: number;
  key: SourcePageKey;
  sourceDocumentId: string;
  originalPageIndex: number;
  logicalText: string;
  normalizedText: string;
  searchRepresentations?: PdfSearchRepresentations | undefined;
  textItems: ExtractedPdfTextItem[];
  characterCount: number;
  extractedAt: number;
  status: Extract<PdfTextPageStatus, "ready" | "empty" | "failed">;
  errorCode?: PdfTextExtractionErrorCode | undefined;
  reconstructionDiagnostics?: {
    originalItemOrderText: string;
    itemsSortedAscendingX: string;
    itemsSortedDescendingX: string;
    reconstructedLogicalText: string;
    expectedDirection: "rtl" | "ltr";
  } | undefined;
};

export type WorkspaceTextSearchOccurrence = {
  pageId: string;
  documentId: string;
  documentName: string;
  documentColor: string;
  documentIndex: number;
  pageIndex: number;
  currentPageNumber: number;
  sourceDocumentId: string;
  sourceFileName?: string | undefined;
  sourcePageCount?: number | undefined;
  originalPageIndex: number;
  originalPageNumber: number;
  sourcePageKey: SourcePageKey;
};

export type ParsedPdfTextQuery = {
  original: string;
  normalized: string;
  terms: string[];
  isPhrase: boolean;
};

export type PdfTextSearchSnippet = {
  before: string;
  match: string;
  after: string;
};

export type PdfTextSearchResult = WorkspaceTextSearchOccurrence & {
  snippet: PdfTextSearchSnippet;
  matchCount: number;
  score: number;
  matchedRepresentation: PdfTextMatchedRepresentation;
};

export type PdfTextViewerContext = {
  query: string;
  results: Array<{
    pageId: string;
    documentId: string;
    matchCount: number;
  }>;
};

export type PdfTextIndexProgress = {
  status: "idle" | "indexing" | "paused" | "complete" | "cancelled" | "failed";
  scope: PdfTextSearchScope;
  completedSourcePages: number;
  totalSourcePages: number;
  searchablePages: number;
  emptyPages: number;
  failedPages: number;
  currentSourceFileName?: string | undefined;
  currentOriginalPageNumber?: number | undefined;
};

export function createSourcePageKey(
  sourceDocumentId: string,
  originalPageIndex: number
): SourcePageKey {
  return `${sourceDocumentId.length}:${sourceDocumentId}:${originalPageIndex}`;
}
