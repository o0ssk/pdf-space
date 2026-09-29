import { normalizePdfTextForSearch } from "./pdfTextNormalization";
import { findPdfTextMatch } from "./pdfTextSearch";
import {
  ExtractedPdfPageText,
  ParsedPdfTextQuery,
  PdfTextPageStatus,
  WorkspaceTextSearchOccurrence,
} from "./pdfTextTypes";

export type PdfTextPageDiagnostic = {
  sourceDocumentId: string;
  originalPageIndex: number;
  extractionStatus: PdfTextPageStatus;
  textItemCount: number;
  itemStrings: string[];
  logicalText: string;
  normalizedText: string;
  originalQuery: string;
  normalizedQuery: string;
  directLogicalMatch: boolean;
  normalizedMatch: boolean;
  matchingTextItems: string[];
  alternativeSearchRepresentations: NonNullable<ExtractedPdfPageText["searchRepresentations"]> | null;
  matchedRepresentation: string | null;
  occurrenceConnected: boolean;
  currentDocumentName?: string | undefined;
  currentPageNumber?: number | undefined;
  sourceFileName?: string | undefined;
  originalPageNumber?: number | undefined;
  originalItemOrderText: string;
  itemsSortedAscendingX: string;
  itemsSortedDescendingX: string;
  reconstructedLogicalText: string;
  expectedDirection: "rtl" | "ltr";
  query: string;
  matched: boolean;
};

export function debugPdfTextSearchPage({
  sourceDocumentId,
  originalPageIndex,
  query,
  extractionStatus,
  record,
  occurrence,
}: {
  sourceDocumentId: string;
  originalPageIndex: number;
  query: ParsedPdfTextQuery;
  extractionStatus: PdfTextPageStatus;
  record?: ExtractedPdfPageText;
  occurrence?: WorkspaceTextSearchOccurrence;
}): PdfTextPageDiagnostic {
  const normalizedQuery = normalizePdfTextForSearch(query.original.replace(/^"|"$/gu, ""));
  const match = record?.status === "ready" ? findPdfTextMatch(record, query) : null;
  return {
    sourceDocumentId,
    originalPageIndex,
    extractionStatus,
    textItemCount: record?.textItems.length ?? 0,
    itemStrings: record?.textItems.map((item) => item.text) ?? [],
    logicalText: record?.logicalText ?? "",
    normalizedText: record?.normalizedText ?? "",
    originalQuery: query.original,
    normalizedQuery,
    directLogicalMatch:
      Boolean(query.original.trim()) &&
      Boolean(record?.logicalText.includes(query.original.trim())),
    normalizedMatch: Boolean(match),
    matchingTextItems:
      record?.textItems
        .filter((item) => query.terms.some((term) => item.normalizedText.includes(term)))
        .map((item) => item.text) ?? [],
    alternativeSearchRepresentations: record?.searchRepresentations ?? null,
    matchedRepresentation: match?.representation ?? null,
    occurrenceConnected: Boolean(occurrence),
    currentDocumentName: occurrence?.documentName,
    currentPageNumber: occurrence?.currentPageNumber,
    sourceFileName: occurrence?.sourceFileName,
    originalPageNumber: occurrence?.originalPageNumber,
    originalItemOrderText: record?.reconstructionDiagnostics?.originalItemOrderText ?? "",
    itemsSortedAscendingX: record?.reconstructionDiagnostics?.itemsSortedAscendingX ?? "",
    itemsSortedDescendingX: record?.reconstructionDiagnostics?.itemsSortedDescendingX ?? "",
    reconstructedLogicalText:
      record?.reconstructionDiagnostics?.reconstructedLogicalText ?? record?.logicalText ?? "",
    expectedDirection: record?.reconstructionDiagnostics?.expectedDirection ?? "ltr",
    query: query.original,
    matched: Boolean(match),
  };
}
