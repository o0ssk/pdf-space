import React, { useState, useEffect, useRef } from "react";
import { WorkspaceTopbar } from "./WorkspaceTopbar";
import { DocumentsSidebar } from "./DocumentsSidebar";
import { WorkspaceCanvas } from "./WorkspaceCanvas";
import { WorkspaceInspector } from "./WorkspaceInspector";
import { WorkspaceDrawer } from "./WorkspaceDrawer";
import { useWorkspace } from "../../hooks/useWorkspace";
import { PageViewerDialog } from "./viewer/PageViewerDialog";

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
  getInsertionSlotForPlacement,
  getTargetBasePages,
} from "../../types/workspace";


type InternalPageDragData = {
  type: "page";
  pageId: string;
  currentContainerId: string;
  sourceIndex: number;
};

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

export const WorkspaceShell: React.FC = () => {
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
  const {
    documents,
    sourceDocuments,
    selectedDocumentId,
    selectedPageId,
    viewerOpen,
    viewerPageId,
    viewerDocumentId,
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
  } = useWorkspace();

  // Hidden file input reference
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      importFiles(e.target.files);
      // Reset value to allow uploading the same file again after deletion
      e.target.value = "";
    }
  };

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
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const [activeDragPageId, setActiveDragPageId] = useState<string | null>(null);
  const [projectedDrop, setProjectedDrop] = useState<ProjectedPageDrop | null>(null);
  const projectedDropRef = useRef<ProjectedPageDrop | null>(null);

  const updateProjectedDrop = (next: ProjectedPageDrop | null) => {
    projectedDropRef.current = next;
    setProjectedDrop(next);
  };

  const pointerStartRef = useRef<PointerPosition | null>(null);
  const pointerPositionRef = useRef<PointerPosition | null>(null);

  const customCollisionDetection: CollisionDetection = (args) => {
    const activeId = String(args.active.id);

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
      const ghostCollisions = pointerCollisions.filter((collision) =>
        String(collision.id).startsWith("ghost:")
      );
      if (ghostCollisions.length > 0) {
        return ghostCollisions;
      }

      const pageCollisions = pointerCollisions.filter(
        (collision) =>
          String(collision.id).startsWith("page:") &&
          String(collision.id) !== activeId
      );
      if (pageCollisions.length > 0) {
        return pageCollisions;
      }

      const sidebarCollisions = pointerCollisions.filter((collision) =>
        String(collision.id).startsWith("sidebar-document:")
      );
      if (sidebarCollisions.length > 0) {
        return sidebarCollisions;
      }

      const documentCollision = pointerCollisions.find((collision) =>
        String(collision.id).startsWith("document:")
      );

      if (documentCollision) {
        const targetContainerId = String(documentCollision.id).replace(
          "document:",
          ""
        );

        // A grid gap still belongs to the nearest real page in the same
        // document. Returning the parent container here used to reset the
        // drop to the end of the document.
        const targetPageContainers = args.droppableContainers.filter(
          (container) => {
            const data = container.data.current as
              | { type?: string; currentContainerId?: string }
              | undefined;

            return (
              String(container.id).startsWith("page:") &&
              String(container.id) !== activeId &&
              data?.type === "page" &&
              data.currentContainerId === targetContainerId
            );
          }
        );

        if (targetPageContainers.length > 0) {
          const nearestTargetPage = closestCenter({
            ...args,
            droppableContainers: targetPageContainers,
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
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (container) => String(container.id) !== activeId
        ),
      });
    }

    return [];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active, activatorEvent } = event;
    const activeId = String(active.id);

    if (!activeId.startsWith("page:")) {
      return;
    }

    const activeData = active.data.current as InternalPageDragData | undefined;
    if (!activeData || activeData.type !== "page") {
      return;
    }

    const pageId = activeData.pageId;
    setActiveDragPageId(pageId);
    selectPage(pageId, activeData.currentContainerId);

    const startCoordinates = getActivatorCoordinates(activatorEvent);
    pointerStartRef.current = startCoordinates;
    pointerPositionRef.current = startCoordinates;

    // Keep native operating-system file import isolated from dnd-kit page
    // movement.
    (window as any).isInternalDragging = true;
    (window as any).draggedPageId = pageId;
    (window as any).draggedPageContainerId = activeData.currentContainerId;
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const start = pointerStartRef.current;
    if (!start) {
      const translated = event.active.rect.current.translated;
      pointerPositionRef.current = translated
        ? {
            x: translated.left + translated.width / 2,
            y: translated.top + translated.height / 2,
          }
        : null;
      return;
    }

    pointerPositionRef.current = {
      x: start.x + event.delta.x,
      y: start.y + event.delta.y,
    };
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      updateProjectedDrop(null);
      return;
    }

    const overId = String(over.id);
    const activeData = active.data.current as InternalPageDragData | undefined;
    if (!activeData || activeData.type !== "page") {
      return;
    }

    const activePageId = activeData.pageId;
    const sourceContainerId = activeData.currentContainerId;

    // The pointer is over the visual ghost. Its registered insertion slot is
    // already the exact canonical destination; never reinterpret it as the
    // document end.
    if (overId.startsWith("ghost:")) {
      const ghostData = over.data.current as
        | { type?: string; containerId?: string; insertionSlot?: number }
        | undefined;

      if (
        ghostData?.type === "ghost" &&
        ghostData.containerId &&
        typeof ghostData.insertionSlot === "number"
      ) {
        updateProjectedDrop({
          activePageId,
          sourceContainerId,
          targetContainerId: ghostData.containerId,
          insertionSlot: ghostData.insertionSlot,
          placement:
            projectedDropRef.current?.placement ??
            (ghostData.insertionSlot === 0 ? "start" : "after"),
        });
      }
      return;
    }

    if (overId.startsWith("sidebar-document:")) {
      const targetContainerId = overId.replace("sidebar-document:", "");
      const targetDocument = documents.find(
        (document) => document.id === targetContainerId
      );

      if (targetDocument) {
        const basePages = getTargetBasePages({
          documents,
          activePageId,
          sourceContainerId,
          targetContainerId,
        });

        updateProjectedDrop({
          activePageId,
          sourceContainerId,
          targetContainerId,
          insertionSlot: basePages.length,
          placement: "end",
        });
      }
      return;
    }

    if (overId.startsWith("document:")) {
      const targetContainerId = overId.replace("document:", "");
      const basePages = getTargetBasePages({
        documents,
        activePageId,
        sourceContainerId,
        targetContainerId,
      });

      if (basePages.length === 0) {
        updateProjectedDrop({
          activePageId,
          sourceContainerId,
          targetContainerId,
          insertionSlot: 0,
          placement: "empty",
        });
        return;
      }

      // For a non-empty document, the parent container covers headers and all
      // grid whitespace. Resetting to `basePages.length` here was the main
      // cause of pages landing at the end. Preserve the last exact slot in the
      // same target document instead.
      if (projectedDropRef.current?.targetContainerId === targetContainerId) {
        return;
      }

      // Wait until collision detection resolves a real page in this document.
      // This avoids guessing an insertion position from a large container.
      updateProjectedDrop(null);
      return;
    }

    if (!overId.startsWith("page:")) {
      return;
    }

    const overPageId = overId.replace("page:", "");
    const overData = over.data.current as
      | { type?: string; currentContainerId?: string }
      | undefined;

    const targetContainerId =
      overData?.currentContainerId ??
      documents.find((document) =>
        document.pages.some((page) => page.id === overPageId)
      )?.id;

    if (!targetContainerId) {
      return;
    }

    const targetBasePages = getTargetBasePages({
      documents,
      activePageId,
      sourceContainerId,
      targetContainerId,
    });

    const overIndex = targetBasePages.findIndex(
      (page) => page.id === overPageId
    );

    if (overIndex === -1) {
      return;
    }

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

    let placement: "before" | "after" = "before";

    if (pointer) {
      // Vertical position disambiguates wrapped grid rows. Inside the same row,
      // use the actual pointer position rather than the DragOverlay midpoint.
      if (pointer.y < overRect.top) {
        placement = "before";
      } else if (pointer.y > overRect.bottom) {
        placement = "after";
      } else {
        const relativeX = (pointer.x - overRect.left) / overRect.width;
        const previous = projectedDropRef.current;

        if (
          relativeX >= 0.45 &&
          relativeX <= 0.55 &&
          previous?.targetContainerId === targetContainerId &&
          previous.overPageId === overPageId &&
          (previous.placement === "before" || previous.placement === "after")
        ) {
          placement = previous.placement;
        } else {
          placement = relativeX < 0.5 ? "before" : "after";
        }
      }
    }

    const insertionSlot = getInsertionSlotForPlacement({
      pages: targetBasePages,
      placement,
      overPageId,
    });

    if (insertionSlot === null) return;

    updateProjectedDrop({
      activePageId,
      sourceContainerId,
      targetContainerId,
      insertionSlot,
      overPageId,
      placement,
    });
  };

  const clearDragState = () => {
    setActiveDragPageId(null);
    updateProjectedDrop(null);
    pointerStartRef.current = null;
    pointerPositionRef.current = null;
    (window as any).isInternalDragging = false;
    (window as any).draggedPageId = null;
    (window as any).draggedPageContainerId = null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const finalDrop = projectedDropRef.current;
    const hasValidOverTarget = event.over !== null;

    clearDragState();

    if (!finalDrop || !hasValidOverTarget) {
      return;
    }

    movePage(
      finalDrop.activePageId,
      finalDrop.sourceContainerId,
      finalDrop.targetContainerId,
      finalDrop.insertionSlot
    );
  };

  const handleDragCancel = () => {
    clearDragState();
  };

  const renderDragOverlay = () => {
    if (!activeDragPageId) return null;
    
    let activePage: any = null;
    let parentDoc: any = null;
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
      <div className="w-[110px] aspect-[1/1.41] rounded-xl border border-blue-bright bg-[#0c0f17]/95 flex flex-col items-center justify-between p-2 shadow-2xl relative select-none text-primary-text pointer-events-none z-50">
        <div className="w-full flex items-center justify-between gap-1 mb-1 px-0.5">
          <span className="text-[9px] font-extrabold text-blue-bright uppercase tracking-wider truncate max-w-[55px]">
            Page {activePage.pageNumber}
          </span>
          <Move className="w-2.5 h-2.5 text-blue-bright" />
        </div>
        
        {activePage.thumbnailStatus === "ready" && activePage.thumbnailUrl ? (
          <img 
            src={activePage.thumbnailUrl} 
            className="w-full h-[65px] object-contain rounded-lg opacity-90 select-none" 
            referrerPolicy="no-referrer" 
            draggable={false}
          />
        ) : (
          <div className="w-full h-[65px] bg-panel-elevated/20 rounded-lg flex items-center justify-center text-muted-text text-[9px] uppercase font-bold tracking-wider">
            Page
          </div>
        )}
        
        <div className="mt-1 w-full bg-blue-bright/10 rounded-md py-0.5 flex items-center justify-center gap-1">
          <span className="text-[8px] font-extrabold text-blue-bright uppercase tracking-wider">Move page</span>
        </div>
      </div>
    );
  };

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
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07080a] text-primary-text font-sans selection:bg-blue-accent/30">
        
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
        />

        {/* 2. Main Workspace Layout */}
        <div className="flex-grow flex min-h-0 w-full relative">
          
          {/* Left Side: Documents Sidebar Column (Desktop Only) */}
          {isDesktop && isLeftSidebarOpen && (
            <div 
              style={{ width: isLargeDesktop ? "280px" : "240px" }}
              className="h-full flex-shrink-0 transition-all duration-200"
            >
              <DocumentsSidebar
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={selectDocument}
                onRemoveDocument={removeDocument}
                onAddPDFs={handleTriggerFilePicker}
              />
            </div>
          )}

          {/* Center Canvas (Main Stage - Always Rendered) */}
          <WorkspaceCanvas
            documents={documents}
            onRemoveDocument={removeDocument}
            onUpdatePageThumbnail={updatePageThumbnail}
            importFiles={importFiles}
            onTriggerFilePicker={handleTriggerFilePicker}
            selectedPageId={selectedPageId}
            onSelectPage={selectPage}
            onOpenPageViewer={openPageViewer}
            onClearPageSelection={clearPageSelection}
            activeDragPageId={activeDragPageId}
            projectedTarget={projectedDrop}
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
                selectedPageId={selectedPageId}
                onOpenPageViewer={openPageViewer}
                onMovePage={movePage}
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
                onSelectDocument={selectDocument}
                onRemoveDocument={removeDocument}
                onAddPDFs={handleTriggerFilePicker}
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
                selectedPageId={selectedPageId}
                onOpenPageViewer={openPageViewer}
                onMovePage={movePage}
              />
            </WorkspaceDrawer>
          )}
        </div>

        {/* Bottom Floating Control Bar (Mobile-specific helper triggers for accessibility) */}
        {isMobile && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-panel-elevated/90 backdrop-blur-md border border-border-main rounded-2xl py-2 px-3 flex gap-2 shadow-2xl items-center pointer-events-auto">
            <button
              onClick={() => {
                setIsLeftSidebarOpen(!isLeftSidebarOpen);
                if (!isLeftSidebarOpen) setIsRightSidebarOpen(false);
              }}
              aria-label="Toggle Documents menu"
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer ${
                isRightSidebarOpen 
                  ? "bg-blue-accent/20 text-blue-bright border border-blue-accent/30" 
                  : "text-muted-text hover:text-primary-text border border-transparent"
              }`}
            >
              Inspect
            </button>
          </div>
        )}

        {/* Dialog Modal Viewer for Full-Screen PDF Interactive Pages */}
        <PageViewerDialog
          isOpen={viewerOpen}
          onClose={closePageViewer}
          pageId={viewerPageId}
          documentId={viewerDocumentId}
          documents={documents}
          onPageChange={setViewerPage}
        />
      </div>
      
      <DragOverlay dropAnimation={null}>
        {renderDragOverlay()}
      </DragOverlay>
    </DndContext>
  );
};
