import {
  WorkspaceDocument,
  WorkspaceSourceDocuments,
} from "../../types/workspace";

export type WorkspaceSearchDocumentItem = {
  type: "document";
  documentId: string;
  documentName: string;
  documentColor: string;
  documentIndex: number;
  pageCount: number;
  normalizedDocumentName: string;
  normalizedSearchText: string;
};

export type WorkspaceSearchPageItem = {
  type: "page";
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
  normalizedSourceFileName: string;
  originalPageIndex: number;
  originalPageNumber: number;
  normalizedDocumentName: string;
  normalizedSearchText: string;
};

export type WorkspaceSearchItem =
  | WorkspaceSearchDocumentItem
  | WorkspaceSearchPageItem;

export type WorkspaceSearchIndex = {
  documents: WorkspaceSearchDocumentItem[];
  pages: WorkspaceSearchPageItem[];
  documentById: Map<string, WorkspaceSearchDocumentItem>;
  pageById: Map<string, WorkspaceSearchPageItem>;
};

export type WorkspaceSearchQuery = {
  raw: string;
  normalized: string;
  text: string;
  mode: "empty" | "text" | "current-page" | "original-page" | "text-page";
  pageNumber: number | null;
};

export type WorkspaceSearchResults = {
  query: WorkspaceSearchQuery;
  documents: WorkspaceSearchDocumentItem[];
  pages: WorkspaceSearchPageItem[];
  totalDocumentMatches: number;
  totalPageMatches: number;
};

export const WORKSPACE_SEARCH_DOCUMENT_LIMIT = 8;
export const WORKSPACE_SEARCH_PAGE_LIMIT = 20;

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function normalizeWorkspaceSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_DIGITS[digit] ?? digit)
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceBaseName(value: string): string {
  return value.split(/[\\/]/).pop()?.trim() ?? "";
}

export function buildWorkspaceSearchIndex(
  documents: readonly WorkspaceDocument[],
  sourceDocuments: WorkspaceSourceDocuments
): WorkspaceSearchIndex {
  const documentItems: WorkspaceSearchDocumentItem[] = [];
  const pageItems: WorkspaceSearchPageItem[] = [];

  documents.forEach((document, documentIndex) => {
    if (
      !document ||
      typeof document.id !== "string" ||
      typeof document.name !== "string" ||
      !Array.isArray(document.pages)
    ) {
      return;
    }
    const normalizedDocumentName = normalizeWorkspaceSearchText(document.name);
    const documentItem: WorkspaceSearchDocumentItem = {
      type: "document",
      documentId: document.id,
      documentName: document.name,
      documentColor: document.color,
      documentIndex,
      pageCount: document.pages.length,
      normalizedDocumentName,
      normalizedSearchText: `${normalizedDocumentName} ${document.pages.length}`.trim(),
    };
    documentItems.push(documentItem);

    document.pages.forEach((page, pageIndex) => {
      if (
        !page ||
        typeof page.id !== "string" ||
        typeof page.sourceDocumentId !== "string" ||
        !Number.isInteger(page.originalPageIndex) ||
        page.originalPageIndex < 0
      ) {
        return;
      }
      const source = sourceDocuments[page.sourceDocumentId];
      const sourceFileName =
        source && typeof source.name === "string"
          ? sourceBaseName(source.name)
          : undefined;
      const normalizedSourceFileName = normalizeWorkspaceSearchText(
        sourceFileName ?? ""
      );
      const sourcePageCount =
        source && Number.isInteger(source.originalPageCount)
          ? source.originalPageCount
          : undefined;
      const currentPageNumber = pageIndex + 1;
      const originalPageNumber = page.originalPageIndex + 1;
      pageItems.push({
        type: "page",
        pageId: page.id,
        documentId: document.id,
        documentName: document.name,
        documentColor: document.color,
        documentIndex,
        pageIndex,
        currentPageNumber,
        sourceDocumentId: page.sourceDocumentId,
        sourceFileName,
        sourcePageCount,
        normalizedSourceFileName,
        originalPageIndex: page.originalPageIndex,
        originalPageNumber,
        normalizedDocumentName,
        normalizedSearchText: [
          normalizedDocumentName,
          normalizedSourceFileName,
          currentPageNumber,
          originalPageNumber,
        ].join(" "),
      });
    });
  });

  return {
    documents: documentItems,
    pages: pageItems,
    documentById: new Map(documentItems.map((item) => [item.documentId, item])),
    pageById: new Map(pageItems.map((item) => [item.pageId, item])),
  };
}

function positivePageNumber(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function parseWorkspaceSearchQuery(raw: string): WorkspaceSearchQuery {
  const normalized = normalizeWorkspaceSearchText(raw);
  if (!normalized) {
    return { raw, normalized, text: "", mode: "empty", pageNumber: null };
  }

  const originalMatch = normalized.match(
    /^(?:original(?: page)?|source|الاصلية|الاصليه)\s+(\d+)$/
  );
  const originalPageNumber = positivePageNumber(originalMatch?.[1]);
  if (originalPageNumber) {
    return {
      raw,
      normalized,
      text: "",
      mode: "original-page",
      pageNumber: originalPageNumber,
    };
  }

  const currentMatch = normalized.match(/^(?:page|p|صفحة|صفحه)\s+(\d+)$/);
  const currentPageNumber = positivePageNumber(currentMatch?.[1]);
  if (currentPageNumber) {
    return {
      raw,
      normalized,
      text: "",
      mode: "current-page",
      pageNumber: currentPageNumber,
    };
  }

  const numericPageNumber = positivePageNumber(normalized);
  if (numericPageNumber) {
    return {
      raw,
      normalized,
      text: normalized,
      mode: "current-page",
      pageNumber: numericPageNumber,
    };
  }

  const combinedMatch = normalized.match(/^(.+?)\s+(\d+)$/);
  const combinedPageNumber = positivePageNumber(combinedMatch?.[2]);
  if (combinedMatch?.[1] && combinedPageNumber) {
    return {
      raw,
      normalized,
      text: combinedMatch[1],
      mode: "text-page",
      pageNumber: combinedPageNumber,
    };
  }

  return {
    raw,
    normalized,
    text: normalized,
    mode: "text",
    pageNumber: null,
  };
}

function scoreText(field: string, query: string, base: number): number | null {
  if (!field || !query) return null;
  if (field === query) return base;
  if (field.startsWith(`${query} `) || field.startsWith(query)) return base - 80;
  const tokens = field.split(" ");
  if (tokens.includes(query)) return base - 140;
  const queryTokens = query.split(" ").filter(Boolean);
  if (queryTokens.length > 1 && queryTokens.every((token) => field.includes(token))) {
    return base - 190;
  }
  if (field.includes(query)) return base - 240;
  return null;
}

export function scoreWorkspaceSearchItem(
  item: WorkspaceSearchItem,
  query: WorkspaceSearchQuery
): number | null {
  if (query.mode === "empty") return null;

  if (item.type === "document") {
    const text = query.mode === "text-page" ? query.text : query.normalized;
    return scoreText(item.normalizedDocumentName, text, 1000);
  }

  if (query.mode === "current-page") {
    const currentMatch = item.currentPageNumber === query.pageNumber;
    const textMatch = query.text
      ? Math.max(
          scoreText(item.normalizedDocumentName, query.text, 800) ?? -1,
          scoreText(item.normalizedSourceFileName, query.text, 650) ?? -1
        )
      : 0;
    if (currentMatch) return 760 + Math.max(0, textMatch);
    return textMatch > 0 ? textMatch : null;
  }

  if (query.mode === "original-page") {
    return item.originalPageNumber === query.pageNumber ? 760 : null;
  }

  if (query.mode === "text-page") {
    if (item.currentPageNumber !== query.pageNumber) return null;
    const documentScore = scoreText(
      item.normalizedDocumentName,
      query.text,
      900
    );
    const sourceScore = scoreText(
      item.normalizedSourceFileName,
      query.text,
      760
    );
    const textScore = Math.max(documentScore ?? -1, sourceScore ?? -1);
    return textScore >= 0 ? textScore + 300 : null;
  }

  const documentScore = scoreText(
    item.normalizedDocumentName,
    query.text,
    820
  );
  const sourceScore = scoreText(
    item.normalizedSourceFileName,
    query.text,
    690
  );
  const score = Math.max(documentScore ?? -1, sourceScore ?? -1);
  return score >= 0 ? score : null;
}

function searchSort(
  left: { item: WorkspaceSearchItem; score: number },
  right: { item: WorkspaceSearchItem; score: number }
): number {
  if (left.score !== right.score) return right.score - left.score;
  if (left.item.documentIndex !== right.item.documentIndex) {
    return left.item.documentIndex - right.item.documentIndex;
  }
  const leftPageIndex = left.item.type === "page" ? left.item.pageIndex : -1;
  const rightPageIndex = right.item.type === "page" ? right.item.pageIndex : -1;
  return leftPageIndex - rightPageIndex;
}

export function searchWorkspace(
  index: WorkspaceSearchIndex,
  rawQuery: string,
  limits: { documents?: number; pages?: number } = {}
): WorkspaceSearchResults {
  const query = parseWorkspaceSearchQuery(rawQuery);
  const documentLimit = limits.documents ?? WORKSPACE_SEARCH_DOCUMENT_LIMIT;
  const pageLimit = limits.pages ?? WORKSPACE_SEARCH_PAGE_LIMIT;

  if (query.mode === "empty") {
    return {
      query,
      documents: index.documents.slice(0, documentLimit),
      pages: [],
      totalDocumentMatches: index.documents.length,
      totalPageMatches: 0,
    };
  }

  const documentMatches = index.documents
    .map((item) => ({ item, score: scoreWorkspaceSearchItem(item, query) }))
    .filter(
      (match): match is { item: WorkspaceSearchDocumentItem; score: number } =>
        match.score !== null
    )
    .sort(searchSort);
  const pageMatches = index.pages
    .map((item) => ({ item, score: scoreWorkspaceSearchItem(item, query) }))
    .filter(
      (match): match is { item: WorkspaceSearchPageItem; score: number } =>
        match.score !== null
    )
    .sort(searchSort);

  return {
    query,
    documents: documentMatches.slice(0, documentLimit).map(({ item }) => item),
    pages: pageMatches.slice(0, pageLimit).map(({ item }) => item),
    totalDocumentMatches: documentMatches.length,
    totalPageMatches: pageMatches.length,
  };
}
