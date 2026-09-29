import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceTopbar } from "./WorkspaceTopbar";
import { DocumentsSidebar } from "./DocumentsSidebar";
import { WorkspaceCanvas } from "./WorkspaceCanvas";
import { WorkspaceInspector } from "./WorkspaceInspector";
import { WorkspaceDrawer } from "./WorkspaceDrawer";
import { useWorkspace } from "../../hooks/useWorkspace";
import { PageViewerDialog } from "./viewer/PageViewerDialog";
import { SelectionActionToolbar } from "./SelectionActionToolbar";
import { PageDragPreview } from "./PageDragPreview";
import { DocumentPickerDialog } from "./DocumentPickerDialog";
import { DeletePagesDialog } from "./DeletePagesDialog";
import { DeleteDocumentDialog } from "./DeleteDocumentDialog";
import { PageOperationActionHandlers } from "./PageOperationActions";
import { useProjectPersistence } from "../../hooks/useProjectPersistence";
import { ProjectOpeningState } from "./ProjectOpeningState";
import { PersistedSourceFile } from "../../lib/persistence/persistenceTypes";
import { estimateStoragePressure } from "../../lib/persistence/storageDiagnostics";
import { useNavigate } from "react-router-dom";
import { LeaveWorkspaceDialog } from "./LeaveWorkspaceDialog";
import type { WorkspaceSearchMode } from "../workspace-search/WorkspaceSearchDialog";
import { useWorkspaceNavigation } from "../../hooks/useWorkspaceNavigation";
import {
  WorkspaceSearchDocumentItem,
  WorkspaceSearchPageItem,
  buildWorkspaceSearchIndex,
} from "../../lib/workspace-search/workspaceSearch";
import {
  RecentWorkspaceNavigationItem,
  addRecentWorkspaceNavigation,
} from "../../lib/workspace-search/recentWorkspaceNavigation";
import { shouldOpenPdfTextSearch, shouldOpenWorkspaceSearch } from "../../lib/workspace-search/workspaceSearchShortcut";
import { PdfTextSearchResult, PdfTextViewerContext } from "../../lib/pdf-text/pdfTextTypes";
import { HelpDialog, HelpSection } from "../onboarding/HelpDialog";
import { OnboardingHint } from "../onboarding/OnboardingHint";
import { useOnboardingState } from "../../hooks/useOnboardingState";

const ExportDialog = lazy(() => import("../export/ExportDialog"));
const WorkspaceSearchDialog = lazy(() =>
  import("../workspace-search/WorkspaceSearchDialog").then((module) => ({
    default: module.WorkspaceSearchDialog,
  }))
);

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
  DragOverEvent,
  DragEndEvent,
  Active,
  Over,
  pointerWithin,
  closestCenter,
  CollisionDetection,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Move } from "lucide-react";
import {
  ProjectedPageDrop,
  PageSelectionModifiers,
  WorkspaceDocumentDragData,
  WorkspaceDocument,
  WorkspacePage,
  WorkspacePageDragData,
  getTargetBasePages,
} from "../../types/workspace";
import {
  getDropTargetData,
  isSameProjectedDrop,
  PageDropTargetData,
  resolveActivePageDragData,
} from "../../lib/workspace/dndProjection";
import { getSelectedPagesInWorkspaceOrder } from "../../lib/selection/pageSelection";


type PointerPosition = {
  x: number;
  y: number;
};

function getActivatorCoordinates(event: Event): PointerPosition | null {
  if (event instanceof MouseEvent || event instanceof PointerEvent) {
    return { x: event.clientX, y: event.clientY };
  }

  if (event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  return null;
}

type WorkspaceShellProps = {
  projectId: string;
  isNewProject: boolean;
};

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  projectId,
  isNewProject,
}) => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("Untitled Workspace");
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportDocumentId, setExportDocumentId] = useState<string | null>(null);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchDialogLoaded, setSearchDialogLoaded] = useState(false);
  const [searchRequestedMode, setSearchRequestedMode] = useState<WorkspaceSearchMode>("quick");
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpSection, setHelpSection] = useState<HelpSection>("guide");
  const { onboardingState, updateOnboarding, replayOnboarding } =
    useOnboardingState();
  const [textViewerContext, setTextViewerContext] = useState<PdfTextViewerContext | null>(null);
  const [recentNavigation, setRecentNavigation] = useState<
    RecentWorkspaceNavigationItem[]
  >([]);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchViewerReturnRef = useRef<{
    documentId: string;
    pageId: string;
  } | null>(null);
  useEffect(() => {
    setRecentNavigation([]);
    setSearchDialogOpen(false);
    setSearchRequestedMode("quick");
    setTextViewerContext(null);
  }, [projectId]);
  // 1. Viewport State Tracking
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;
  const isLargeDesktop = windowWidth >= 1280;

  // 2. Workspace Core State Orchestration
  const sourceFileRegistrationRef = useRef<
    (sourceFile: PersistedSourceFile) => void
  >(() => {});
  const handleSourceFileReady = useCallback(
    (sourceFile: PersistedSourceFile) => {
      sourceFileRegistrationRef.current(sourceFile);
    },
    []
  );
  const {
    workspaceState,
    logicalRevision,
    documents,
    sourceDocuments,
    selectedDocumentId,
    selection,
    viewerOpen,
    viewerPageId,
    viewerDocumentId,
    isImporting,
    importProgress,
    importSummary,
    dismissImportSummary,
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
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    undoWorkspace,
    redoWorkspace,
    restorePersistedWorkspace,
  } = useWorkspace({
    onSourceFileReady: handleSourceFileReady,
    projectId,
  });
  const searchIndexState = useMemo(() => {
    try {
      return {
        index: buildWorkspaceSearchIndex(documents, sourceDocuments),
        error: false,
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Workspace search] Index construction failed", {
          error,
        });
      }
      return {
        index: buildWorkspaceSearchIndex([], {}),
        error: true,
      };
    }
  }, [documents, sourceDocuments]);
  const searchShortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘K" : "Ctrl K";
  }, []);
  const textSearchShortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl F";
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘F" : "Ctrl F";
  }, []);
  const {
    registerDocumentElement,
    registerPageElement,
    requestDocumentNavigation,
    requestPageNavigation,
    highlightedDocumentId,
    highlightedPageId,
  } = useWorkspaceNavigation({
    onSelectDocument: selectDocument,
    onSelectPage: (pageId, documentId) => selectPage(pageId, documentId),
    onOpenPageViewer: openPageViewer,
  });
  const persistence = useProjectPersistence({
    projectId,
    projectName,
    isNewProject,
    workspace: workspaceState,
    logicalRevision,
    restoreWorkspace: restorePersistedWorkspace,
    onProjectNameRestored: setProjectName,
  });
  sourceFileRegistrationRef.current = persistence.registerSourceFile;
  const [renameTarget, setRenameTarget] = useState<{
    documentId: string;
    surface: "sidebar" | "canvas";
  } | null>(null);
  const [documentReorderAnnouncement, setDocumentReorderAnnouncement] =
    useState("");

  const handleCreateDocument = useCallback(() => {
    const documentId = createEmptyDocument();
    setRenameTarget({ documentId, surface: "sidebar" });
  }, [createEmptyDocument]);

  // Hidden file input reference
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerFilePicker = () => {
    updateOnboarding({ hasSeenWorkspaceIntroduction: true });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const totalPageCount = documents.reduce(
    (sum, document) => sum + document.pages.length,
    0
  );
  const showOrganizationHint =
    totalPageCount > 0 &&
    !onboardingState.hasSeenPageOrganizationHint;
  const showExportHint =
    totalPageCount > 0 &&
    canUndo &&
    onboardingState.hasSeenPageOrganizationHint &&
    !onboardingState.hasSeenExportHint;
  const previousCanUndoRef = useRef(canUndo);

  useEffect(() => {
    const becameUndoable = !previousCanUndoRef.current && canUndo;
    previousCanUndoRef.current = canUndo;
    if (!becameUndoable || onboardingState.hasSeenPageOrganizationHint) return;
    updateOnboarding({ hasSeenPageOrganizationHint: true });
  }, [canUndo, onboardingState.hasSeenPageOrganizationHint, updateOnboarding]);

  const openHelp = useCallback((section: HelpSection = "guide") => {
    setHelpSection(section);
    setHelpDialogOpen(true);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const input = e.currentTarget;
      const files = Array.from<File>(input.files ?? []);
      const pressure = await estimateStoragePressure(
        files.reduce((sum, file) => sum + file.size, 0)
      );
      const continueImport =
        !pressure.low ||
        window.confirm(
          "Local storage is running low. PDF Space may not be able to save these PDF files or new recovery revisions. Continue anyway?"
        );
      if (continueImport) void importFiles(files);
      // Reset value to allow uploading the same file again after deletion
      input.value = "";
    }
  };

  const handleGoHome = useCallback(async () => {
    const saved = await persistence.flushPendingSave();
    if (saved) {
      void navigate("/projects", { state: { currentProjectId: projectId } });
      return;
    }
    setPendingNavigation(() => () =>
      void navigate("/projects", { state: { currentProjectId: projectId } })
    );
  }, [navigate, persistence, projectId]);

  const openExportDialog = useCallback((documentId?: string) => {
    setExportDocumentId(documentId ?? null);
    setExportDialogOpen(true);
  }, []);

  // 3. Sidebar Toggle State
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Automatically adjust sidebar state when screen transitions
  useEffect(() => {
    if (isDesktop) {
      // Keep both sidebars open on desktop by default
      setIsLeftSidebarOpen(true);
      setIsRightSidebarOpen(true);
    } else {
      // Close drawers on smaller screen sizes by default to avoid screen blocking
      setIsLeftSidebarOpen(false);
      setIsRightSidebarOpen(false);
    }
  }, [isDesktop]);

  const handleToggleLeftSidebar = () => {
    setIsLeftSidebarOpen((prev) => {
      const next = !prev;
      // Tablet/Mobile: only one drawer open at a time
      if (next && !isDesktop) {
        setIsRightSidebarOpen(false);
      }
      return next;
    });
  };

  const handleToggleRightSidebar = () => {
    setIsRightSidebarOpen((prev) => {
      const next = !prev;
      // Tablet/Mobile: only one drawer open at a time
      if (next && !isDesktop) {
        setIsLeftSidebarOpen(false);
      }
      return next;
    });
  };

  // 4. dnd-kit Drag and Drop Setup
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 6,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
    keyboardCodes: {
      start: ["Space"],
      cancel: ["Escape"],
      end: ["Space"],
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const [activeDragPageId, setActiveDragPageId] = useState<string | null>(null);
  const [activeDragPageCount, setActiveDragPageCount] = useState(0);
  const [activeDragDocumentId, setActiveDragDocumentId] = useState<string | null>(null);
  const [projectedDrop, setProjectedDrop] = useState<ProjectedPageDrop | null>(null);
  const projectedDropRef = useRef<ProjectedPageDrop | null>(null);

  const updateProjectedDrop = useCallback((next: ProjectedPageDrop | null) => {
    if (isSameProjectedDrop(projectedDropRef.current, next)) return;
    projectedDropRef.current = next;
    setProjectedDrop(next);
  }, []);

  const pointerStartRef = useRef<PointerPosition | null>(null);
  const pointerPositionRef = useRef<PointerPosition | null>(null);
  const activeDragDataRef = useRef<PageDropTargetData | null>(null);
  const selectedPages = useMemo(
    () =>
      getSelectedPagesInWorkspaceOrder(
        documents,
        selection.selectedPageIds
      ),
    [documents, selection.selectedPageIds]
  );
  const [documentPickerMode, setDocumentPickerMode] = useState<
    "move" | "copy" | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDocumentTargetId, setDeleteDocumentTargetId] = useState<
    string | null
  >(null);
  const handleOpenWorkspaceSearch = useCallback((mode: WorkspaceSearchMode = "quick") => {
    if (activeDragPageId !== null || activeDragDocumentId !== null) return;
    setRenameTarget(null);
    setSearchRequestedMode(mode);
    setSearchDialogLoaded(true);
    setSearchDialogOpen(true);
  }, [activeDragDocumentId, activeDragPageId]);
  const handleCloseWorkspaceSearch = useCallback(() => {
    setSearchDialogOpen(false);
    window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
  }, []);
  const handleSearchDocumentNavigation = useCallback(
    (item: WorkspaceSearchDocumentItem) => {
      if (!searchIndexState.index.documentById.has(item.documentId)) return;
      setSearchDialogOpen(false);
      requestDocumentNavigation(item.documentId);
      setRecentNavigation((current) =>
        addRecentWorkspaceNavigation(current, {
          type: "document",
          documentId: item.documentId,
          visitedAt: Date.now(),
        })
      );
    },
    [requestDocumentNavigation, searchIndexState.index.documentById]
  );
  const handleSearchPageNavigation = useCallback(
    (
      item: WorkspaceSearchPageItem,
      options: { openInViewer?: boolean } = {}
    ) => {
      const currentItem = searchIndexState.index.pageById.get(item.pageId);
      if (!currentItem || currentItem.documentId !== item.documentId) return;
      setSearchDialogOpen(false);
      if (options.openInViewer) {
        searchViewerReturnRef.current = {
          documentId: item.documentId,
          pageId: item.pageId,
        };
      }
      requestPageNavigation({
        documentId: item.documentId,
        pageId: item.pageId,
        openInViewer: Boolean(options.openInViewer),
      });
      setRecentNavigation((current) =>
        addRecentWorkspaceNavigation(current, {
          type: "page",
          documentId: item.documentId,
          pageId: item.pageId,
          visitedAt: Date.now(),
        })
      );
    },
    [requestPageNavigation, searchIndexState.index.pageById]
  );
  const handleTextSearchPageNavigation = useCallback(
    (
      item: PdfTextSearchResult,
      options: { openInViewer: boolean; viewerContext: PdfTextViewerContext }
    ) => {
      const currentItem = searchIndexState.index.pageById.get(item.pageId);
      if (!currentItem || currentItem.documentId !== item.documentId) return;
      setSearchDialogOpen(false);
      if (options.openInViewer) {
        setTextViewerContext(options.viewerContext);
        searchViewerReturnRef.current = {
          documentId: item.documentId,
          pageId: item.pageId,
        };
      }
      requestPageNavigation({
        documentId: item.documentId,
        pageId: item.pageId,
        openInViewer: options.openInViewer,
      });
      setRecentNavigation((current) =>
        addRecentWorkspaceNavigation(current, {
          type: "page",
          documentId: item.documentId,
          pageId: item.pageId,
          visitedAt: Date.now(),
        })
      );
    },
    [requestPageNavigation, searchIndexState.index.pageById]
  );
  const handleSelectDocumentWithRecent = useCallback(
    (documentId: string) => {
      selectDocument(documentId);
      setRecentNavigation((current) =>
        addRecentWorkspaceNavigation(current, {
          type: "document",
          documentId,
          visitedAt: Date.now(),
        })
      );
    },
    [selectDocument]
  );
  const handleSelectPageWithRecent = useCallback(
    (
      pageId: string,
      documentId: string,
      modifiers?: PageSelectionModifiers
    ) => {
      selectPage(pageId, documentId, modifiers);
      setRecentNavigation((current) =>
        addRecentWorkspaceNavigation(current, {
          type: "page",
          documentId,
          pageId,
          visitedAt: Date.now(),
        })
      );
    },
    [selectPage]
  );
  const handleOpenPageViewerWithRecent = useCallback(
    (pageId: string, documentId: string) => {
      openPageViewer(pageId, documentId);
      setRecentNavigation((current) =>
        addRecentWorkspaceNavigation(current, {
          type: "page",
          documentId,
          pageId,
          visitedAt: Date.now(),
        })
      );
    },
    [openPageViewer]
  );
  const handleViewerPageChangeWithRecent = useCallback(
    (pageId: string, documentId: string) => {
      setViewerPage(pageId, documentId);
      if (searchViewerReturnRef.current) {
        searchViewerReturnRef.current = { pageId, documentId };
      }
      setRecentNavigation((current) =>
        addRecentWorkspaceNavigation(current, {
          type: "page",
          documentId,
          pageId,
          visitedAt: Date.now(),
        })
      );
    },
    [setViewerPage]
  );
  const handleClosePageViewer = useCallback(() => {
    const reopenTextSearch = textViewerContext !== null;
    const returnTarget = searchViewerReturnRef.current;
    searchViewerReturnRef.current = null;
    closePageViewer();
    if (
      !reopenTextSearch &&
      returnTarget &&
      searchIndexState.index.pageById.has(returnTarget.pageId)
    ) {
      requestPageNavigation(returnTarget);
    }
    if (reopenTextSearch) {
      setTextViewerContext(null);
      setSearchRequestedMode("text");
      window.requestAnimationFrame(() => setSearchDialogOpen(true));
    }
  }, [
    closePageViewer,
    requestPageNavigation,
    searchIndexState.index.pageById,
    textViewerContext,
  ]);
  useEffect(() => {
    if (!viewerOpen) searchViewerReturnRef.current = null;
  }, [viewerOpen]);
  const documentActionsDisabled =
    activeDragPageId !== null ||
    activeDragDocumentId !== null ||
    searchDialogOpen;
  const deleteDocumentTarget = deleteDocumentTargetId
    ? documents.find((document) => document.id === deleteDocumentTargetId) ??
      null
    : null;

  const focusDocumentAfterLifecycleAction = useCallback(
    (documentId: string | null) => {
      if (!documentId) return;
      window.setTimeout(() => {
        const actionTrigger =
          globalThis.document.getElementById(
            `document-actions-sidebar-${documentId}`
          ) ??
          globalThis.document.getElementById(
            `document-actions-canvas-${documentId}`
          ) ??
          globalThis.document.getElementById(
            `document-group-${documentId}`
          );
        actionTrigger?.focus();
      }, 0);
    },
    []
  );

  const handleDeleteDocumentRequest = useCallback(
    (documentId: string) => {
      if (documentActionsDisabled || documents.length <= 1) return;
      const document = documents.find(
        (candidate) => candidate.id === documentId
      );
      if (!document) return;
      setRenameTarget(null);
      if (document.pages.length === 0) {
        const deleted = deleteDocument(documentId);
        if (deleted) {
          const deletedIndex = documents.findIndex(
            (candidate) => candidate.id === documentId
          );
          const remaining = documents.filter(
            (candidate) => candidate.id !== documentId
          );
          focusDocumentAfterLifecycleAction(
            (selectedDocumentId !== documentId &&
            remaining.some(
              (candidate) => candidate.id === selectedDocumentId
            )
              ? selectedDocumentId
              : null) ??
              remaining[deletedIndex]?.id ??
              remaining[deletedIndex - 1]?.id ??
              null
          );
        }
        return;
      }
      setDeleteDocumentTargetId(documentId);
    },
    [
      deleteDocument,
      documentActionsDisabled,
      documents,
      focusDocumentAfterLifecycleAction,
      selectedDocumentId,
    ]
  );

  const handleDeleteDocumentConfirm = useCallback(() => {
    const documentId = deleteDocumentTargetId;
    if (!documentId || documentActionsDisabled) return;
    const deletedIndex = documents.findIndex(
      (document) => document.id === documentId
    );
    const remaining = documents.filter(
      (document) => document.id !== documentId
    );
    setDeleteDocumentTargetId(null);
    if (deleteDocument(documentId)) {
      focusDocumentAfterLifecycleAction(
        (selectedDocumentId !== documentId &&
        remaining.some((document) => document.id === selectedDocumentId)
          ? selectedDocumentId
          : null) ??
          remaining[deletedIndex]?.id ??
          remaining[deletedIndex - 1]?.id ??
          null
      );
    }
  }, [
    deleteDocument,
    deleteDocumentTargetId,
    documentActionsDisabled,
    documents,
    focusDocumentAfterLifecycleAction,
    selectedDocumentId,
  ]);

  const handleDuplicateDocument = useCallback(
    (documentId: string) => {
      if (documentActionsDisabled) return;
      setRenameTarget(null);
      const duplicateId = duplicateDocument(documentId);
      focusDocumentAfterLifecycleAction(duplicateId);
    },
    [
      documentActionsDisabled,
      duplicateDocument,
      focusDocumentAfterLifecycleAction,
    ]
  );

  const handleRotate = useCallback(
    (direction: "left" | "right") => {
      rotateSelectedPages(direction);
    },
    [rotateSelectedPages]
  );

  const handleDuplicate = useCallback(() => {
    duplicateSelectedPages();
  }, [duplicateSelectedPages]);

  const handleDocumentPickerChoose = useCallback(
    (targetContainerId: string) => {
      const mode = documentPickerMode;
      if (!mode) return;
      if (mode === "move") {
        moveSelectedPagesToContainer(targetContainerId);
      } else {
        copySelectedPagesToContainer(targetContainerId);
      }
      setDocumentPickerMode(null);
    },
    [
      copySelectedPagesToContainer,
      documentPickerMode,
      moveSelectedPagesToContainer,
    ]
  );

  const handleDeleteConfirm = useCallback(() => {
    const count = deleteSelectedPages();
    setDeleteDialogOpen(false);
    if (count > 0) {
      window.setTimeout(() => {
        document.getElementById("workspace-canvas")?.focus();
      }, 0);
    }
  }, [deleteSelectedPages]);

  const operationHandlers = useMemo<PageOperationActionHandlers>(
    () => ({
      onRotateLeft: () => handleRotate("left"),
      onRotateRight: () => handleRotate("right"),
      onDuplicate: handleDuplicate,
      onMove: () => setDocumentPickerMode("move"),
      onCopy: () => setDocumentPickerMode("copy"),
      onDelete: () => setDeleteDialogOpen(true),
    }),
    [handleDuplicate, handleRotate]
  );

  useEffect(() => {
    const handleWorkspaceSearchShortcut = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTyping = Boolean(
        activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.tagName === "SELECT" ||
            activeElement.isContentEditable)
      );
      const hasBlockingDialog =
        exportDialogOpen ||
        documentPickerMode !== null ||
        deleteDialogOpen ||
        deleteDocumentTargetId !== null ||
        Boolean(pendingNavigation) ||
        Boolean(
          activeElement?.closest('[role="dialog"], [role="alertdialog"]')
        );
      const shortcutContext = {
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          isTyping,
          isDialogOpen: hasBlockingDialog,
          isDragging:
            activeDragPageId !== null || activeDragDocumentId !== null,
        };
      const openQuick = shouldOpenWorkspaceSearch(shortcutContext);
      const openText = shouldOpenPdfTextSearch(shortcutContext);
      if (!openQuick && !openText) return;
      event.preventDefault();
      handleOpenWorkspaceSearch(openText ? "text" : "quick");
    };

    window.addEventListener("keydown", handleWorkspaceSearchShortcut);
    return () =>
      window.removeEventListener("keydown", handleWorkspaceSearchShortcut);
  }, [
    activeDragDocumentId,
    activeDragPageId,
    deleteDialogOpen,
    deleteDocumentTargetId,
    documentPickerMode,
    exportDialogOpen,
    handleOpenWorkspaceSearch,
    pendingNavigation,
  ]);

  useEffect(() => {
    const handleSelectionShortcut = (event: KeyboardEvent) => {
      if (activeDragPageId) return;

      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      const dialogOpen =
        searchDialogOpen ||
        documentPickerMode !== null ||
        deleteDialogOpen ||
        deleteDocumentTargetId !== null ||
        viewerOpen ||
        Boolean(
          activeElement?.closest('[role="dialog"], [role="alertdialog"]')
        );
      if (dialogOpen) return;

      const commandKey = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (commandKey && key === "z") {
        if (event.shiftKey) {
          if (!canRedo) return;
          event.preventDefault();
          redoWorkspace();
        } else {
          if (!canUndo) return;
          event.preventDefault();
          undoWorkspace();
        }
        return;
      }

      if (event.ctrlKey && !event.metaKey && key === "y") {
        if (!canRedo) return;
        event.preventDefault();
        redoWorkspace();
        return;
      }

      if (
        event.key === "Delete" &&
        selection.selectedPageIds.length > 0
      ) {
        event.preventDefault();
        setDeleteDialogOpen(true);
        return;
      }

      if (viewerOpen) return;

      if (event.key === "Escape" && selection.selectedPageIds.length > 0) {
        event.preventDefault();
        clearPageSelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        const activePage = selection.activePageId
          ? documents
              .flatMap((document) => document.pages)
              .find((page) => page.id === selection.activePageId)
          : null;
        const focusedContainerId = activeElement
          ?.closest<HTMLElement>("[data-container-id]")
          ?.dataset.containerId;
        const containerId =
          selection.activeContainerId ??
          activePage?.documentId ??
          focusedContainerId ??
          null;
        const activeDocument = containerId
          ? documents.find(
              (document) =>
                document.id === containerId &&
                document.status === "ready" &&
                document.pages.length > 0
            )
          : null;

        if (!activeDocument) return;
        event.preventDefault();
        selectAllInContainer(activeDocument.id);
      }
    };

    window.addEventListener("keydown", handleSelectionShortcut);
    return () => window.removeEventListener("keydown", handleSelectionShortcut);
  }, [
    activeDragPageId,
    canRedo,
    canUndo,
    clearPageSelection,
    documents,
    documentPickerMode,
    deleteDialogOpen,
    deleteDocumentTargetId,
    searchDialogOpen,
    selectAllInContainer,
    selection.activeContainerId,
    selection.activePageId,
    selection.selectedPageIds.length,
    redoWorkspace,
    undoWorkspace,
    viewerOpen,
  ]);

  const customCollisionDetection = useCallback<CollisionDetection>((args) => {
    const activeId = String(args.active.id);
    const activeType = (args.active.data.current as { type?: string } | undefined)
      ?.type;

    if (activeType === "document") {
      const documentContainers = args.droppableContainers.filter(
        (container) =>
          (container.data.current as { type?: string } | undefined)?.type ===
          "document"
      );
      if (args.pointerCoordinates) {
        const pointerCollisions = pointerWithin({
          ...args,
          droppableContainers: documentContainers,
        });
        if (pointerCollisions.length > 0) return pointerCollisions;
      }
      return closestCenter({
        ...args,
        droppableContainers: documentContainers,
      });
    }

    // dnd-kit already exposes the authoritative pointer coordinates used by
    // collision detection. Keeping them here prevents DragOverlay grab-offset
    // errors and remains accurate during canvas auto-scroll.
    if (args.pointerCoordinates) {
      pointerPositionRef.current = {
        x: args.pointerCoordinates.x,
        y: args.pointerCoordinates.y,
      };
    }

    const pointerCollisions = pointerWithin(args);

    if (pointerCollisions.length > 0) {
      // The projected ghost is the canonical insertion slot. Keep it stable
      // when the pointer is directly over the visual preview.
      const collisionData = (collisionId: string | number) =>
        getDropTargetData(
          args.droppableContainers.find(
            (container) => String(container.id) === String(collisionId)
          )?.data.current
        );
      const slotCollisions = pointerCollisions.filter(
        (collision) => collisionData(collision.id)?.type === "projected-slot"
      );
      if (slotCollisions.length > 0) return slotCollisions;

      const pageCollisions = pointerCollisions.filter((collision) => {
        const data = collisionData(collision.id);
        return data?.type === "page" && String(collision.id) !== activeId;
      });
      if (pageCollisions.length > 0) {
        return pageCollisions;
      }

      const sidebarCollisions = pointerCollisions.filter(
        (collision) => collisionData(collision.id)?.type === "sidebar-container"
      );
      if (sidebarCollisions.length > 0) {
        return sidebarCollisions;
      }

      const documentCollision = pointerCollisions.find(
        (collision) => collisionData(collision.id)?.type === "container"
      );

      if (documentCollision) {
        const documentData = collisionData(documentCollision.id);
        if (!documentData || documentData.type !== "container") {
          return [documentCollision];
        }
        const targetContainerId = documentData.containerId;

        // A grid gap still belongs to the nearest real page in the same
        // document. Returning the parent container here used to reset the
        // drop to the end of the document.
        const targetPageContainers = args.droppableContainers.filter(
          (container) => {
            const data = getDropTargetData(container.data.current);

            return (
              String(container.id) !== activeId &&
              data?.type === "page" &&
              data.containerId === targetContainerId
            );
          }
        );

        if (targetPageContainers.length > 0) {
          let sameRowPageContainers = targetPageContainers;
          if (args.pointerCoordinates) {
            const withVerticalDistance = targetPageContainers
              .map((container) => {
                const rect = container.rect.current;
                return rect
                  ? {
                      container,
                      distance: Math.abs(
                        args.pointerCoordinates!.y - (rect.top + rect.height / 2)
                      ),
                    }
                  : null;
              })
              .filter(
                (
                  entry
                ): entry is {
                  container: (typeof targetPageContainers)[number];
                  distance: number;
                } => entry !== null
              );
            const nearestRowDistance = Math.min(
              ...withVerticalDistance.map((entry) => entry.distance)
            );
            sameRowPageContainers = withVerticalDistance
              .filter((entry) => entry.distance <= nearestRowDistance + 1)
              .map((entry) => entry.container);
          }

          const nearestTargetPage = closestCenter({
            ...args,
            droppableContainers: sameRowPageContainers,
          });

          if (nearestTargetPage.length > 0) {
            return nearestTargetPage;
          }
        }

        return [documentCollision];
      }

      return pointerCollisions;
    }

    // Keyboard dragging has no pointer coordinates, so nearest-center is a
    // suitable fallback. Pointer dragging outside a valid target should not
    // silently commit to a distant page.
    if (!args.pointerCoordinates) {
      const pageContainers = args.droppableContainers.filter((container) => {
        const data = getDropTargetData(container.data.current);
        return data?.type === "page" && String(container.id) !== activeId;
      });
      return closestCenter({
        ...args,
        droppableContainers:
          pageContainers.length > 0 ? pageContainers : args.droppableContainers,
      });
    }

    return [];
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active, activatorEvent } = event;
    const activeData = active.data.current as
      | WorkspacePageDragData
      | WorkspaceDocumentDragData
      | undefined;
    if (activeData?.type === "document") {
      setActiveDragPageCount(0);
      setActiveDragDocumentId(activeData.documentId);
      setDocumentReorderAnnouncement(`Moving ${documents.find((document) => document.id === activeData.documentId)?.name ?? "document"}.`);
      window.isInternalDragging = true;
      return;
    }

    if (!activeData || activeData.type !== "page") {
      return;
    }

    const pageId = activeData.pageId;
    activeDragDataRef.current = activeData;
    setActiveDragPageId(pageId);
    setActiveDragPageCount(
      selection.selectedPageIds.includes(pageId)
        ? Math.max(1, selectedPages.length)
        : 1
    );
    selectPage(pageId, activeData.containerId);

    const startCoordinates = getActivatorCoordinates(activatorEvent);
    pointerStartRef.current = startCoordinates;
    pointerPositionRef.current = startCoordinates;

    // Keep native operating-system file import isolated from dnd-kit page
    // movement.
    window.isInternalDragging = true;
    window.draggedPageId = pageId;
    window.draggedPageContainerId = activeData.containerId;
  }, [documents, selectPage, selectedPages.length, selection.selectedPageIds]);

  const projectDropFromTarget = useCallback((active: Active, over: Over | null) => {
    const activeData = resolveActivePageDragData(
      active.data.current,
      activeDragDataRef.current
    );
    if (!activeData || activeData.type !== "page") return;

    if (!over) {
      updateProjectedDrop(null);
      return;
    }

    const targetData = getDropTargetData(over.data.current);
    if (!targetData) {
      updateProjectedDrop(null);
      return;
    }

    const activePageId = activeData.pageId;
    const sourceContainerId = activeData.containerId;

    if (targetData.type === "projected-slot") {
      updateProjectedDrop({
        activePageId,
        sourceContainerId,
        targetContainerId: targetData.containerId,
        insertionSlot: targetData.insertionSlot,
      });
      return;
    }

    if (targetData.type === "sidebar-container") {
      const basePages = getTargetBasePages({
        documents,
        activePageId,
        sourceContainerId,
        targetContainerId: targetData.containerId,
      });
      updateProjectedDrop({
        activePageId,
        sourceContainerId,
        targetContainerId: targetData.containerId,
        insertionSlot: basePages.length,
      });
      return;
    }

    if (targetData.type === "container") {
      const basePages = getTargetBasePages({
        documents,
        activePageId,
        sourceContainerId,
        targetContainerId: targetData.containerId,
      });

      if (basePages.length === 0) {
        updateProjectedDrop({
          activePageId,
          sourceContainerId,
          targetContainerId: targetData.containerId,
          insertionSlot: 0,
        });
      } else if (
        projectedDropRef.current?.targetContainerId !== targetData.containerId
      ) {
        updateProjectedDrop(null);
      }
      return;
    }

    const targetContainerId = targetData.containerId;
    const targetBasePages = getTargetBasePages({
      documents,
      activePageId,
      sourceContainerId,
      targetContainerId,
    });
    const overIndex = targetBasePages.findIndex(
      (page) => page.id === targetData.pageId
    );
    if (overIndex === -1) return;

    const overRect = over.rect;
    const fallbackRect = active.rect.current.translated;
    const pointer =
      pointerPositionRef.current ??
      (fallbackRect
        ? {
            x: fallbackRect.left + fallbackRect.width / 2,
            y: fallbackRect.top + fallbackRect.height / 2,
          }
        : null);
    const beforeSlot = overIndex;
    const afterSlot = overIndex + 1;
    let insertionSlot = beforeSlot;

    if (pointer) {
      if (pointer.y > overRect.bottom) {
        insertionSlot = afterSlot;
      } else if (pointer.y >= overRect.top) {
        const relativeX = (pointer.x - overRect.left) / overRect.width;
        const previous = projectedDropRef.current;
        const previousMatchesSide =
          previous?.targetContainerId === targetContainerId &&
          (previous.insertionSlot === beforeSlot ||
            previous.insertionSlot === afterSlot);

        insertionSlot =
          relativeX >= 0.45 && relativeX <= 0.55 && previousMatchesSide
            ? previous.insertionSlot
            : relativeX < 0.5
              ? beforeSlot
              : afterSlot;
      }
    }

    updateProjectedDrop({
      activePageId,
      sourceContainerId,
      targetContainerId,
      insertionSlot,
    });
  }, [documents, updateProjectedDrop]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const start = pointerStartRef.current;
    if (!start) {
      const translated = event.active.rect.current.translated;
      pointerPositionRef.current = translated
        ? {
            x: translated.left + translated.width / 2,
            y: translated.top + translated.height / 2,
          }
        : null;
    } else {
      pointerPositionRef.current = {
        x: start.x + event.delta.x,
        y: start.y + event.delta.y,
      };
    }

    projectDropFromTarget(event.active, event.over);
  }, [projectDropFromTarget]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    projectDropFromTarget(event.active, event.over);
  }, [projectDropFromTarget]);

  const clearDragState = useCallback(() => {
    setActiveDragPageId(null);
    setActiveDragPageCount(0);
    setActiveDragDocumentId(null);
    updateProjectedDrop(null);
    pointerStartRef.current = null;
    pointerPositionRef.current = null;
    activeDragDataRef.current = null;
    window.isInternalDragging = false;
    window.draggedPageId = null;
    window.draggedPageContainerId = null;
  }, [updateProjectedDrop]);

  useEffect(() => {
    if (!activeDragPageId && !activeDragDocumentId) return;
    const handleWindowBlur = () => clearDragState();
    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [activeDragDocumentId, activeDragPageId, clearDragState]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const activeData = event.active.data.current as
      | WorkspacePageDragData
      | WorkspaceDocumentDragData
      | undefined;
    if (activeData?.type === "document") {
      const overData = event.over?.data.current as
        | WorkspaceDocumentDragData
        | undefined;
      if (overData?.type === "document") {
        const moved = reorderDocuments(
          activeData.documentId,
          overData.documentId
        );
        if (moved) {
          const nextDocuments = [...documents];
          const activeIndex = nextDocuments.findIndex(
            (document) => document.id === activeData.documentId
          );
          const overIndex = nextDocuments.findIndex(
            (document) => document.id === overData.documentId
          );
          if (activeIndex < 0 || overIndex < 0) {
            clearDragState();
            return;
          }
          const [activeDocument] = nextDocuments.splice(activeIndex, 1);
          if (!activeDocument) {
            clearDragState();
            return;
          }
          nextDocuments.splice(overIndex, 0, activeDocument);
          setDocumentReorderAnnouncement(
            `${activeDocument.name} moved to position ${overIndex + 1} of ${nextDocuments.length}.`
          );
        }
      }
      clearDragState();
      return;
    }

    const finalDrop = projectedDropRef.current;
    if (!finalDrop) {
      clearDragState();
      return;
    }

    movePage(
      finalDrop.activePageId,
      finalDrop.sourceContainerId,
      finalDrop.targetContainerId,
      finalDrop.insertionSlot
    );
    clearDragState();
  }, [clearDragState, documents, movePage, reorderDocuments]);

  const handleDragCancel = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const renderDragOverlay = () => {
    if (activeDragDocumentId) {
      const document = documents.find(
        (candidate) => candidate.id === activeDragDocumentId
      );
      if (!document) return null;
      return (
        <div className="flex max-w-[260px] items-center gap-2 rounded-xl border border-blue-bright/35 bg-[#0c0f17]/95 px-3 py-2 text-[12px] font-bold text-primary-text shadow-2xl">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: document.color }}
            aria-hidden="true"
          />
          <span className="truncate">{document.name}</span>
          <Move className="h-3.5 w-3.5 flex-shrink-0 text-blue-bright" aria-hidden="true" />
        </div>
      );
    }
    if (!activeDragPageId) return null;
    
    let activePage: WorkspacePage | null = null;
    let parentDoc: WorkspaceDocument | null = null;
    for (const doc of documents) {
      const p = doc.pages.find((page) => page.id === activeDragPageId);
      if (p) {
        activePage = p;
        parentDoc = doc;
        break;
      }
    }
    
    if (!activePage || !parentDoc) return null;
    return (
      <PageDragPreview
        page={activePage}
        documentName={parentDoc.name}
        documentColor={parentDoc.color}
        selectedCount={activeDragPageCount}
      />
    );
  };

  if (persistence.openingState.status !== "ready") {
    return (
      <ProjectOpeningState
        state={persistence.openingState}
        onRetry={persistence.retryOpening}
        onNewWorkspace={() => navigate("/projects", { replace: true })}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-main-bg font-sans text-primary-text selection:bg-blue-accent/30">
        
        {/* Hidden PDF file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="workspace-pdf-input"
          aria-label="Select PDF files to import"
        />

        {/* 1. App Top Toolbar */}
        <WorkspaceTopbar
          isLeftSidebarOpen={isLeftSidebarOpen}
          isRightSidebarOpen={isRightSidebarOpen}
          onToggleLeftSidebar={handleToggleLeftSidebar}
          onToggleRightSidebar={handleToggleRightSidebar}
          isTabletView={isTablet}
          isMobileView={isMobile}
          onAddPDFs={handleTriggerFilePicker}
          hasDocuments={documents.length > 0}
          totalPageCount={documents.reduce((sum, doc) => sum + (doc.pageCount || 0), 0)}
          canUndo={canUndo}
          canRedo={canRedo}
          undoLabel={undoLabel}
          redoLabel={redoLabel}
          onUndo={undoWorkspace}
          onRedo={redoWorkspace}
          projectName={projectName}
          saveStatus={persistence.saveStatus}
          lastSavedAt={persistence.lastSavedAt}
          canSave={persistence.canSave}
          isSaveBusy={persistence.isSaveBusy}
          onSave={() => {
            void persistence.saveNow();
          }}
          onRenameProject={persistence.renameProject}
          canExport={documents.some(
            (document) =>
              document.status === "ready" && document.pages.length > 0
          )}
          onExport={() => openExportDialog()}
          onGoHome={() => {
            void handleGoHome();
          }}
          onSearch={handleOpenWorkspaceSearch}
          onHelp={() => openHelp("guide")}
          searchTriggerRef={searchTriggerRef}
          searchShortcutLabel={searchShortcutLabel}
        />

        {importProgress && (
          <section
            role="status"
            aria-live="polite"
            aria-label="PDF import progress"
            className="flex flex-col gap-1 border-b border-blue-bright/20 bg-blue-accent/[0.06] px-4 py-3 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div>
              <p className="font-extrabold text-blue-bright">
                {importProgress.phase === "preparing"
                  ? "Preparing files…"
                  : importProgress.phase === "previews"
                    ? "Creating page previews…"
                    : `Loading ${importProgress.currentFileName ?? "PDF"}`}
              </p>
              {importProgress.currentFileNumber > 0 && (
                <p className="mt-0.5 text-muted-text">
                  {importProgress.currentFileNumber} of {importProgress.totalFiles} files
                  {importProgress.currentFileName ? <> · <bdi dir="auto">{importProgress.currentFileName}</bdi></> : null}
                </p>
              )}
            </div>
            <span className="text-[9.5px] font-bold text-muted-text">Keep this tab open while the current file is prepared.</span>
          </section>
        )}

        {importSummary && (
          <section
            role="status"
            aria-live="polite"
            aria-label="PDF import result"
            className="flex flex-col gap-2 border-b border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-[11px] sm:flex-row sm:items-start sm:justify-between sm:px-6"
          >
            <div>
              <p className="font-extrabold text-emerald-200">
                {importSummary.addedPdfCount > 0
                  ? `${importSummary.addedPdfCount} PDF${importSummary.addedPdfCount === 1 ? "" : "s"} added`
                  : "No PDFs were added"}
              </p>
              <p className="mt-0.5 text-secondary-text">
                {importSummary.addedPageCount > 0
                  ? `${importSummary.addedPageCount} page${importSummary.addedPageCount === 1 ? " is" : "s are"} ready to organize.`
                  : "Choose another readable PDF file to continue."}
                {importSummary.failedFiles.length > 0
                  ? ` ${importSummary.failedFiles.length} selected file${importSummary.failedFiles.length === 1 ? "" : "s"} could not be added.`
                  : ""}
              </p>
              {importSummary.failedFiles.length > 0 && (
                <details className="mt-2 text-muted-text">
                  <summary className="cursor-pointer font-bold text-secondary-text">Review files that were not added</summary>
                  <ul className="mt-2 space-y-1">
                    {importSummary.failedFiles.map((failure, index) => (
                      <li key={`${failure.name}-${index}`}><bdi dir="auto">{failure.name}</bdi> — {failure.reason}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <button
              type="button"
              onClick={dismissImportSummary}
              className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-secondary-text hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              Dismiss
            </button>
          </section>
        )}

        {showOrganizationHint && (
          <OnboardingHint
            label="Page organization tip"
            title="Organize your pages"
            onDismiss={() => updateOnboarding({ hasSeenPageOrganizationHint: true })}
          >
            Drag pages to reorder them or move them between documents. Hold Ctrl or Cmd to select multiple pages.
          </OnboardingHint>
        )}

        {showExportHint && (
          <OnboardingHint
            label="Export tip"
            title="Ready to create your PDFs?"
            onDismiss={() => updateOnboarding({ hasSeenExportHint: true, completedAt: new Date().toISOString() })}
            action={
              <button
                type="button"
                onClick={() => {
                  updateOnboarding({ hasSeenExportHint: true, completedAt: new Date().toISOString() });
                  openExportDialog();
                }}
                className="min-h-9 rounded-lg bg-blue-accent px-3 text-[10.5px] font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Open Export
              </button>
            }
          >
            Export one document as a PDF or several documents together in a ZIP file. Save keeps the editable workspace in this browser.
          </OnboardingHint>
        )}

        {persistence.recoveryInfo && (
          <section
            role="status"
            aria-label="Recovered local revision"
            className="flex flex-col gap-2 border-b border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div>
              <p className="font-extrabold text-cyan-200">Recovered local revision</p>
              <p className="mt-0.5 text-secondary-text">
                The latest save could not be verified. You are viewing the most recent valid version.
                {persistence.recoveryInfo.missingSourceCount > 0
                  ? ` ${persistence.recoveryInfo.missingSourceCount} original PDF source(s) are unavailable.`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void persistence.keepRecoveredVersion()}
                className="min-h-9 rounded-lg bg-blue-accent px-3 font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Keep This Version
              </button>
              <button
                type="button"
                onClick={() => navigate("/projects", { state: { currentProjectId: projectId } })}
                className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-secondary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Return to Projects
              </button>
            </div>
          </section>
        )}

        {persistence.conflictRevision !== null && (
          <section
            role="alert"
            aria-label="Project changed in another tab"
            className="flex flex-col gap-2 border-b border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div>
              <p className="font-extrabold text-amber-200">This project changed in another tab</p>
              <p className="mt-0.5 text-secondary-text">
                Reload revision {persistence.conflictRevision}, or preserve this tab's work as a separate local project.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={persistence.reloadLatestVersion}
                className="min-h-9 rounded-lg bg-blue-accent px-3 font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Reload Latest Version
              </button>
              <button
                type="button"
                onClick={() => {
                  void persistence.duplicateEditingCopy().then((copyId) => {
                    if (copyId) void navigate(`/workspace/${copyId}`);
                  });
                }}
                className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-secondary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Duplicate as New Project
              </button>
            </div>
          </section>
        )}

        {persistence.missingSources.length > 0 && (
          <section
            role="alert"
            aria-label="Some original PDF sources are unavailable"
            className="flex flex-col gap-2 border-b border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-[11px] sm:flex-row sm:items-start sm:justify-between sm:px-6"
          >
            <div>
              <p className="font-extrabold text-amber-200">Some original PDF sources are unavailable</p>
              <p className="mt-0.5 text-secondary-text">
                The project structure was restored, but affected pages cannot be viewed or exported until their sources are restored.
              </p>
              <ul className="mt-2 space-y-1 text-muted-text">
                {persistence.missingSources.map((source) => (
                  <li key={`${source.name}-${source.affectedPageCount}`}>
                    <bdi dir="auto">{source.name}</bdi> — required by {source.affectedDocumentCount} document(s) and {source.affectedPageCount} page(s)
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={persistence.dismissMissingSources}
                className="min-h-9 rounded-lg bg-blue-accent px-3 font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => navigate("/projects", { state: { currentProjectId: projectId } })}
                className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-secondary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Return to Projects
              </button>
            </div>
          </section>
        )}

        {(persistence.saveStatus === "error" ||
          persistence.saveStatus === "unavailable") && (
          <section
            role="alert"
            aria-label="Local persistence warning"
            className="flex flex-col gap-2 border-b border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div>
              <p className="font-extrabold text-amber-200">
                {persistence.saveStatus === "unavailable"
                  ? "Local project storage is unavailable"
                  : persistence.saveErrorMessage?.toLowerCase().includes("storage is full")
                    ? "Not saved — local storage is full"
                    : "The latest changes are not saved locally"}
              </p>
              <p className="mt-0.5 text-secondary-text">
                Your current work remains in this tab. You can keep editing and export PDFs, then retry after local storage is available.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void persistence.saveNow()}
                className="min-h-9 rounded-lg bg-blue-accent px-3 font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Retry Save
              </button>
              <button
                type="button"
                onClick={() => navigate("/projects", { state: { currentProjectId: projectId } })}
                className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-secondary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Review Storage
              </button>
              {documents.some((document) => document.pages.length > 0) && (
                <button
                  type="button"
                  onClick={() => openExportDialog()}
                  className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-secondary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                >
                  Export PDFs
                </button>
              )}
            </div>
          </section>
        )}

        {/* 2. Main Workspace Layout */}
        <div className="flex-grow flex min-h-0 w-full relative" aria-busy={isImporting}>
          
          {/* Left Side: Documents Sidebar Column (Desktop Only) */}
          {isDesktop && isLeftSidebarOpen && (
            <div 
              style={{ width: isLargeDesktop ? "280px" : "240px" }}
              className="h-full flex-shrink-0 transition-all duration-200"
            >
              <DocumentsSidebar
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={handleSelectDocumentWithRecent}
                onDeleteDocument={handleDeleteDocumentRequest}
                onDuplicateDocument={handleDuplicateDocument}
                onAddPDFs={handleTriggerFilePicker}
                onNewDocument={handleCreateDocument}
                onRenameDocument={renameDocument}
                editingDocumentId={
                  renameTarget?.surface === "sidebar"
                    ? renameTarget.documentId
                    : null
                }
                onStartRename={(documentId) =>
                  setRenameTarget({ documentId, surface: "sidebar" })
                }
                onStopRename={() => setRenameTarget(null)}
                documentActionsDisabled={documentActionsDisabled}
              />
            </div>
          )}

          {/* Center Canvas (Main Stage - Always Rendered) */}
          <WorkspaceCanvas
            documents={documents}
            onDeleteDocument={handleDeleteDocumentRequest}
            onDuplicateDocument={handleDuplicateDocument}
            documentActionsDisabled={documentActionsDisabled}
            onUpdatePageThumbnail={updatePageThumbnail}
            importFiles={importFiles}
            onTriggerFilePicker={handleTriggerFilePicker}
            selection={selection}
            viewerPageId={viewerPageId}
            onSelectPage={handleSelectPageWithRecent}
            onOpenPageViewer={handleOpenPageViewerWithRecent}
            onExportDocument={openExportDialog}
            onClearPageSelection={clearPageSelection}
            activeDragPageId={activeDragPageId}
            projectedTarget={projectedDrop}
            selectionToolbar={
              !isMobile && selectedPages.length > 0 ? (
                <SelectionActionToolbar
                  {...operationHandlers}
                  onClearSelection={clearPageSelection}
                  selectedCount={selectedPages.length}
                />
              ) : undefined
            }
            showToolbarLane={!isMobile}
            reserveMobileActionSpace={
              isMobile && selectedPages.length > 0
            }
            onRenameDocument={renameDocument}
            editingDocumentId={
              renameTarget?.surface === "canvas"
                ? renameTarget.documentId
                : null
            }
            onStartRename={(documentId) =>
              setRenameTarget({ documentId, surface: "canvas" })
            }
            onStopRename={() => setRenameTarget(null)}
            registerDocumentElement={registerDocumentElement}
            registerPageElement={registerPageElement}
            highlightedDocumentId={highlightedDocumentId}
            highlightedPageId={highlightedPageId}
            activeDocumentId={selectedDocumentId}
          />

          {/* Right Side: Inspector Sidebar Column (Desktop Only) */}
          {isDesktop && isRightSidebarOpen && (
            <div 
              style={{ width: isLargeDesktop ? "320px" : "280px" }}
              className="h-full flex-shrink-0 transition-all duration-200"
            >
              <WorkspaceInspector
                documents={documents}
                sourceDocuments={sourceDocuments}
                selectedDocumentId={selectedDocumentId}
                selection={selection}
                selectedPages={selectedPages}
                onClearSelection={clearPageSelection}
                onSelectAllInContainer={selectAllInContainer}
                onOpenPageViewer={handleOpenPageViewerWithRecent}
                operationHandlers={operationHandlers}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* Responsive Drawers for Tablet and Mobile (Viewport < 1024px) */}
          {/* ========================================================= */}

          {/* Left Drawer (Documents) */}
          {!isDesktop && (
            <WorkspaceDrawer
              isOpen={isLeftSidebarOpen}
              onClose={() => setIsLeftSidebarOpen(false)}
              position="left"
              title="Documents"
            >
              <DocumentsSidebar
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={handleSelectDocumentWithRecent}
                onDeleteDocument={handleDeleteDocumentRequest}
                onDuplicateDocument={handleDuplicateDocument}
                onAddPDFs={handleTriggerFilePicker}
                onNewDocument={handleCreateDocument}
                onRenameDocument={renameDocument}
                editingDocumentId={
                  renameTarget?.surface === "sidebar"
                    ? renameTarget.documentId
                    : null
                }
                onStartRename={(documentId) =>
                  setRenameTarget({ documentId, surface: "sidebar" })
                }
                onStopRename={() => setRenameTarget(null)}
                documentActionsDisabled={documentActionsDisabled}
              />
            </WorkspaceDrawer>
          )}

          {/* Right Drawer (Inspector) */}
          {!isDesktop && (
            <WorkspaceDrawer
              isOpen={isRightSidebarOpen}
              onClose={() => setIsRightSidebarOpen(false)}
              position="right"
              title="Inspector"
            >
              <WorkspaceInspector
                documents={documents}
                sourceDocuments={sourceDocuments}
                selectedDocumentId={selectedDocumentId}
                selection={selection}
                selectedPages={selectedPages}
                onClearSelection={clearPageSelection}
                onSelectAllInContainer={selectAllInContainer}
                onOpenPageViewer={handleOpenPageViewerWithRecent}
                operationHandlers={operationHandlers}
              />
            </WorkspaceDrawer>
          )}
        </div>

        {/* Bottom Floating Control Bar (Mobile-specific helper triggers for accessibility) */}
        {isMobile && (
          <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border-main bg-panel-elevated/95 p-2 shadow-dialog backdrop-blur-md pointer-events-auto">
            <button
              onClick={() => {
                setIsLeftSidebarOpen(!isLeftSidebarOpen);
                if (!isLeftSidebarOpen) setIsRightSidebarOpen(false);
              }}
              aria-label="Toggle Documents menu"
              className={`min-h-11 rounded-lg px-4 text-xs font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer ${
                isLeftSidebarOpen 
                  ? "bg-blue-accent/20 text-blue-bright border border-blue-accent/30" 
                  : "text-muted-text hover:text-primary-text border border-transparent"
              }`}
            >
              Docs
            </button>
            
            <div className="w-px h-3.5 bg-white/10" />

            <button
              onClick={() => {
                setIsRightSidebarOpen(!isRightSidebarOpen);
                if (!isRightSidebarOpen) setIsLeftSidebarOpen(false);
              }}
              aria-label="Toggle Inspector properties"
              className={`min-h-11 rounded-lg px-4 text-xs font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer ${
                isRightSidebarOpen 
                  ? "bg-blue-accent/20 text-blue-bright border border-blue-accent/30" 
                  : "text-muted-text hover:text-primary-text border border-transparent"
              }`}
            >
              Inspect
            </button>
          </div>
        )}

        {exportDialogOpen && (
          <Suspense
            fallback={
              <div
                className="studio-dialog-overlay fixed inset-0 z-[100] flex items-center justify-center"
                role="status"
                aria-live="polite"
              >
                <div className="command-surface px-5 py-4 text-xs font-semibold text-secondary-text">
                  Loading export tools…
                </div>
              </div>
            }
          >
            <ExportDialog
              isOpen={exportDialogOpen}
              projectId={projectId}
              projectName={projectName}
              documents={documents}
              sourceDocuments={sourceDocuments}
              preselectedDocumentId={exportDocumentId}
              onClose={() => {
                setExportDialogOpen(false);
                setExportDocumentId(null);
              }}
            />
          </Suspense>
        )}

        {isMobile && selectedPages.length > 0 && (
          <SelectionActionToolbar
            {...operationHandlers}
            onClearSelection={clearPageSelection}
            selectedCount={selectedPages.length}
            mobile
          />
        )}

        {searchDialogLoaded && (
          <Suspense fallback={null}>
            <WorkspaceSearchDialog
              key={projectId}
              isOpen={searchDialogOpen}
              requestedMode={searchRequestedMode}
              projectId={projectId}
              documents={documents}
              sourceDocuments={sourceDocuments}
              activeDocumentId={selectedDocumentId}
              index={searchIndexState.index}
              indexError={searchIndexState.error}
              recent={recentNavigation}
              shortcutLabel={searchShortcutLabel}
              textShortcutLabel={textSearchShortcutLabel}
              onClose={handleCloseWorkspaceSearch}
              onNavigateDocument={handleSearchDocumentNavigation}
              onNavigatePage={handleSearchPageNavigation}
              onNavigateTextResult={handleTextSearchPageNavigation}
            />
          </Suspense>
        )}

        {/* Dialog Modal Viewer for Full-Screen PDF Interactive Pages */}
        <PageViewerDialog
          isOpen={viewerOpen}
          onClose={handleClosePageViewer}
          pageId={viewerPageId}
          documentId={viewerDocumentId}
          documents={documents}
          onPageChange={handleViewerPageChangeWithRecent}
          onRotateLeft={() => handleRotate("left")}
          onRotateRight={() => handleRotate("right")}
          onDelete={() => setDeleteDialogOpen(true)}
          suspendShortcuts={
            deleteDialogOpen ||
            deleteDocumentTargetId !== null ||
            documentPickerMode !== null ||
            searchDialogOpen
          }
          searchContext={textViewerContext}
        />

        <DocumentPickerDialog
          isOpen={documentPickerMode !== null}
          mode={documentPickerMode ?? "move"}
          documents={documents}
          selectedPages={selectedPages}
          onClose={() => setDocumentPickerMode(null)}
          onChoose={handleDocumentPickerChoose}
        />

        <DeletePagesDialog
          isOpen={deleteDialogOpen}
          selectedCount={selectedPages.length}
          onCancel={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
        />

        <DeleteDocumentDialog
          document={deleteDocumentTarget}
          onCancel={() => setDeleteDocumentTargetId(null)}
          onConfirm={handleDeleteDocumentConfirm}
        />

        <LeaveWorkspaceDialog
          isOpen={Boolean(pendingNavigation)}
          onStay={() => setPendingNavigation(null)}
          onLeave={() => {
            const navigateAnyway = pendingNavigation;
            setPendingNavigation(null);
            navigateAnyway?.();
          }}
        />

        <HelpDialog
          isOpen={helpDialogOpen}
          initialSection={helpSection}
          onClose={() => setHelpDialogOpen(false)}
          onReplayGuide={() => {
            replayOnboarding();
            setHelpSection("guide");
          }}
        />

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {selection.selectedPageIds.length === 0
            ? "No pages selected."
            : `${selection.selectedPageIds.length} ${
                selection.selectedPageIds.length === 1 ? "page" : "pages"
              } selected.`}
        </div>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {documentReorderAnnouncement}
        </div>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {persistence.saveStatus === "error"
            ? "Local save failed."
            : persistence.saveStatus === "unavailable"
              ? "Local saving is unavailable."
              : ""}
        </div>
      </div>
      
      <DragOverlay dropAnimation={null}>
        {renderDragOverlay()}
      </DragOverlay>
    </DndContext>
  );
};
