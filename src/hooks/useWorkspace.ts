import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { WorkspacePage, ThumbnailStatus } from "../types/workspace";
import { pdfjsLib } from "../lib/pdf/pdfjs";
import { pdfDocumentRegistry } from "../lib/pdf/pdfDocumentRegistry";
import { thumbnailUrlManager } from "../lib/pdf/thumbnailUrls";
import { thumbnailQueue } from "../lib/pdf/thumbnailQueue";
import { useToast } from "../components/ui/Toast";
import {
  findPageById,
  initialWorkspaceState,
  isSourceDocumentReferenced,
  workspaceReducer,
} from "../lib/workspace/workspaceState";

// Palette of highly readable, elegant accents for document groups on dark backgrounds
const COLORS = ["#00f5ff", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#3b82f6"];

export function useWorkspace() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const stateRef = useRef(state);
  const activeImportIdsRef = useRef(new Set<string>());
  const pendingThumbnailRevocationsRef = useRef(new Set<string>());
  const pendingSourceCleanupRef = useRef(new Set<string>());
  stateRef.current = state;
  const { showToast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  // Auto clean registry and urls on unmount
  useEffect(() => {
    return () => {
      thumbnailQueue.clear();
      thumbnailUrlManager.clear();
      pdfDocumentRegistry.clear();
      activeImportIdsRef.current.clear();
    };
  }, []);

  // Resource cleanup runs after React has committed the state that removed
  // the corresponding pages, so displayed thumbnails are never revoked early.
  useEffect(() => {
    const livePageIds = new Set(
      state.documents.flatMap((document) =>
        document.pages.map((page) => page.id)
      )
    );

    for (const pageId of pendingThumbnailRevocationsRef.current) {
      if (livePageIds.has(pageId)) continue;
      thumbnailUrlManager.revoke(pageId);
      pendingThumbnailRevocationsRef.current.delete(pageId);
    }

    for (const sourceId of pendingSourceCleanupRef.current) {
      if (!isSourceDocumentReferenced(state.documents, sourceId)) {
        pdfDocumentRegistry.unregister(sourceId);
      }
      pendingSourceCleanupRef.current.delete(sourceId);
    }
  }, [state.documents]);

  const selectDocument = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_DOCUMENT", payload: { id } });
  }, []);

  const removeDocument = useCallback((id: string) => {
    const doc = state.documents.find((d) => d.id === id);
    if (!doc) return;

    const pageIds = doc.pages.map((page) => page.id);
    const candidateSourceIds = new Set([
      id,
      ...doc.pages.map((page) => page.sourceDocumentId),
    ]);
    activeImportIdsRef.current.delete(id);

    // Cancel queued and active work before revoking URLs or removing state.
    thumbnailQueue.cancelPages(pageIds);
    pageIds.forEach((pageId) =>
      pendingThumbnailRevocationsRef.current.add(pageId)
    );
    candidateSourceIds.forEach((sourceId) =>
      pendingSourceCleanupRef.current.add(sourceId)
    );

    dispatch({ type: "REMOVE_DOCUMENT", payload: { id } });

    showToast("PDF removed", `Removed "${doc.name}" from your workspace.`, "info");
  }, [state.documents, showToast]);

  const updatePageThumbnail = useCallback((
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string
  ): boolean => {
    if (!findPageById(stateRef.current.documents, pageId)) {
      return false;
    }

    dispatch({
      type: "UPDATE_PAGE_BY_ID",
      payload: {
        pageId,
        changes: {
          thumbnailStatus: status,
          ...(url !== undefined ? { thumbnailUrl: url } : {}),
          errorMessage,
        },
      },
    });
    return true;
  }, []);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsImporting(true);
    let addedCount = 0;
    let skippedUnsupported = 0;
    let skippedDuplicate = 0;

    const fileListArray = Array.from(files);

    for (const file of fileListArray) {
      // 1. Check Extension & MIME Type
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        skippedUnsupported++;
        showToast(
          "Unsupported file",
          `"${file.name}" is not a PDF file. Only PDF files can be added to this workspace.`,
          "error"
        );
        continue;
      }

      // 2. Check Empty File
      if (file.size === 0) {
        showToast(
          "Empty file",
          `"${file.name}" contains no readable data (0 bytes).`,
          "error"
        );
        continue;
      }

      // 3. Duplicate Detection (Size + Name + lastModified)
      const isDuplicate = state.documents.some(
        (doc) => doc.name === file.name && doc.size === file.size
      );
      if (isDuplicate) {
        skippedDuplicate++;
        showToast(
          "PDF already added",
          `"${file.name}" is already in the current workspace.`,
          "info"
        );
        continue;
      }

      // Generate a clean color accent based on current workspace index
      const colorIndex = state.documents.length + addedCount;
      const color = COLORS[colorIndex % COLORS.length];
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
          },
        },
      });

      addedCount++;

      // Asynchronous load block to keep UI highly responsive
      (async () => {
        try {
          // Read file as ArrayBuffer
          const buffer = await file.arrayBuffer();

          // Initialize PDF.js loader
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

          if (pdfDoc.numPages === 0) {
            throw new Error("This PDF contains no pages.");
          }

          // The editable group may have been removed while PDF.js was loading.
          if (!activeImportIdsRef.current.has(docId)) {
            pdfDocumentRegistry.unregister(docId);
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

          dispatch({
            type: "ADD_DOCUMENT_SUCCESS",
            payload: {
              id: docId,
              pageCount: pdfDoc.numPages,
              pages,
            },
          });
          activeImportIdsRef.current.delete(docId);
        } catch (err: any) {
          console.error(`Error processing PDF "${file.name}":`, err);
          const importStillActive = activeImportIdsRef.current.has(docId);
          activeImportIdsRef.current.delete(docId);
          pdfDocumentRegistry.unregister(docId);

          if (!importStillActive) return;

          let friendlyError = "Unable to open PDF. The file may be damaged or unsupported.";
          let toastTitle = "Unable to open PDF";
          let toastDesc = `"${file.name}" may be damaged, incomplete, or unsupported.`;

          // Check if password exception
          if (err && (err.name === "PasswordException" || err.message?.includes("password"))) {
            friendlyError = "Password-protected PDF files are not supported yet.";
            toastTitle = "Password-protected PDF";
            toastDesc = `"${file.name}" is encrypted. Password support will be added in a later phase.`;
          }

          dispatch({
            type: "ADD_DOCUMENT_ERROR",
            payload: {
              id: docId,
              errorMessage: friendlyError,
            },
          });

          showToast(toastTitle, toastDesc, "error");
        }
      })();
    }

    setIsImporting(false);

    // Provide a neat aggregate summary for batch imports
    if (addedCount > 0 && fileListArray.length > 1) {
      showToast(
        "PDF import complete",
        `${addedCount} PDF${addedCount > 1 ? "s" : ""} added to workspace.${
          skippedUnsupported > 0 ? ` ${skippedUnsupported} unsupported files skipped.` : ""
        }`,
        "sparkles"
      );
    }
  }, [state.documents, showToast]);

  const selectPage = useCallback((pageId: string | null, documentId: string | null) => {
    dispatch({ type: "SELECT_PAGE", payload: { pageId, documentId } });
  }, []);

  const clearPageSelection = useCallback(() => {
    dispatch({ type: "CLEAR_PAGE_SELECTION" });
  }, []);

  const openPageViewer = useCallback((pageId: string, documentId: string) => {
    dispatch({ type: "OPEN_PAGE_VIEWER", payload: { pageId, documentId } });
  }, []);

  const closePageViewer = useCallback(() => {
    dispatch({ type: "CLOSE_PAGE_VIEWER" });
  }, []);

  const setViewerPage = useCallback((pageId: string, documentId: string) => {
    dispatch({ type: "SET_VIEWER_PAGE", payload: { pageId, documentId } });
  }, []);

  const movePage = useCallback((pageId: string, sourceContainerId: string, targetContainerId: string, insertionSlot: number) => {
    dispatch({
      type: "MOVE_PAGE",
      payload: { pageId, sourceContainerId, targetContainerId, insertionSlot },
    });
  }, []);

  return {
    documents: state.documents,
    sourceDocuments: state.sourceDocuments,
    selectedDocumentId: state.selectedDocumentId,
    selectedPageId: state.selectedPageId,
    viewerOpen: state.viewerOpen,
    viewerPageId: state.viewerPageId,
    viewerDocumentId: state.viewerDocumentId,
    isImporting,
    importFiles,
    removeDocument,
    selectDocument,
    selectPage,
    clearPageSelection,
    openPageViewer,
    closePageViewer,
    setViewerPage,
    updatePageThumbnail,
    movePage,
  };
}
