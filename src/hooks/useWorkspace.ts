import { useReducer, useEffect, useCallback, useMemo, useRef, useState } from "react";
import {
  PageDuplicateRequest,
  PageRotationDirection,
  PageSelectionModifiers,
  WorkspacePage,
  ThumbnailStatus,
} from "../types/workspace";
import { pdfDocumentRegistry } from "../lib/pdf/pdfDocumentRegistry";
import { originalSourceBlobRegistry } from "../lib/pdf/originalSourceBlobRegistry";
import { thumbnailResourceCache } from "../lib/pdf/thumbnailResourceCache";
import { thumbnailQueue } from "../lib/pdf/thumbnailQueue";
import { useToast } from "../components/ui/Toast";
import { WorkspaceAction } from "../lib/workspace/workspaceState";
import { getSelectedPagesInWorkspaceOrder } from "../lib/selection/pageSelection";
import { movePagesToContainer } from "../lib/workspace/pageOperations";
import {
  WorkspaceStoreAction,
  getNextRedoEntry,
  getNextUndoEntry,
  estimateWorkspaceHistoryBytes,
  getRetainedSourceDocumentIds,
  initialWorkspaceStoreState,
  workspaceStoreReducer,
} from "../lib/history/workspaceHistory";
import { buildWorkspaceRuntimeIndexes } from "../lib/workspace/workspaceRuntimeIndexes";
import { performanceDiagnostics } from "../lib/performance/performanceDiagnostics";
import {
  WorkspaceLogicalSnapshot,
  WorkspaceSelectionSnapshot,
  getThumbnailInvalidationPageIds,
  reconcileWorkspaceFromSnapshot,
} from "../lib/history/workspaceSnapshots";
import { PersistedSourceFile } from "../lib/persistence/persistenceTypes";
import {
  WorkspaceDocumentNameValidation,
  createEmptyWorkspaceDocument,
  getNextDocumentColor,
  validateWorkspaceDocumentName,
} from "../lib/workspace/documentOperations";

type UseWorkspaceOptions = {
  onSourceFileReady?: (sourceFile: PersistedSourceFile) => void;
  projectId: string;
};

export type WorkspaceImportProgress = {
  phase: "preparing" | "loading" | "previews";
  currentFileName: string | null;
  currentFileNumber: number;
  totalFiles: number;
};

export type WorkspaceImportSummary = {
  addedPdfCount: number;
  addedPageCount: number;
  failedFiles: Array<{ name: string; reason: string }>;
  skippedFileCount: number;
};

export function useWorkspace({
  onSourceFileReady,
  projectId,
}: UseWorkspaceOptions) {
  const [store, rawDispatch] = useReducer(
    workspaceStoreReducer,
    initialWorkspaceStoreState
  );
  const storeRef = useRef(store);
  const state = store.workspace;
  const history = store.history;
  const stateRef = useRef(state);
  const runtimeIndexes = useMemo(
    () => buildWorkspaceRuntimeIndexes(state.documents),
    [state.documents]
  );
  const runtimeIndexesRef = useRef(runtimeIndexes);
  runtimeIndexesRef.current = runtimeIndexes;
  const dispatch = useCallback((action: WorkspaceStoreAction) => {
    const nextStore = workspaceStoreReducer(storeRef.current, action);
    storeRef.current = nextStore;
    stateRef.current = nextStore.workspace;
    rawDispatch(action);
  }, []);
  const activeImportIdsRef = useRef(new Set<string>());
  const pendingThumbnailRevocationsRef = useRef(new Set<string>());
  const pendingSourceCleanupRef = useRef(new Set<string>());
  storeRef.current = store;
  stateRef.current = state;
  const { showToast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] =
    useState<WorkspaceImportProgress | null>(null);
  const [importSummary, setImportSummary] =
    useState<WorkspaceImportSummary | null>(null);
  const importJobActiveRef = useRef(false);

  useEffect(() => {
    performanceDiagnostics.set("undoEntryCount", history.past.length);
    performanceDiagnostics.set("redoEntryCount", history.future.length);
    performanceDiagnostics.set(
      "estimatedHistoryBytes",
      estimateWorkspaceHistoryBytes(history)
    );
  }, [history]);

  // Auto clean registry and urls on unmount
  useEffect(() => {
    const activeImportIds = activeImportIdsRef.current;
    return () => {
      thumbnailQueue.clear();
      thumbnailResourceCache.clear();
      pdfDocumentRegistry.clear();
      originalSourceBlobRegistry.clear();
      activeImportIds.clear();
    };
  }, []);

  // Resource cleanup runs after React has committed the state that removed
  // the corresponding pages, so displayed thumbnails are never revoked early.
  useEffect(() => {
    const retainedSourceIds = getRetainedSourceDocumentIds(state, history);
    const livePagesById = new Map<string, WorkspacePage>(
      state.documents.flatMap((document) =>
        document.pages.map((page) => [page.id, page] as const)
      )
    );

    for (const pageId of pendingThumbnailRevocationsRef.current) {
      const livePage = livePagesById.get(pageId);
      if (livePage?.thumbnailUrl) continue;
      thumbnailResourceCache.releaseOwner(pageId);
      pendingThumbnailRevocationsRef.current.delete(pageId);
    }

    for (const sourceId of pendingSourceCleanupRef.current) {
      if (retainedSourceIds.has(sourceId)) continue;
      pdfDocumentRegistry.unregister(sourceId);
      originalSourceBlobRegistry.unregister(sourceId);
      pendingSourceCleanupRef.current.delete(sourceId);
    }
  }, [history, state]);

  useEffect(() => {
    if (!store.historyError) return;
    if (import.meta.env.DEV) console.error(store.historyError);
    showToast(
      "Unable to restore change",
      "The workspace could not restore this action. Your current pages were left unchanged.",
      "warning"
    );
    dispatch({ type: "CLEAR_HISTORY_ERROR" });
  }, [dispatch, showToast, store.historyError]);

  const commitWorkspaceOperation = useCallback(
    (action: WorkspaceAction, label: string) => {
      dispatch({
        type: "COMMIT_WORKSPACE_OPERATION",
        payload: {
          action,
          id: `history-${crypto.randomUUID()}`,
          label,
          timestamp: Date.now(),
        },
      });
    },
    [dispatch]
  );

  const prepareHistoryRestore = useCallback(
    (
      targetSnapshot: WorkspaceLogicalSnapshot,
      targetSelection: WorkspaceSelectionSnapshot
    ) => {
      const currentState = stateRef.current;
      if (
        !reconcileWorkspaceFromSnapshot(
          currentState,
          targetSnapshot,
          targetSelection
        )
      ) {
        return false;
      }

      const invalidatedPageIds = getThumbnailInvalidationPageIds(
        currentState,
        targetSnapshot
      );
      thumbnailQueue.cancelPages(invalidatedPageIds);
      invalidatedPageIds.forEach((pageId) =>
        pendingThumbnailRevocationsRef.current.add(pageId)
      );
      currentState.documents
        .flatMap((document) => document.pages)
        .forEach((page) =>
          pendingSourceCleanupRef.current.add(page.sourceDocumentId)
        );
      return true;
    },
    []
  );

  const undoWorkspace = useCallback(() => {
    const entry = getNextUndoEntry(storeRef.current.history);
    if (!entry) return false;
    if (!prepareHistoryRestore(entry.before, entry.selectionBefore)) {
      if (import.meta.env.DEV) console.error("Unable to restore a history entry during Undo.");
      showToast(
        "Unable to restore change",
        "The workspace could not restore this action. Your current pages were left unchanged.",
        "warning"
      );
      return false;
    }

    dispatch({ type: "UNDO_WORKSPACE" });
    showToast("Undo", `Undid ${entry.label}.`, "info");
    return true;
  }, [dispatch, prepareHistoryRestore, showToast]);

  const redoWorkspace = useCallback(() => {
    const entry = getNextRedoEntry(storeRef.current.history);
    if (!entry) return false;
    if (!prepareHistoryRestore(entry.after, entry.selectionAfter)) {
      if (import.meta.env.DEV) console.error("Unable to restore a history entry during Redo.");
      showToast(
        "Unable to restore change",
        "The workspace could not restore this action. Your current pages were left unchanged.",
        "warning"
      );
      return false;
    }

    dispatch({ type: "REDO_WORKSPACE" });
    showToast("Redo", `Redid ${entry.label}.`, "info");
    return true;
  }, [dispatch, prepareHistoryRestore, showToast]);

  const selectDocument = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_DOCUMENT", payload: { id } });
  }, [dispatch]);

  const createEmptyDocument = useCallback(() => {
    const documents = stateRef.current.documents;
    const document = createEmptyWorkspaceDocument({
      id: `doc-${crypto.randomUUID()}`,
      color: getNextDocumentColor(documents),
    });
    commitWorkspaceOperation(
      { type: "CREATE_EMPTY_DOCUMENT", payload: { document } },
      "Create document"
    );
    showToast(
      "Document created",
      "An empty document group is ready for pages.",
      "success"
    );
    return document.id;
  }, [commitWorkspaceOperation, showToast]);

  const renameDocument = useCallback(
    (
      id: string,
      value: string
    ): WorkspaceDocumentNameValidation => {
      const validation = validateWorkspaceDocumentName(value);
      if (!validation.valid) return validation;
      const document = stateRef.current.documents.find(
        (candidate) => candidate.id === id
      );
      if (!document || document.name === validation.name) {
        return validation;
      }
      commitWorkspaceOperation(
        {
          type: "RENAME_DOCUMENT",
          payload: { id, name: validation.name },
        },
        "Rename document"
      );
      return validation;
    },
    [commitWorkspaceOperation]
  );

  const reorderDocuments = useCallback(
    (activeDocumentId: string, overDocumentId: string) => {
      const documents = stateRef.current.documents;
      const activeIndex = documents.findIndex(
        (document) => document.id === activeDocumentId
      );
      const overIndex = documents.findIndex(
        (document) => document.id === overDocumentId
      );
      if (
        activeIndex === -1 ||
        overIndex === -1 ||
        activeIndex === overIndex
      ) {
        return false;
      }
      commitWorkspaceOperation(
        {
          type: "REORDER_DOCUMENTS",
          payload: { activeDocumentId, overDocumentId },
        },
        "Reorder documents"
      );
      return true;
    },
    [commitWorkspaceOperation]
  );

  const deleteDocument = useCallback(
    (id: string) => {
      const currentState = stateRef.current;
      const document = currentState.documents.find(
        (candidate) => candidate.id === id
      );
      if (!document || currentState.documents.length <= 1) return false;

      thumbnailQueue.cancelPages(document.pages.map((page) => page.id));
      commitWorkspaceOperation(
        { type: "DELETE_DOCUMENT", payload: { id } },
        "Delete document"
      );
      showToast(
        "Document deleted",
        `"${document.name}" was removed from the workspace. You can undo this action during this session.`,
        "warning"
      );
      return true;
    },
    [commitWorkspaceOperation, showToast]
  );

  const duplicateDocument = useCallback(
    (sourceDocumentId: string) => {
      const document = stateRef.current.documents.find(
        (candidate) => candidate.id === sourceDocumentId
      );
      if (!document || document.status === "loading") return null;
      const newDocumentId = `doc-${crypto.randomUUID()}`;
      const newPageIds = document.pages.map(
        () => `page-${crypto.randomUUID()}`
      );
      commitWorkspaceOperation(
        {
          type: "DUPLICATE_DOCUMENT",
          payload: {
            sourceDocumentId,
            newDocumentId,
            newPageIds,
          },
        },
        "Duplicate document"
      );
      showToast(
        "Document duplicated",
        `A logical copy of "${document.name}" was added after the original.`,
        "success"
      );
      return newDocumentId;
    },
    [commitWorkspaceOperation, showToast]
  );

  const updatePageThumbnail = useCallback((
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string,
    expectedRotation?: WorkspacePage["rotation"]
  ): boolean => {
    const currentPage = runtimeIndexesRef.current.pageById.get(pageId);
    if (
      !currentPage ||
      (expectedRotation !== undefined &&
        currentPage.rotation !== expectedRotation)
    ) {
      return false;
    }

    dispatch({
      type: "UPDATE_PAGE_BY_ID",
      payload: {
        pageId,
        changes: {
          thumbnailStatus: status,
          thumbnailUrl: url,
          errorMessage,
        },
      },
    });
    return true;
  }, [dispatch]);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0 || importJobActiveRef.current) return;

    const fileListArray = Array.from(files);
    importJobActiveRef.current = true;
    setIsImporting(true);
    setImportSummary(null);
    setImportProgress({
      phase: "preparing",
      currentFileName: null,
      currentFileNumber: 0,
      totalFiles: fileListArray.length,
    });
    let addedPdfCount = 0;
    let addedPageCount = 0;
    let skippedFileCount = 0;
    const failedFiles: WorkspaceImportSummary["failedFiles"] = [];
    const knownFiles = new Set(
      stateRef.current.documents.map((document) => `${document.name}\u0000${document.size}`)
    );

    for (let fileIndex = 0; fileIndex < fileListArray.length; fileIndex += 1) {
      const file = fileListArray[fileIndex];
      if (!file) continue;
      setImportProgress({
        phase: "loading",
        currentFileName: file.name,
        currentFileNumber: fileIndex + 1,
        totalFiles: fileListArray.length,
      });
      // 1. Check Extension & MIME Type
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        skippedFileCount += 1;
        failedFiles.push({ name: file.name, reason: "Only PDF files can be added." });
        continue;
      }

      // 2. Check Empty File
      if (file.size === 0) {
        skippedFileCount += 1;
        failedFiles.push({ name: file.name, reason: "The file contains no readable data." });
        continue;
      }

      // 3. Duplicate Detection (Size + Name + lastModified)
      const fileKey = `${file.name}\u0000${file.size}`;
      const isDuplicate = knownFiles.has(fileKey);
      if (isDuplicate) {
        skippedFileCount += 1;
        failedFiles.push({ name: file.name, reason: "This PDF is already in the workspace." });
        continue;
      }
      knownFiles.add(fileKey);

      // Generate a clean color accent based on current workspace index
      const color = getNextDocumentColor(stateRef.current.documents, addedPdfCount);
      const docId = `doc-${crypto.randomUUID()}`;
      activeImportIdsRef.current.add(docId);

      // Insert immediately into pending state
      dispatch({
        type: "ADD_DOCUMENT_PENDING",
        payload: {
          id: docId,
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/pdf",
          color,
          sourceDocument: {
            id: docId,
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/pdf",
            originalPageCount: 0,
            importedAt: Date.now(),
            lastModified: file.lastModified,
          },
        },
      });

      try {
          // Read file as ArrayBuffer
          const buffer = await file.arrayBuffer();

          // Initialize PDF.js loader
          const { pdfjsLib } = await import("../lib/pdf/pdfjs");
          const loadingTask = pdfjsLib.getDocument({
            data: buffer,
            useSystemFonts: true,
          });

          // Wait for proxy
          const pdfDoc = await loadingTask.promise;

          if (!pdfDoc) {
            throw new Error("Unable to create a PDF document proxy.");
          }

          // Register immediately so every successful proxy has one owner and
          // every later failure can use the same idempotent cleanup path.
          pdfDocumentRegistry.register(docId, pdfDoc);
          originalSourceBlobRegistry.register(docId, file);

          if (pdfDoc.numPages === 0) {
            throw new Error("This PDF contains no pages.");
          }

          setImportProgress({
            phase: "previews",
            currentFileName: file.name,
            currentFileNumber: fileIndex + 1,
            totalFiles: fileListArray.length,
          });

          // The editable group may have been removed while PDF.js was loading.
          if (!activeImportIdsRef.current.has(docId)) {
            pdfDocumentRegistry.unregister(docId);
            originalSourceBlobRegistry.unregister(docId);
            return;
          }

          // Build page entities
          const pages: WorkspacePage[] = [];
          for (let i = 0; i < pdfDoc.numPages; i++) {
            pages.push({
              id: `${docId}-p-${i + 1}`,
              documentId: docId,
              sourceDocumentId: docId,
              originalPageIndex: i,
              pageNumber: i + 1,
              rotation: 0,
              thumbnailStatus: "idle",
            });
          }

          onSourceFileReady?.({
            sourceDocumentId: docId,
            projectId,
            blob: file,
            name: file.name,
            type: file.type || "application/pdf",
            size: file.size,
            lastModified: file.lastModified,
            createdAt: Date.now(),
          });
          dispatch({
            type: "ADD_DOCUMENT_SUCCESS",
            payload: {
              id: docId,
              pageCount: pdfDoc.numPages,
              pages,
            },
          });
          activeImportIdsRef.current.delete(docId);
          addedPdfCount += 1;
          addedPageCount += pdfDoc.numPages;
        } catch (err: unknown) {
          if (import.meta.env.DEV) console.error("Unable to process a selected PDF:", err);
          const importStillActive = activeImportIdsRef.current.has(docId);
          activeImportIdsRef.current.delete(docId);
          pdfDocumentRegistry.unregister(docId);
          originalSourceBlobRegistry.unregister(docId);

          if (!importStillActive) return;

          let friendlyError = "Unable to open PDF. The file may be damaged or unsupported.";

          // Check if password exception
          if (
            err instanceof Error &&
            (err.name === "PasswordException" || err.message.toLowerCase().includes("password"))
          ) {
            friendlyError = "Password-protected PDF files cannot be opened.";
          }

          dispatch({
            type: "ADD_DOCUMENT_ERROR",
            payload: {
              id: docId,
              errorMessage: friendlyError,
            },
          });

          failedFiles.push({ name: file.name, reason: friendlyError });
        }
    }

    const summary = {
      addedPdfCount,
      addedPageCount,
      failedFiles,
      skippedFileCount,
    };
    setImportSummary(summary);
    setImportProgress(null);
    setIsImporting(false);
    importJobActiveRef.current = false;

    if (addedPdfCount > 0) {
      showToast(
        `${addedPdfCount} PDF${addedPdfCount === 1 ? "" : "s"} added`,
        `${addedPageCount} page${addedPageCount === 1 ? " is" : "s are"} ready to organize.${
          failedFiles.length ? ` ${failedFiles.length} PDF${failedFiles.length === 1 ? "" : "s"} could not be opened.` : ""
        }`,
        failedFiles.length ? "info" : "success"
      );
    } else if (failedFiles.length > 0) {
      showToast(
        "No PDFs were added",
        "Review the selected files and choose readable PDF documents.",
        "warning"
      );
    }
  }, [dispatch, onSourceFileReady, projectId, showToast]);

  const selectPage = useCallback((
    pageId: string,
    containerId: string,
    modifiers: PageSelectionModifiers = {}
  ) => {
    if (modifiers.range) {
      dispatch({
        type: "SELECT_PAGE_RANGE",
        payload: {
          targetPageId: pageId,
          containerId,
          preserveExisting: Boolean(modifiers.preserveExisting),
        },
      });
      return;
    }

    dispatch(
      modifiers.toggle
        ? { type: "TOGGLE_PAGE_SELECTION", payload: { pageId, containerId } }
        : { type: "SELECT_PAGE_ONLY", payload: { pageId, containerId } }
    );
  }, [dispatch]);

  const clearPageSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, [dispatch]);

  const selectAllInContainer = useCallback((containerId: string) => {
    dispatch({ type: "SELECT_ALL_IN_CONTAINER", payload: { containerId } });
  }, [dispatch]);

  const openPageViewer = useCallback((pageId: string, documentId: string) => {
    dispatch({ type: "OPEN_PAGE_VIEWER", payload: { pageId, documentId } });
  }, [dispatch]);

  const closePageViewer = useCallback(() => {
    dispatch({ type: "CLOSE_PAGE_VIEWER" });
  }, [dispatch]);

  const setViewerPage = useCallback((pageId: string, documentId: string) => {
    dispatch({ type: "SET_VIEWER_PAGE", payload: { pageId, documentId } });
  }, [dispatch]);

  const movePage = useCallback((pageId: string, sourceContainerId: string, targetContainerId: string, insertionSlot: number) => {
    const currentState = stateRef.current;
    const targetDocument = currentState.documents.find(
      (document) => document.id === targetContainerId
    );
    if (!targetDocument) return;

    commitWorkspaceOperation(
      {
        type: "MOVE_PAGE",
        payload: { pageId, sourceContainerId, targetContainerId, insertionSlot },
      },
      sourceContainerId === targetContainerId
        ? "Reorder page"
        : `Move page to ${targetDocument.name}`
    );
  }, [commitWorkspaceOperation]);

  const rotateSelectedPages = useCallback(
    (direction: PageRotationDirection) => {
      const currentState = stateRef.current;
      const selectedPages = getSelectedPagesInWorkspaceOrder(
        currentState.documents,
        currentState.selection.selectedPageIds
      );
      if (selectedPages.length === 0) return 0;

      const pageIds = selectedPages.map((page) => page.id);
      thumbnailQueue.cancelPages(pageIds);
      pageIds.forEach((pageId) =>
        pendingThumbnailRevocationsRef.current.add(pageId)
      );
      commitWorkspaceOperation(
        {
          type: "ROTATE_PAGES",
          payload: { pageIds, direction },
        },
        `Rotate ${pageIds.length} ${
          pageIds.length === 1 ? "page" : "pages"
        } ${direction}`
      );
      showToast(
        direction === "right" ? "Pages rotated right" : "Pages rotated left",
        `${pageIds.length} ${pageIds.length === 1 ? "page" : "pages"} updated.`,
        "success"
      );
      return pageIds.length;
    },
    [commitWorkspaceOperation, showToast]
  );

  const duplicateSelectedPages = useCallback(() => {
    const currentState = stateRef.current;
    const selectedPages = getSelectedPagesInWorkspaceOrder(
      currentState.documents,
      currentState.selection.selectedPageIds
    );
    if (selectedPages.length === 0) return [] as string[];

    const duplicates: PageDuplicateRequest[] = selectedPages.map((page) => ({
      sourcePageId: page.id,
      newPageId: `page-${crypto.randomUUID()}`,
    }));
    commitWorkspaceOperation(
      { type: "DUPLICATE_PAGES", payload: { duplicates } },
      `Duplicate ${duplicates.length} ${
        duplicates.length === 1 ? "page" : "pages"
      }`
    );
    showToast(
      "Pages duplicated",
      `${duplicates.length} ${duplicates.length === 1 ? "page" : "pages"} duplicated.`,
      "success"
    );
    return duplicates.map((duplicate) => duplicate.newPageId);
  }, [commitWorkspaceOperation, showToast]);

  const copySelectedPagesToContainer = useCallback(
    (targetContainerId: string) => {
      const currentState = stateRef.current;
      const targetDocument = currentState.documents.find(
        (document) =>
          document.id === targetContainerId && document.status === "ready"
      );
      if (!targetDocument) return 0;

      const selectedPages = getSelectedPagesInWorkspaceOrder(
        currentState.documents,
        currentState.selection.selectedPageIds
      );
      if (selectedPages.length === 0) return 0;

      const copies: PageDuplicateRequest[] = selectedPages.map((page) => ({
        sourcePageId: page.id,
        newPageId: `page-${crypto.randomUUID()}`,
      }));
      commitWorkspaceOperation(
        {
          type: "COPY_PAGES_TO_CONTAINER",
          payload: { copies, targetContainerId },
        },
        `Copy ${copies.length} ${
          copies.length === 1 ? "page" : "pages"
        } to ${targetDocument.name}`
      );
      showToast(
        "Pages copied",
        `${copies.length} ${copies.length === 1 ? "page" : "pages"} copied to ${targetDocument.name}.`,
        "success"
      );
      return copies.length;
    },
    [commitWorkspaceOperation, showToast]
  );

  const moveSelectedPagesToContainer = useCallback(
    (targetContainerId: string) => {
      const currentState = stateRef.current;
      const targetDocument = currentState.documents.find(
        (document) =>
          document.id === targetContainerId && document.status === "ready"
      );
      if (!targetDocument) return 0;

      const selectedPages = getSelectedPagesInWorkspaceOrder(
        currentState.documents,
        currentState.selection.selectedPageIds
      );
      if (selectedPages.length === 0) return 0;

      const pageIds = selectedPages.map((page) => page.id);
      if (
        movePagesToContainer(
          currentState.documents,
          pageIds,
          targetContainerId
        ) === currentState.documents
      ) {
        return 0;
      }
      commitWorkspaceOperation(
        {
          type: "MOVE_PAGES_TO_CONTAINER",
          payload: { pageIds, targetContainerId },
        },
        `Move ${pageIds.length} ${
          pageIds.length === 1 ? "page" : "pages"
        } to ${targetDocument.name}`
      );
      showToast(
        "Pages moved",
        `${pageIds.length} ${pageIds.length === 1 ? "page" : "pages"} moved to ${targetDocument.name}.`,
        "success"
      );
      return pageIds.length;
    },
    [commitWorkspaceOperation, showToast]
  );

  const deleteSelectedPages = useCallback(() => {
    const currentState = stateRef.current;
    const selectedPages = getSelectedPagesInWorkspaceOrder(
      currentState.documents,
      currentState.selection.selectedPageIds
    );
    if (selectedPages.length === 0) return 0;

    const pageIds = selectedPages.map((page) => page.id);
    const sourceIds = new Set(
      selectedPages.map((page) => page.sourceDocumentId)
    );
    thumbnailQueue.cancelPages(pageIds);
    pageIds.forEach((pageId) =>
      pendingThumbnailRevocationsRef.current.add(pageId)
    );
    sourceIds.forEach((sourceId) =>
      pendingSourceCleanupRef.current.add(sourceId)
    );
    commitWorkspaceOperation(
      { type: "DELETE_PAGES", payload: { pageIds } },
      `Delete ${pageIds.length} ${pageIds.length === 1 ? "page" : "pages"}`
    );
    showToast(
      "Pages deleted",
      `${pageIds.length} ${pageIds.length === 1 ? "page" : "pages"} removed from the workspace.`,
      "warning"
    );
    return pageIds.length;
  }, [commitWorkspaceOperation, showToast]);

  const nextUndoEntry = getNextUndoEntry(history);
  const nextRedoEntry = getNextRedoEntry(history);

  const restorePersistedWorkspace = useCallback(
    (workspace: typeof state) => {
      dispatch({
        type: "RESTORE_PERSISTED_WORKSPACE",
        payload: { workspace },
      });
    },
    [dispatch]
  );

  return {
    workspaceState: state,
    logicalRevision: store.logicalRevision,
    documents: state.documents,
    sourceDocuments: state.sourceDocuments,
    selectedDocumentId: state.selectedDocumentId,
    selection: state.selection,
    viewerOpen: state.viewerOpen,
    viewerPageId: state.viewerPageId,
    viewerDocumentId: state.viewerDocumentId,
    isImporting,
    importProgress,
    importSummary,
    dismissImportSummary: () => setImportSummary(null),
    importFiles,
    createEmptyDocument,
    renameDocument,
    reorderDocuments,
    deleteDocument,
    duplicateDocument,
    selectDocument,
    selectPage,
    selectAllInContainer,
    clearPageSelection,
    openPageViewer,
    closePageViewer,
    setViewerPage,
    updatePageThumbnail,
    movePage,
    rotateSelectedPages,
    duplicateSelectedPages,
    copySelectedPagesToContainer,
    moveSelectedPagesToContainer,
    deleteSelectedPages,
    canUndo: Boolean(nextUndoEntry),
    canRedo: Boolean(nextRedoEntry),
    undoLabel: nextUndoEntry?.label ?? null,
    redoLabel: nextRedoEntry?.label ?? null,
    undoWorkspace,
    redoWorkspace,
    restorePersistedWorkspace,
  };
}
