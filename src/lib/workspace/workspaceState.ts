import {
  WorkspaceDocument,
  PageDuplicateRequest,
  PageRotationDirection,
  WorkspacePage,
  WorkspaceSourceDocument,
  WorkspaceSourceDocuments,
  WorkspaceSelectionState,
  clampInsertionSlot,
} from "../../types/workspace";
import {
  clearSelection,
  emptyWorkspaceSelection,
  pruneSelection,
  selectAllInContainer,
  selectPageOnly,
  selectPageRange,
  toggleSelectedPage,
} from "../selection/pageSelection";
import {
  copyPagesToContainer,
  deletePages,
  duplicatePages,
  movePagesToContainer,
  rotatePages,
} from "./pageOperations";
import {
  deleteWorkspaceDocument,
  duplicateWorkspaceDocument,
  renameWorkspaceDocument,
  reorderWorkspaceDocuments,
} from "./documentOperations";

export type WorkspaceState = {
  documents: WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  selectedDocumentId: string | null;
  selection: WorkspaceSelectionState;
  viewerOpen: boolean;
  viewerPageId: string | null;
  viewerDocumentId: string | null;
};

export type WorkspacePageChanges = Partial<
  Pick<WorkspacePage, "thumbnailStatus" | "thumbnailUrl" | "errorMessage">
>;

export type WorkspaceAction =
  | {
      type: "ADD_DOCUMENT_PENDING";
      payload: {
        id: string;
        name: string;
        size: number;
        mimeType: string;
        color: string;
        sourceDocument: WorkspaceSourceDocument;
      };
    }
  | {
      type: "ADD_DOCUMENT_SUCCESS";
      payload: { id: string; pageCount: number; pages: WorkspacePage[] };
    }
  | { type: "ADD_DOCUMENT_ERROR"; payload: { id: string; errorMessage: string } }
  | { type: "REMOVE_DOCUMENT"; payload: { id: string } }
  | { type: "DELETE_DOCUMENT"; payload: { id: string } }
  | {
      type: "DUPLICATE_DOCUMENT";
      payload: {
        sourceDocumentId: string;
        newDocumentId: string;
        newPageIds: string[];
      };
    }
  | {
      type: "CREATE_EMPTY_DOCUMENT";
      payload: { document: WorkspaceDocument };
    }
  | {
      type: "RENAME_DOCUMENT";
      payload: { id: string; name: string };
    }
  | {
      type: "REORDER_DOCUMENTS";
      payload: { activeDocumentId: string; overDocumentId: string };
    }
  | {
      type: "UPDATE_PAGE_BY_ID";
      payload: { pageId: string; changes: WorkspacePageChanges };
    }
  | { type: "SELECT_DOCUMENT"; payload: { id: string | null } }
  | { type: "SELECT_PAGE_ONLY"; payload: { pageId: string; containerId: string } }
  | { type: "TOGGLE_PAGE_SELECTION"; payload: { pageId: string; containerId: string } }
  | {
      type: "SELECT_PAGE_RANGE";
      payload: {
        targetPageId: string;
        containerId: string;
        preserveExisting: boolean;
      };
    }
  | { type: "SELECT_ALL_IN_CONTAINER"; payload: { containerId: string } }
  | { type: "CLEAR_SELECTION" }
  | {
      type: "ROTATE_PAGES";
      payload: { pageIds: string[]; direction: PageRotationDirection };
    }
  | {
      type: "DUPLICATE_PAGES";
      payload: { duplicates: PageDuplicateRequest[] };
    }
  | {
      type: "DELETE_PAGES";
      payload: { pageIds: string[] };
    }
  | {
      type: "MOVE_PAGES_TO_CONTAINER";
      payload: { pageIds: string[]; targetContainerId: string };
    }
  | {
      type: "COPY_PAGES_TO_CONTAINER";
      payload: {
        copies: PageDuplicateRequest[];
        targetContainerId: string;
      };
    }
  | { type: "OPEN_PAGE_VIEWER"; payload: { pageId: string; documentId: string } }
  | { type: "CLOSE_PAGE_VIEWER" }
  | { type: "SET_VIEWER_PAGE"; payload: { pageId: string; documentId: string } }
  | { type: "CLEAR_WORKSPACE" }
  | {
      type: "MOVE_PAGE";
      payload: {
        pageId: string;
        sourceContainerId: string;
        targetContainerId: string;
        insertionSlot: number;
      };
    };

export const initialWorkspaceState: WorkspaceState = {
  documents: [],
  sourceDocuments: {},
  selectedDocumentId: null,
  selection: emptyWorkspaceSelection,
  viewerOpen: false,
  viewerPageId: null,
  viewerDocumentId: null,
};

export function findPageById(
  documents: WorkspaceDocument[],
  pageId: string
): WorkspacePage | undefined {
  for (const document of documents) {
    const page = document.pages.find((candidate) => candidate.id === pageId);
    if (page) return page;
  }
  return undefined;
}

export function updatePageById(
  documents: WorkspaceDocument[],
  pageId: string,
  changes: WorkspacePageChanges
): WorkspaceDocument[] {
  let updated = false;

  const nextDocuments = documents.map((document) => {
    const pageIndex = document.pages.findIndex((page) => page.id === pageId);
    if (pageIndex === -1) return document;

    updated = true;
    const pages = [...document.pages];
    pages[pageIndex] = { ...pages[pageIndex]!, ...changes };
    return { ...document, pages };
  });

  return updated ? nextDocuments : documents;
}

export function getReferencedSourceDocumentIds(
  documents: WorkspaceDocument[]
): Set<string> {
  const sourceIds = new Set<string>();
  for (const document of documents) {
    for (const page of document.pages) {
      sourceIds.add(page.sourceDocumentId);
    }
  }
  return sourceIds;
}

export function isSourceDocumentReferenced(
  documents: WorkspaceDocument[],
  sourceDocumentId: string
): boolean {
  return documents.some((document) =>
    document.pages.some((page) => page.sourceDocumentId === sourceDocumentId)
  );
}

export function pruneSourceDocuments(
  sourceDocuments: WorkspaceSourceDocuments,
  documents: WorkspaceDocument[]
): WorkspaceSourceDocuments {
  const referencedIds = getReferencedSourceDocumentIds(documents);
  const editableDocumentIds = new Set(documents.map((document) => document.id));
  const nextEntries = Object.entries(sourceDocuments).filter(
    ([sourceId]) => referencedIds.has(sourceId) || editableDocumentIds.has(sourceId)
  );

  if (nextEntries.length === Object.keys(sourceDocuments).length) {
    return sourceDocuments;
  }

  return Object.fromEntries(nextEntries);
}

export function insertPageAtSlot(
  pages: WorkspacePage[],
  activePageId: string,
  insertionSlot: number
): WorkspacePage[] {
  const activePage = pages.find((page) => page.id === activePageId);
  if (!activePage) return pages;

  const basePages = pages.filter((page) => page.id !== activePageId);
  const safeSlot = clampInsertionSlot(insertionSlot, basePages.length);
  return [
    ...basePages.slice(0, safeSlot),
    activePage,
    ...basePages.slice(safeSlot),
  ];
}

export function haveSamePageOrder(
  current: WorkspacePage[],
  proposed: WorkspacePage[]
): boolean {
  return (
    current.length === proposed.length &&
    current.every((page, index) => page.id === proposed[index]?.id)
  );
}

function omitSourceDocument(
  sourceDocuments: WorkspaceSourceDocuments,
  sourceDocumentId: string
): WorkspaceSourceDocuments {
  if (!(sourceDocumentId in sourceDocuments)) return sourceDocuments;
  const next = { ...sourceDocuments };
  delete next[sourceDocumentId];
  return next;
}

function createOperationSelection(
  documents: WorkspaceDocument[],
  pageIds: string[],
  preferredContainerId?: string
): WorkspaceSelectionState {
  const validPagesById = new Map(
    documents.flatMap((document) =>
      document.pages.map((page) => [page.id, page] as const)
    )
  );
  const selectedPageIds = [...new Set(pageIds)].filter((pageId) =>
    validPagesById.has(pageId)
  );
  const activePageId = selectedPageIds[selectedPageIds.length - 1] ?? null;
  const activePage = activePageId
    ? validPagesById.get(activePageId) ?? null
    : null;

  return {
    selectedPageIds,
    anchorPageId: selectedPageIds[0] ?? null,
    activePageId,
    activeContainerId:
      preferredContainerId ?? activePage?.documentId ?? null,
  };
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "ADD_DOCUMENT_PENDING": {
      const newDocument: WorkspaceDocument = {
        id: action.payload.id,
        name: action.payload.name,
        size: action.payload.size,
        mimeType: action.payload.mimeType,
        pageCount: 0,
        color: action.payload.color,
        status: "loading",
        pages: [],
      };

      return {
        ...state,
        documents: [...state.documents, newDocument],
        sourceDocuments: {
          ...state.sourceDocuments,
          [action.payload.sourceDocument.id]: action.payload.sourceDocument,
        },
        selectedDocumentId: state.selectedDocumentId || action.payload.id,
      };
    }

    case "ADD_DOCUMENT_SUCCESS":
      return {
        ...state,
        documents: state.documents.map((document) =>
          document.id === action.payload.id
            ? {
                ...document,
                status: "ready",
                pageCount: action.payload.pageCount,
                pages: action.payload.pages,
              }
            : document
        ),
        sourceDocuments: state.sourceDocuments[action.payload.id]
          ? {
              ...state.sourceDocuments,
              [action.payload.id]: {
                ...state.sourceDocuments[action.payload.id]!,
                originalPageCount: action.payload.pageCount,
              },
            }
          : state.sourceDocuments,
      };

    case "ADD_DOCUMENT_ERROR":
      return {
        ...state,
        documents: state.documents.map((document) =>
          document.id === action.payload.id
            ? {
                ...document,
                status: "error",
                errorMessage: action.payload.errorMessage,
              }
            : document
        ),
        sourceDocuments: omitSourceDocument(
          state.sourceDocuments,
          action.payload.id
        ),
      };

    case "REMOVE_DOCUMENT": {
      const remainingDocuments = state.documents.filter(
        (document) => document.id !== action.payload.id
      );
      const viewerDocumentWasRemoved = state.viewerDocumentId === action.payload.id;

      return {
        ...state,
        documents: remainingDocuments,
        sourceDocuments: pruneSourceDocuments(
          state.sourceDocuments,
          remainingDocuments
        ),
        selectedDocumentId:
          state.selectedDocumentId === action.payload.id
            ? remainingDocuments[0]?.id ?? null
            : state.selectedDocumentId,
        selection: pruneSelection(state.selection, remainingDocuments),
        viewerOpen: viewerDocumentWasRemoved ? false : state.viewerOpen,
        viewerPageId: viewerDocumentWasRemoved ? null : state.viewerPageId,
        viewerDocumentId: viewerDocumentWasRemoved
          ? null
          : state.viewerDocumentId,
      };
    }

    case "DELETE_DOCUMENT": {
      const result = deleteWorkspaceDocument(
        state.documents,
        action.payload.id,
        state.selectedDocumentId
      );
      if (!result) return state;
      const selection = pruneSelection(
        state.selection,
        result.documents
      );
      const viewerDocumentWasDeleted =
        state.viewerDocumentId === action.payload.id;

      return {
        ...state,
        documents: result.documents,
        sourceDocuments: state.sourceDocuments,
        selectedDocumentId: result.nextActiveDocumentId,
        selection:
          selection.activeContainerId === null
            ? {
                ...selection,
                activeContainerId: result.nextActiveDocumentId,
              }
            : selection,
        viewerOpen: viewerDocumentWasDeleted ? false : state.viewerOpen,
        viewerPageId: viewerDocumentWasDeleted ? null : state.viewerPageId,
        viewerDocumentId: viewerDocumentWasDeleted
          ? null
          : state.viewerDocumentId,
      };
    }

    case "DUPLICATE_DOCUMENT": {
      const documents = duplicateWorkspaceDocument({
        documents: state.documents,
        sourceDocumentId: action.payload.sourceDocumentId,
        newDocumentId: action.payload.newDocumentId,
        newPageIds: action.payload.newPageIds,
      });
      if (documents === state.documents) return state;
      return {
        ...state,
        documents,
        selectedDocumentId: action.payload.newDocumentId,
      };
    }

    case "CREATE_EMPTY_DOCUMENT": {
      if (
        state.documents.some(
          (document) => document.id === action.payload.document.id
        )
      ) {
        return state;
      }
      const document = action.payload.document;
      return {
        ...state,
        documents: [...state.documents, document],
        selectedDocumentId: document.id,
        selection: {
          selectedPageIds: [],
          anchorPageId: null,
          activePageId: null,
          activeContainerId: document.id,
        },
      };
    }

    case "RENAME_DOCUMENT": {
      const documents = renameWorkspaceDocument(
        state.documents,
        action.payload.id,
        action.payload.name
      );
      return documents === state.documents ? state : { ...state, documents };
    }

    case "REORDER_DOCUMENTS": {
      const documents = reorderWorkspaceDocuments(
        state.documents,
        action.payload.activeDocumentId,
        action.payload.overDocumentId
      );
      return documents === state.documents ? state : { ...state, documents };
    }

    case "MOVE_PAGE": {
      const {
        pageId,
        sourceContainerId,
        targetContainerId,
        insertionSlot,
      } = action.payload;
      const sourceContainer = state.documents.find(
        (document) => document.id === sourceContainerId
      );
      const activePage = sourceContainer?.pages.find((page) => page.id === pageId);

      if (!sourceContainer || !activePage) return state;

      let documents = state.documents;

      if (sourceContainerId === targetContainerId) {
        const nextPages = insertPageAtSlot(
          sourceContainer.pages,
          pageId,
          insertionSlot
        );
        const isNoOp = haveSamePageOrder(sourceContainer.pages, nextPages);

        if (isNoOp) return state;

        documents = state.documents.map((document) =>
          document.id === sourceContainerId
            ? {
                ...document,
                pages: nextPages.map((page, index) => ({
                  ...page,
                  pageNumber: index + 1,
                })),
                pageCount: nextPages.length,
              }
            : document
        );
      } else {
        const targetContainer = state.documents.find(
          (document) => document.id === targetContainerId
        );
        if (!targetContainer) return state;

        documents = state.documents.map((document) => {
          if (document.id === sourceContainerId) {
            const pages = document.pages
              .filter((page) => page.id !== pageId)
              .map((page, index) => ({ ...page, pageNumber: index + 1 }));
            return { ...document, pages, pageCount: pages.length };
          }

          if (document.id === targetContainerId) {
            const safeSlot = clampInsertionSlot(insertionSlot, document.pages.length);
            const movedPage = { ...activePage, documentId: targetContainerId };
            const nextPages = [
              ...document.pages.slice(0, safeSlot),
              movedPage,
              ...document.pages.slice(safeSlot),
            ].map((page, index) => ({ ...page, pageNumber: index + 1 }));
            return { ...document, pages: nextPages, pageCount: nextPages.length };
          }

          return document;
        });
      }

      return {
        ...state,
        documents,
        selectedDocumentId:
          state.selection.activePageId === pageId
            ? targetContainerId
            : state.selectedDocumentId,
        selection:
          state.selection.activePageId === pageId
            ? { ...state.selection, activeContainerId: targetContainerId }
            : state.selection,
        viewerDocumentId:
          state.viewerPageId === pageId
            ? targetContainerId
            : state.viewerDocumentId,
      };
    }

    case "ROTATE_PAGES": {
      const documents = rotatePages(
        state.documents,
        action.payload.pageIds,
        action.payload.direction
      );
      return documents === state.documents ? state : { ...state, documents };
    }

    case "DUPLICATE_PAGES": {
      const documents = duplicatePages(
        state.documents,
        action.payload.duplicates
      );
      if (documents === state.documents) return state;

      const duplicateIds = action.payload.duplicates.map(
        (duplicate) => duplicate.newPageId
      );
      const selection = createOperationSelection(documents, duplicateIds);

      return {
        ...state,
        documents,
        selection,
        selectedDocumentId:
          selection.activeContainerId ?? state.selectedDocumentId,
      };
    }

    case "COPY_PAGES_TO_CONTAINER": {
      const documents = copyPagesToContainer(
        state.documents,
        action.payload.targetContainerId,
        action.payload.copies
      );
      if (documents === state.documents) return state;

      const copiedPageIds = action.payload.copies.map(
        (copy) => copy.newPageId
      );

      return {
        ...state,
        documents,
        selection: createOperationSelection(
          documents,
          copiedPageIds,
          action.payload.targetContainerId
        ),
        selectedDocumentId: action.payload.targetContainerId,
      };
    }

    case "MOVE_PAGES_TO_CONTAINER": {
      const documents = movePagesToContainer(
        state.documents,
        action.payload.pageIds,
        action.payload.targetContainerId
      );
      if (documents === state.documents) return state;

      const movedPageIdSet = new Set(action.payload.pageIds);
      return {
        ...state,
        documents,
        selection: createOperationSelection(
          documents,
          action.payload.pageIds,
          action.payload.targetContainerId
        ),
        selectedDocumentId: action.payload.targetContainerId,
        viewerDocumentId:
          state.viewerPageId && movedPageIdSet.has(state.viewerPageId)
            ? action.payload.targetContainerId
            : state.viewerDocumentId,
      };
    }

    case "DELETE_PAGES": {
      const deletedPageIdSet = new Set(action.payload.pageIds);
      const documents = deletePages(state.documents, action.payload.pageIds);
      if (documents === state.documents) return state;

      const viewerPageWasDeleted =
        state.viewerPageId !== null &&
        deletedPageIdSet.has(state.viewerPageId);

      return {
        ...state,
        documents,
        sourceDocuments: pruneSourceDocuments(
          state.sourceDocuments,
          documents
        ),
        selection: pruneSelection(state.selection, documents),
        viewerOpen: viewerPageWasDeleted ? false : state.viewerOpen,
        viewerPageId: viewerPageWasDeleted ? null : state.viewerPageId,
        viewerDocumentId: viewerPageWasDeleted
          ? null
          : state.viewerDocumentId,
      };
    }

    case "UPDATE_PAGE_BY_ID": {
      const documents = updatePageById(
        state.documents,
        action.payload.pageId,
        action.payload.changes
      );
      return documents === state.documents ? state : { ...state, documents };
    }

    case "SELECT_DOCUMENT":
      return {
        ...state,
        selectedDocumentId: action.payload.id,
        selection: {
          ...state.selection,
          activeContainerId: action.payload.id,
        },
      };

    case "SELECT_PAGE_ONLY":
      return {
        ...state,
        selection: selectPageOnly(
          state.selection,
          action.payload.pageId,
          action.payload.containerId
        ),
        selectedDocumentId: action.payload.containerId,
      };

    case "TOGGLE_PAGE_SELECTION":
      return {
        ...state,
        selection: toggleSelectedPage(
          state.selection,
          action.payload.pageId,
          action.payload.containerId
        ),
        selectedDocumentId: action.payload.containerId,
      };

    case "SELECT_PAGE_RANGE":
      return {
        ...state,
        selection: selectPageRange(
          state.selection,
          state.documents,
          action.payload.targetPageId,
          action.payload.containerId,
          action.payload.preserveExisting
        ),
        selectedDocumentId: action.payload.containerId,
      };

    case "SELECT_ALL_IN_CONTAINER":
      return {
        ...state,
        selection: selectAllInContainer(
          state.selection,
          state.documents,
          action.payload.containerId
        ),
        selectedDocumentId: action.payload.containerId,
      };

    case "CLEAR_SELECTION":
      return { ...state, selection: clearSelection(state.selection) };

    case "OPEN_PAGE_VIEWER":
      return {
        ...state,
        viewerOpen: true,
        viewerPageId: action.payload.pageId,
        viewerDocumentId: action.payload.documentId,
        selection: selectPageOnly(
          state.selection,
          action.payload.pageId,
          action.payload.documentId
        ),
        selectedDocumentId: action.payload.documentId,
      };

    case "CLOSE_PAGE_VIEWER":
      return {
        ...state,
        viewerOpen: false,
        viewerPageId: null,
        viewerDocumentId: null,
      };

    case "SET_VIEWER_PAGE":
      return {
        ...state,
        viewerPageId: action.payload.pageId,
        viewerDocumentId: action.payload.documentId,
        selection: selectPageOnly(
          state.selection,
          action.payload.pageId,
          action.payload.documentId
        ),
        selectedDocumentId: action.payload.documentId,
      };

    case "CLEAR_WORKSPACE":
      return initialWorkspaceState;

    default:
      return state;
  }
}
