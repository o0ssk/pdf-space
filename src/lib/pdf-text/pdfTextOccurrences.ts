import { WorkspaceDocument, WorkspaceSourceDocuments } from "../../types/workspace";
import {
  PdfTextSearchScope,
  WorkspaceTextSearchOccurrence,
  createSourcePageKey,
} from "./pdfTextTypes";

function basename(value: string): string {
  return value.split(/[\\/]/u).pop() ?? value;
}

export function buildWorkspaceTextSearchOccurrences(
  documents: readonly WorkspaceDocument[],
  sourceDocuments: WorkspaceSourceDocuments
): WorkspaceTextSearchOccurrence[] {
  return documents.flatMap((document, documentIndex) =>
    document.pages.map((page, pageIndex) => {
      const source = sourceDocuments[page.sourceDocumentId];
      return {
        pageId: page.id,
        documentId: document.id,
        documentName: document.name,
        documentColor: document.color,
        documentIndex,
        pageIndex,
        currentPageNumber: pageIndex + 1,
        sourceDocumentId: page.sourceDocumentId,
        sourceFileName: source?.name ? basename(source.name) : undefined,
        sourcePageCount: source?.originalPageCount,
        originalPageIndex: page.originalPageIndex,
        originalPageNumber: page.originalPageIndex + 1,
        sourcePageKey: createSourcePageKey(page.sourceDocumentId, page.originalPageIndex),
      };
    })
  );
}

export function filterTextSearchOccurrences(
  occurrences: readonly WorkspaceTextSearchOccurrence[],
  scope: PdfTextSearchScope,
  activeDocumentId: string | null
): WorkspaceTextSearchOccurrence[] {
  if (scope === "workspace") return [...occurrences];
  return occurrences.filter((item) => item.documentId === activeDocumentId);
}

export function uniqueSourcePageOccurrences(
  occurrences: readonly WorkspaceTextSearchOccurrence[]
): WorkspaceTextSearchOccurrence[] {
  const seen = new Set<string>();
  return occurrences.filter((item) => {
    if (seen.has(item.sourcePageKey)) return false;
    seen.add(item.sourcePageKey);
    return true;
  });
}
