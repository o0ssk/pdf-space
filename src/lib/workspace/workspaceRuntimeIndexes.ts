import {
  WorkspaceDocument,
  WorkspacePage,
} from "../../types/workspace";

export type WorkspacePagePosition = {
  documentIndex: number;
  pageIndex: number;
};

export type WorkspaceRuntimeIndexes = {
  documentById: Map<string, WorkspaceDocument>;
  pageById: Map<string, WorkspacePage>;
  documentIdByPageId: Map<string, string>;
  pagePositionById: Map<string, WorkspacePagePosition>;
};

export function buildWorkspaceRuntimeIndexes(
  documents: readonly WorkspaceDocument[]
): WorkspaceRuntimeIndexes {
  const documentById = new Map<string, WorkspaceDocument>();
  const pageById = new Map<string, WorkspacePage>();
  const documentIdByPageId = new Map<string, string>();
  const pagePositionById = new Map<string, WorkspacePagePosition>();

  documents.forEach((document, documentIndex) => {
    documentById.set(document.id, document);
    document.pages.forEach((page, pageIndex) => {
      pageById.set(page.id, page);
      documentIdByPageId.set(page.id, document.id);
      pagePositionById.set(page.id, { documentIndex, pageIndex });
    });
  });

  return {
    documentById,
    pageById,
    documentIdByPageId,
    pagePositionById,
  };
}

/**
 * A compact logical key that intentionally ignores thumbnail URLs/status.
 * Search and navigation indexes can stay stable while background rendering
 * updates runtime-only page fields.
 */
export function createWorkspaceTopologyKey(
  documents: readonly WorkspaceDocument[]
): string {
  return documents
    .map(
      (document) =>
        `${document.id}\u001f${document.name}\u001f${document.pages
          .map(
            (page) =>
              `${page.id}\u001e${page.documentId}\u001e${page.sourceDocumentId}\u001e${page.originalPageIndex}\u001e${page.pageNumber}\u001e${page.rotation}`
          )
          .join("\u001d")}`
    )
    .join("\u001c");
}
