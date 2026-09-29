import {
  PageRotation,
  WorkspaceDocument,
  WorkspacePage,
  WorkspaceSelectionState,
  WorkspaceSourceDocuments,
} from "../../types/workspace";
import { pruneSelection } from "../selection/pageSelection";
import { WorkspaceState } from "../workspace/workspaceState";

export type WorkspacePageSnapshot = Pick<
  WorkspacePage,
  | "id"
  | "documentId"
  | "sourceDocumentId"
  | "originalPageIndex"
  | "rotation"
  | "duplicatedFromPageId"
>;

export type WorkspaceDocumentSnapshot = Omit<
  WorkspaceDocument,
  "pages" | "pageCount"
> & {
  pages: WorkspacePageSnapshot[];
};

export type WorkspaceLogicalSnapshot = {
  documents: WorkspaceDocumentSnapshot[];
  sourceDocuments: WorkspaceSourceDocuments;
};

export type WorkspaceSelectionSnapshot = {
  selection: WorkspaceSelectionState;
  selectedDocumentId: string | null;
};

const VALID_ROTATIONS = new Set<PageRotation>([0, 90, 180, 270]);

function cloneSourceDocuments(
  sourceDocuments: WorkspaceSourceDocuments
): WorkspaceSourceDocuments {
  return Object.fromEntries(
    Object.entries(sourceDocuments).map(([sourceId, sourceDocument]) => [
      sourceId,
      { ...sourceDocument },
    ])
  );
}

export function createWorkspaceLogicalSnapshot(
  state: WorkspaceState
): WorkspaceLogicalSnapshot {
  return {
    documents: state.documents.map((document) => ({
      id: document.id,
      name: document.name,
      size: document.size,
      mimeType: document.mimeType,
      color: document.color,
      status: document.status,
      errorMessage: document.errorMessage,
      pages: document.pages.map((page) => ({
        id: page.id,
        documentId: page.documentId,
        sourceDocumentId: page.sourceDocumentId,
        originalPageIndex: page.originalPageIndex,
        rotation: page.rotation,
        duplicatedFromPageId: page.duplicatedFromPageId,
      })),
    })),
    sourceDocuments: cloneSourceDocuments(state.sourceDocuments),
  };
}

export function createWorkspaceSelectionSnapshot(
  state: Pick<WorkspaceState, "selection" | "selectedDocumentId">
): WorkspaceSelectionSnapshot {
  return {
    selection: {
      selectedPageIds: [...state.selection.selectedPageIds],
      anchorPageId: state.selection.anchorPageId,
      activePageId: state.selection.activePageId,
      activeContainerId: state.selection.activeContainerId,
    },
    selectedDocumentId: state.selectedDocumentId,
  };
}

function haveSamePageSnapshot(
  left: WorkspacePageSnapshot,
  right: WorkspacePageSnapshot
): boolean {
  return (
    left.id === right.id &&
    left.documentId === right.documentId &&
    left.sourceDocumentId === right.sourceDocumentId &&
    left.originalPageIndex === right.originalPageIndex &&
    left.rotation === right.rotation &&
    left.duplicatedFromPageId === right.duplicatedFromPageId
  );
}

function haveSameDocumentSnapshot(
  left: WorkspaceDocumentSnapshot,
  right: WorkspaceDocumentSnapshot
): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.size === right.size &&
    left.mimeType === right.mimeType &&
    left.color === right.color &&
    left.status === right.status &&
    left.errorMessage === right.errorMessage &&
    left.pages.length === right.pages.length &&
    left.pages.every((page, index) =>
      haveSamePageSnapshot(page, right.pages[index]!)
    )
  );
}

export function areWorkspaceLogicalSnapshotsEqual(
  left: WorkspaceLogicalSnapshot,
  right: WorkspaceLogicalSnapshot
): boolean {
  if (
    left.documents.length !== right.documents.length ||
    !left.documents.every((document, index) =>
      haveSameDocumentSnapshot(document, right.documents[index]!)
    )
  ) {
    return false;
  }

  const leftSourceIds = Object.keys(left.sourceDocuments).sort();
  const rightSourceIds = Object.keys(right.sourceDocuments).sort();
  if (
    leftSourceIds.length !== rightSourceIds.length ||
    !leftSourceIds.every((sourceId, index) => sourceId === rightSourceIds[index])
  ) {
    return false;
  }

  return leftSourceIds.every((sourceId) => {
    const leftSource = left.sourceDocuments[sourceId];
    const rightSource = right.sourceDocuments[sourceId];
    if (!leftSource || !rightSource) return false;
    return (
      leftSource.id === rightSource.id &&
      leftSource.name === rightSource.name &&
      leftSource.size === rightSource.size &&
      leftSource.mimeType === rightSource.mimeType &&
      leftSource.originalPageCount === rightSource.originalPageCount &&
      leftSource.importedAt === rightSource.importedAt
    );
  });
}

export function validateWorkspaceLogicalSnapshot(
  snapshot: WorkspaceLogicalSnapshot
): boolean {
  const documentIds = new Set<string>();
  const pageIds = new Set<string>();

  for (const document of snapshot.documents) {
    if (!document.id || documentIds.has(document.id)) return false;
    documentIds.add(document.id);

    for (const page of document.pages) {
      if (
        !page.id ||
        pageIds.has(page.id) ||
        page.documentId !== document.id ||
        !page.sourceDocumentId ||
        !Number.isInteger(page.originalPageIndex) ||
        page.originalPageIndex < 0 ||
        !VALID_ROTATIONS.has(page.rotation)
      ) {
        return false;
      }
      pageIds.add(page.id);
    }
  }

  return true;
}

function canPreservePageRuntime(
  currentPage: WorkspacePage,
  targetPage: WorkspacePageSnapshot
): boolean {
  return (
    currentPage.sourceDocumentId === targetPage.sourceDocumentId &&
    currentPage.originalPageIndex === targetPage.originalPageIndex &&
    currentPage.rotation === targetPage.rotation
  );
}

export function reconcileWorkspaceFromSnapshot(
  currentState: WorkspaceState,
  targetSnapshot: WorkspaceLogicalSnapshot,
  targetSelection: WorkspaceSelectionSnapshot
): WorkspaceState | null {
  if (!validateWorkspaceLogicalSnapshot(targetSnapshot)) return null;

  const currentPagesById = new Map(
    currentState.documents.flatMap((document) =>
      document.pages.map((page) => [page.id, page] as const)
    )
  );

  const documents: WorkspaceDocument[] = targetSnapshot.documents.map(
    (documentSnapshot) => {
      const pages = documentSnapshot.pages.map((pageSnapshot, index) => {
        const currentPage = currentPagesById.get(pageSnapshot.id);
        const logicalPage = {
          ...pageSnapshot,
          pageNumber: index + 1,
        };

        if (currentPage && canPreservePageRuntime(currentPage, pageSnapshot)) {
          return {
            ...currentPage,
            ...logicalPage,
          };
        }

        return {
          ...logicalPage,
          thumbnailStatus: "idle" as const,
        };
      });

      return {
        ...documentSnapshot,
        pageCount: pages.length,
        pages,
      };
    }
  );

  const selection = pruneSelection(targetSelection.selection, documents);
  const validDocumentIds = new Set(documents.map((document) => document.id));
  const selectedDocumentId =
    (targetSelection.selectedDocumentId &&
    validDocumentIds.has(targetSelection.selectedDocumentId)
      ? targetSelection.selectedDocumentId
      : null) ??
    (selection.activeContainerId &&
    validDocumentIds.has(selection.activeContainerId)
      ? selection.activeContainerId
      : null) ??
    (currentState.selectedDocumentId &&
    validDocumentIds.has(currentState.selectedDocumentId)
      ? currentState.selectedDocumentId
      : null) ??
    documents[0]?.id ??
    null;

  const restoredViewerPage =
    currentState.viewerOpen && currentState.viewerPageId
      ? documents
          .flatMap((document) => document.pages)
          .find((page) => page.id === currentState.viewerPageId)
      : null;

  return {
    documents,
    sourceDocuments: cloneSourceDocuments(targetSnapshot.sourceDocuments),
    selectedDocumentId,
    selection,
    viewerOpen: Boolean(restoredViewerPage),
    viewerPageId: restoredViewerPage?.id ?? null,
    viewerDocumentId: restoredViewerPage?.documentId ?? null,
  };
}

export function getThumbnailInvalidationPageIds(
  currentState: WorkspaceState,
  targetSnapshot: WorkspaceLogicalSnapshot
): string[] {
  const targetPagesById = new Map(
    targetSnapshot.documents.flatMap((document) =>
      document.pages.map((page) => [page.id, page] as const)
    )
  );

  return currentState.documents
    .flatMap((document) => document.pages)
    .filter((currentPage) => {
      const targetPage = targetPagesById.get(currentPage.id);
      return (
        !targetPage ||
        !canPreservePageRuntime(currentPage, targetPage)
      );
    })
    .map((page) => page.id);
}
