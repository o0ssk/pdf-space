import React, { useCallback, useMemo } from "react";
import { Loader2, AlertTriangle, ShieldAlert, Download } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  WorkspaceDocument,
  WorkspacePage,
  PageRotation,
  ThumbnailStatus,
  ProjectedPageDrop,
  PageSelectionModifiers,
} from "../../types/workspace";
import { PageThumbnail } from "./PageThumbnail";
import { ProjectedPageGhost } from "./ProjectedPageGhost";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import {
  buildCrossContainerProjectedItems,
  buildSameContainerProjectedItems,
} from "../../lib/workspace/dndProjection";
import { WorkspaceDocumentNameValidation } from "../../lib/workspace/documentOperations";
import { DocumentNameEditor } from "./DocumentNameEditor";
import { DocumentActionsMenu } from "./DocumentActionsMenu";
import {
  motionDurations,
  motionEasings,
  reducedMotionTransition,
} from "../../lib/motion/motionSystem";

type DocumentGroupProps = {
  document: WorkspaceDocument;
  onDeleteDocument: (id: string) => void;
  onDuplicateDocument: (id: string) => void;
  canDeleteDocument: boolean;
  documentActionsDisabled: boolean;
  onUpdatePageThumbnail: (
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string,
    expectedRotation?: PageRotation
  ) => boolean;
  selectedPageIds: readonly string[];
  activeSelectedPageId: string | null;
  viewerPageId: string | null;
  onSelectPage: (
    pageId: string,
    documentId: string,
    modifiers?: PageSelectionModifiers
  ) => void;
  onOpenPageViewer: (pageId: string, documentId: string) => void;
  onExportDocument: (documentId: string) => void;
  activeDragPageId: string | null;
  projectedTarget: ProjectedPageDrop | null;
  activePage: WorkspacePage | null;
  onRenameDocument: (
    id: string,
    name: string
  ) => WorkspaceDocumentNameValidation;
  isRenaming: boolean;
  onStartRename: (id: string) => void;
  onStopRename: () => void;
  registerDocumentElement: (
    documentId: string,
    element: HTMLElement | null
  ) => void;
  registerPageElement: (pageId: string, element: HTMLElement | null) => void;
  highlightedDocumentId: string | null;
  highlightedPageId: string | null;
  isActiveDocument: boolean;
};

type DocumentDropFrameProps = {
  documentId: string;
  documentName: string;
  activeDragPageId: string | null;
  isTargetDocument: boolean;
  renderedItemCount: number;
  registerDocumentElement: (
    documentId: string,
    element: HTMLElement | null
  ) => void;
  isNavigationHighlighted: boolean;
  children: React.ReactNode;
};

const DocumentDropFrame: React.FC<DocumentDropFrameProps> = ({
  documentId,
  documentName,
  activeDragPageId,
  isTargetDocument,
  renderedItemCount,
  registerDocumentElement,
  isNavigationHighlighted,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `document:${documentId}`,
    data: { type: "container", containerId: documentId },
  });
  const isGroupOver = isOver && activeDragPageId !== null;
  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      registerDocumentElement(documentId, node);
    },
    [documentId, registerDocumentElement, setNodeRef]
  );

  return (
    <section
      ref={combinedRef}
      tabIndex={-1}
      aria-label={`Document group for ${documentName}`}
      className={`document-stage w-full overflow-hidden px-3 py-4 sm:px-5 sm:py-5 flex flex-col gap-5 relative scroll-mt-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright transition-[border-color,background-color] duration-200 ${
        isNavigationHighlighted
          ? "is-navigation-highlighted"
          : isGroupOver && renderedItemCount === 0
          ? "is-empty-drop-target"
          : isTargetDocument
            ? "is-drop-target"
            : ""
      }`}
      id={`document-group-${documentId}`}
    >
      {children}
    </section>
  );
};

// Formats file sizes into human-readable labels
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

const DocumentGroupComponent: React.FC<DocumentGroupProps> = ({
  document: doc,
  onDeleteDocument,
  onDuplicateDocument,
  canDeleteDocument,
  documentActionsDisabled,
  onUpdatePageThumbnail,
  selectedPageIds,
  activeSelectedPageId,
  viewerPageId,
  onSelectPage,
  onOpenPageViewer,
  onExportDocument,
  activeDragPageId,
  projectedTarget,
  activePage,
  onRenameDocument,
  isRenaming,
  onStartRename,
  onStopRename,
  registerDocumentElement,
  registerPageElement,
  highlightedDocumentId,
  highlightedPageId,
  isActiveDocument,
}) => {
  const reduceMotion = useReducedMotion();
  const isLargeDoc = doc.pageCount >= 100;
  const isTargetDoc = projectedTarget?.targetContainerId === doc.id;
  const isSameContainerDrag = Boolean(
    activePage &&
      activeDragPageId === activePage.id &&
      projectedTarget &&
      projectedTarget.sourceContainerId === doc.id &&
      projectedTarget.targetContainerId === doc.id
  );
  const isCrossContainerTarget = Boolean(
    activePage &&
      activeDragPageId === activePage.id &&
      projectedTarget &&
      projectedTarget.sourceContainerId !== projectedTarget.targetContainerId &&
      projectedTarget.targetContainerId === doc.id
  );

  const renderedItems = useMemo(() => {
    if (activePage && projectedTarget && isSameContainerDrag) {
      return buildSameContainerProjectedItems({
        pages: doc.pages,
        activePageId: activePage.id,
        insertionSlot: projectedTarget.insertionSlot,
      });
    }

    if (activePage && projectedTarget && isCrossContainerTarget) {
      return buildCrossContainerProjectedItems({
        pages: doc.pages,
        activePage,
        targetContainerId: doc.id,
        insertionSlot: projectedTarget.insertionSlot,
      });
    }

    return doc.pages.map((page) => ({
      type: "page" as const,
      id: page.id,
      page,
    }));
  }, [
    activePage,
    doc.id,
    doc.pages,
    isCrossContainerTarget,
    isSameContainerDrag,
    projectedTarget,
  ]);
  const sortablePageIds = useMemo(
    () =>
      doc.pages
        .filter(
          (page) => !isSameContainerDrag || page.id !== activeDragPageId
        )
        .map((page) => `page:${page.id}`),
    [activeDragPageId, doc.pages, isSameContainerDrag]
  );
  const selectedPageIdSet = useMemo(
    () => new Set(selectedPageIds),
    [selectedPageIds]
  );

  if (
    import.meta.env.DEV &&
    isSameContainerDrag &&
    renderedItems.length !== doc.pages.length
  ) {
    console.warn("[DND] Invalid same-container projected cell count", {
      realPageCount: doc.pages.length,
      projectedCellCount: renderedItems.length,
      activePageId: activeDragPageId,
      insertionSlot: projectedTarget?.insertionSlot,
    });
  }

  return (
    <DocumentDropFrame
      documentId={doc.id}
      documentName={doc.name}
      activeDragPageId={activeDragPageId}
      isTargetDocument={isTargetDoc}
      renderedItemCount={renderedItems.length}
      registerDocumentElement={registerDocumentElement}
      isNavigationHighlighted={highlightedDocumentId === doc.id}
    >
      <div className="document-stage-header flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <motion.span
            aria-hidden="true"
            className="mt-0.5 h-9 w-0.5 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: doc.color }}
            initial={false}
            animate={{
              opacity: isActiveDocument || isTargetDoc ? 1 : 0.72,
              scaleY: isTargetDoc && !reduceMotion ? 1.12 : 1,
            }}
            transition={
              reduceMotion
                ? reducedMotionTransition
                : {
                    duration: motionDurations.quick,
                    ease: motionEasings.enter,
                  }
            }
          />
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.025em] text-primary-text sm:text-[15px]">
              <DocumentNameEditor
                document={doc}
                isEditing={isRenaming}
                onStartEditing={() => onStartRename(doc.id)}
                onStopEditing={onStopRename}
                onRename={onRenameDocument}
                variant="header"
              />
            </h3>
            <div className="studio-number mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-medium text-muted-text">
              {doc.size > 0 && <span>{formatBytes(doc.size)}</span>}
              {doc.size > 0 && <span className="h-3 w-px bg-white/10" aria-hidden="true" />}
              <span>{doc.pages.length} {doc.pages.length === 1 ? "page" : "pages"}</span>
              {doc.status === "ready" && isLargeDoc && (
                <>
                  <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                  <span className="text-amber-400 font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Large document
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="document-command-plane flex items-center gap-1.5 sm:self-center">
          {doc.status === "loading" && (
            <div className="flex min-h-10 items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-blue-bright">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              <span>Reading PDF…</span>
            </div>
          )}

          {doc.status === "error" && (
            <div className="flex min-h-10 items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-red-400">
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Error</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onExportDocument(doc.id)}
            disabled={doc.status !== "ready" || doc.pages.length === 0}
            title={
              doc.pages.length === 0
                ? "Add pages before exporting"
                : `Export "${doc.name}"`
            }
            aria-label={`Export this document: ${doc.name}`}
            className="studio-interactive flex min-h-10 items-center gap-2 rounded-[8px] border border-transparent px-3 py-1.5 text-[11.5px] font-semibold text-secondary-text enabled:hover:border-blue-bright/20 enabled:hover:bg-blue-accent/[0.08] enabled:hover:text-blue-bright enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Export this document</span>
          </button>

          <DocumentActionsMenu
            document={doc}
            canDelete={canDeleteDocument}
            actionsDisabled={
              documentActionsDisabled || doc.status === "loading"
            }
            onRename={() => onStartRename(doc.id)}
            onDuplicate={() => onDuplicateDocument(doc.id)}
            onDelete={() => onDeleteDocument(doc.id)}
            surface="canvas"
          />
        </div>
      </div>

      {/* Large Document Informative Progress Notice */}
      {doc.status === "ready" && isLargeDoc && (
        <div className="px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-300 text-[11.5px] leading-relaxed flex gap-2.5 items-start">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-extrabold">Large document detected ({doc.pageCount} pages)</p>
            <p className="opacity-80 mt-0.5 font-medium">To protect your browser's memory, thumbnails will load progressively as you scroll.</p>
          </div>
        </div>
      )}

      <div className="relative flex min-h-[140px] items-center justify-center">
        {doc.status === "loading" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-text select-none">
            <Loader2 className="w-8 h-8 animate-spin text-blue-bright" />
            <p className="text-[12.5px] font-bold">Creating page previews…</p>
            <p className="text-[11px] opacity-70">The PDF is being processed locally in this browser.</p>
          </div>
        )}

        {doc.status === "error" && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center max-w-md mx-auto gap-3 text-red-400 select-none">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <p className="text-[13px] font-bold tracking-wide">{doc.errorMessage || "Unable to open PDF"}</p>
            <p className="text-[11px] text-muted-text leading-relaxed">
              Ensure the PDF file is not password-protected, corrupted, or larger than your device's available memory.
            </p>
          </div>
        )}

        {doc.status === "ready" && renderedItems.length === 0 && (
          <div
            className={`document-empty-stage flex w-full flex-col items-center justify-center gap-4 py-11 text-center transition-[border-color,background-color] duration-200 ${
              isTargetDoc && activeDragPageId
                ? "is-target text-blue-bright"
                : "text-muted-text"
            }`}
          >
            <div className="empty-paper-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-secondary-text">Drop pages here</p>
              <p className="mx-auto mt-1 max-w-[250px] text-[11.5px] font-medium leading-relaxed text-muted-text">
                Drag pages here, or use Move and Copy from the command dock.
              </p>
            </div>
          </div>
        )}

        {doc.status === "ready" && renderedItems.length > 0 && (
          <SortableContext items={sortablePageIds} strategy={rectSortingStrategy}>
            <div 
              className="workspace-page-grid grid w-full justify-items-center gap-x-5 gap-y-8"
              role="list"
            >
              {renderedItems.map((item) => {
                const isGhost = item.type === "ghost";
                const page = item.page;

                return (
                  <div key={item.id} role="listitem">
                    {isGhost ? (
                      <ProjectedPageGhost
                        page={page}
                        containerId={doc.id}
                        insertionSlot={item.insertionSlot}
                        docColor={doc.color}
                      />
                    ) : (
                      <PageThumbnail
                        pageId={page.id}
                        documentId={page.documentId}
                        sourceDocumentId={page.sourceDocumentId}
                        originalPageIndex={page.originalPageIndex}
                        rotation={page.rotation}
                        pageNumber={page.pageNumber}
                        thumbnailStatus={page.thumbnailStatus}
                        thumbnailUrl={page.thumbnailUrl}
                        docColor={doc.color}
                        docName={doc.name}
                        errorMessage={page.errorMessage}
                        onStatusChange={onUpdatePageThumbnail}
                        isSelected={selectedPageIdSet.has(page.id)}
                        isActive={page.id === activeSelectedPageId}
                        isViewerPage={page.id === viewerPageId}
                        onSelect={onSelectPage}
                        onOpenViewer={onOpenPageViewer}
                        activeDragPageId={activeDragPageId}
                        registerPageElement={registerPageElement}
                        isNavigationHighlighted={highlightedPageId === page.id}
                        isActiveDocument={isActiveDocument}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>
        )}
      </div>
    </DocumentDropFrame>
  );
};

export const DocumentGroup = React.memo(DocumentGroupComponent);
