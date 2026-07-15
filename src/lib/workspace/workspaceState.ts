import {
  WorkspaceDocument,
  WorkspacePage,
  WorkspaceSourceDocument,
  WorkspaceSourceDocuments,
  clampInsertionSlot,
} from "../../types/workspace";

export type WorkspaceState = {
  documents: WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  selectedDocumentId: string | null;
  selectedPageId: string | null;
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
  | {
      type: "UPDATE_PAGE_BY_ID";
      payload: { pageId: string; changes: WorkspacePageChanges };
    }
  | { type: "SELECT_DOCUMENT"; payload: { id: string | null } }
  | {
      type: "SELECT_PAGE";
      payload: { pageId: string | null; documentId: string | null };
    }
  | { type: "CLEAR_PAGE_SELECTION" }
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
  selectedPageId: null,
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
    pages[pageIndex] = { ...pages[pageIndex], ...changes };
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

function omitSourceDocument(
  sourceDocuments: WorkspaceSourceDocuments,
  sourceDocumentId: string
): WorkspaceSourceDocuments {
  if (!(sourceDocumentId in sourceDocuments)) return sourceDocuments;
  const next = { ...sourceDocuments };
  delete next[sourceDocumentId];
  return next;
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
                ...state.sourceDocuments[action.payload.id],
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
      const removedDocument = state.documents.find(
        (document) => document.id === action.payload.id
      );
      const remainingDocuments = state.documents.filter(
        (document) => document.id !== action.payload.id
      );
      const selectedPageWasRemoved = Boolean(
        state.selectedPageId &&
          removedDocument?.pages.some((page) => page.id === state.selectedPageId)
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
        selectedPageId: selectedPageWasRemoved ? null : state.selectedPageId,
        viewerOpen: viewerDocumentWasRemoved ? false : state.viewerOpen,
        viewerPageId: viewerDocumentWasRemoved ? null : state.viewerPageId,
        viewerDocumentId: viewerDocumentWasRemoved
          ? null
          : state.viewerDocumentId,
      };
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
        const basePages = sourceContainer.pages.filter((page) => page.id !== pageId);
        const safeSlot = clampInsertionSlot(insertionSlot, basePages.length);
        const nextPages = [
          ...basePages.slice(0, safeSlot),
          activePage,
          ...basePages.slice(safeSlot),
        ];
        const isNoOp = nextPages.every(
          (page, index) => page.id === sourceContainer.pages[index]?.id
        );

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
          state.selectedPageId === pageId
            ? targetContainerId
            : state.selectedDocumentId,
        viewerDocumentId:
          state.viewerPageId === pageId
            ? targetContainerId
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
      return { ...state, selectedDocumentId: action.payload.id };

    case "SELECT_PAGE":
      return {
        ...state,
        selectedPageId: action.payload.pageId,
        selectedDocumentId:
          action.payload.documentId || state.selectedDocumentId,
      };

    case "CLEAR_PAGE_SELECTION":
      return { ...state, selectedPageId: null };

    case "OPEN_PAGE_VIEWER":
      return {
        ...state,
        viewerOpen: true,
        viewerPageId: action.payload.pageId,
        viewerDocumentId: action.payload.documentId,
        selectedPageId: action.payload.pageId,
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
        selectedPageId: action.payload.pageId,
        selectedDocumentId: action.payload.documentId,
      };

    case "CLEAR_WORKSPACE":
      return initialWorkspaceState;

    default:
      return state;
  }
}
