import {
  WorkspaceDocument,
  WorkspaceSourceDocuments,
} from "../../types/workspace";

export type ExportMemoryPreflight = {
  documentCount: number;
  pageCount: number;
  uniqueSourceCount: number;
  estimatedSourceBytes: number;
  missingSourceIds: string[];
  isLarge: boolean;
};

export function calculateExportMemoryPreflight({
  documents,
  sourceDocuments,
  selectedDocumentIds,
}: {
  documents: readonly WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  selectedDocumentIds: ReadonlySet<string>;
}): ExportMemoryPreflight {
  const selected = documents.filter((document) => selectedDocumentIds.has(document.id));
  const sourceIds = new Set(
    selected.flatMap((document) =>
      document.pages.map((page) => page.sourceDocumentId)
    )
  );
  const missingSourceIds = [...sourceIds].filter((id) => !sourceDocuments[id]);
  const estimatedSourceBytes = [...sourceIds].reduce(
    (total, id) => total + (sourceDocuments[id]?.size ?? 0),
    0
  );
  const pageCount = selected.reduce((total, document) => total + document.pages.length, 0);
  return {
    documentCount: selected.length,
    pageCount,
    uniqueSourceCount: sourceIds.size,
    estimatedSourceBytes,
    missingSourceIds,
    isLarge:
      pageCount >= 500 ||
      sourceIds.size >= 8 ||
      estimatedSourceBytes >= 256 * 1024 * 1024,
  };
}
