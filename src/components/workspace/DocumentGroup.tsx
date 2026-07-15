import React from "react";
import { FileText, Trash2, Loader2, AlertTriangle, ShieldAlert, Move } from "lucide-react";
import { WorkspaceDocument, ThumbnailStatus, ProjectedPageDrop } from "../../types/workspace";
import { PageThumbnail } from "./PageThumbnail";
import { ProjectedPageGhost } from "./ProjectedPageGhost";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";

type DocumentGroupProps = {
  document: WorkspaceDocument;
  onRemove: (id: string) => void;
  onUpdatePageThumbnail: (
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string
  ) => boolean;
  selectedPageId: string | null;
  onSelectPage: (pageId: string, documentId: string) => void;
  onOpenPageViewer: (pageId: string, documentId: string) => void;
  onClearPageSelection: () => void;
  activeDragPageId: string | null;
  projectedTarget: ProjectedPageDrop | null;
  allDocuments?: WorkspaceDocument[];
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

export const DocumentGroup: React.FC<DocumentGroupProps> = ({
  document: doc,
  onRemove,
  onUpdatePageThumbnail,
  selectedPageId,
  onSelectPage,
  onOpenPageViewer,
  onClearPageSelection,
  activeDragPageId,
  projectedTarget,
  allDocuments,
}) => {
  const isLargeDoc = doc.pageCount >= 100;

  const { setNodeRef, isOver } = useDroppable({
    id: `document:${doc.id}`,
    data: {
      type: "document",
      documentId: doc.id,
    },
  });

  const isGroupOver = isOver && activeDragPageId !== null;
  const isTargetDoc = projectedTarget && projectedTarget.targetContainerId === doc.id;

  const activePage = activeDragPageId
    ? allDocuments?.flatMap((d) => d.pages).find((p) => p.id === activeDragPageId)
    : null;

  // Derive visual items for rendering
  let renderedItems: (
    | { type: "page"; id: string; page: typeof doc.pages[0]; isGhost?: boolean }
    | { type: "ghost"; id: string; page: any; isGhost: boolean }
  )[] = [];

  if (activePage && isTargetDoc) {
    const basePages = activePage.documentId === doc.id
      ? doc.pages.filter((p) => p.id !== activePage.id)
      : doc.pages;

    const slot = Math.max(0, Math.min(projectedTarget.insertionSlot, basePages.length));

    renderedItems = [
      ...basePages.slice(0, slot).map((p) => ({
        type: "page" as const,
        id: p.id,
        page: p,
      })),
      {
        type: "ghost" as const,
        id: `ghost:${activePage.id}`,
        page: activePage,
        isGhost: true,
      },
      ...basePages.slice(slot).map((p) => ({
        type: "page" as const,
        id: p.id,
        page: p,
      })),
    ];
  } else {
    renderedItems = doc.pages.map((p) => ({
      type: "page" as const,
      id: p.id,
      page: p,
    }));
  }

  return (
    <section 
      ref={setNodeRef}
      aria-label={`Document group for ${doc.name}`}
      className={`w-full bg-panel-elevated/10 border rounded-2xl p-4 sm:p-5 flex flex-col gap-5 shadow-lg relative scroll-mt-20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-bright transition-all duration-300 ${
        isGroupOver && renderedItems.length === 0
          ? "border-blue-bright bg-blue-bright/[0.04] shadow-[0_0_25px_rgba(0,245,255,0.08)] scale-[1.005]"
          : isTargetDoc
            ? "border-blue-bright/20 bg-blue-bright/[0.005]"
            : "border-white/5"
      }`}
      id={`document-group-${doc.id}`}
    >
      {/* 1. Group Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        {/* Color Accent, Doc Logo, Name, Size & Pages Count */}
        <div className="flex items-start gap-3 min-w-0">
          <div 
            className="w-3.5 h-3.5 rounded-full mt-1.5 flex-shrink-0 shadow-sm"
            style={{ backgroundColor: doc.color }}
          />
          <div className="min-w-0">
            <h3 className="text-[14px] sm:text-[15px] font-extrabold text-primary-text tracking-tight truncate flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-text flex-shrink-0" />
              <span className="truncate">{doc.name}</span>
            </h3>
            <div className="flex items-center gap-2.5 text-[11px] text-muted-text font-bold uppercase tracking-wider mt-1.5">
              <span>{formatBytes(doc.size)}</span>
              <span className="w-1 h-1 bg-white/10 rounded-full" />
              <span>{doc.pages.length} {doc.pages.length === 1 ? "page" : "pages"}</span>
              {doc.status === "ready" && isLargeDoc && (
                <>
                  <span className="w-1 h-1 bg-white/10 rounded-full" />
                  <span className="text-amber-400 font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Large Doc
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Document Status Indicators */}
        <div className="flex items-center gap-3 sm:self-center">
          {doc.status === "loading" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-panel-elevated/40 text-blue-bright text-[11px] font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Reading PDF...</span>
            </div>
          )}

          {doc.status === "error" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[11px] font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Error</span>
            </div>
          )}

          {/* Remove Button */}
          <button
            onClick={() => onRemove(doc.id)}
            title={`Remove "${doc.name}" from workspace`}
            aria-label={`Remove document "${doc.name}"`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-muted-text hover:text-red-400 text-[11.5px] font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
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

      {/* 2. Grid Area / Loading Skeletons / Page Failure State / Empty State */}
      <div className="relative min-h-[140px] flex items-center justify-center">
        {doc.status === "loading" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-text select-none">
            <Loader2 className="w-8 h-8 animate-spin text-blue-bright" />
            <p className="text-[12.5px] font-bold tracking-wide">Allocating client sandbox memory...</p>
            <p className="text-[11px] opacity-70">All operations are private and executed locally in your browser.</p>
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
            className={`w-full py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center gap-3 transition-all duration-300 ${
              isGroupOver 
                ? "border-blue-bright bg-blue-bright/5 text-blue-bright shadow-[0_0_15px_rgba(0,245,255,0.1)]" 
                : "border-white/10 bg-white/5/20 text-muted-text hover:border-white/15"
            }`}
          >
            <Move className={`w-8 h-8 ${isGroupOver ? "animate-bounce" : ""}`} />
            <div>
              <p className="text-[13px] font-bold">This document group is empty</p>
              <p className="text-[11.5px] text-muted-text mt-1 max-w-[240px] mx-auto font-medium leading-relaxed">
                Drop page here
              </p>
            </div>
          </div>
        )}

        {doc.status === "ready" && renderedItems.length > 0 && (
          <SortableContext
            items={renderedItems
              .filter((item) => item.type === "page")
              .map((item) => `page:${item.id}`)}
            strategy={rectSortingStrategy}
          >
            <div 
              className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6 justify-items-center"
              role="list"
            >
              {renderedItems.map((item, idx) => {
                const isGhost = item.type === "ghost";
                const page = item.page;

                return (
                  <div key={item.id} role="listitem">
                    {isGhost ? (
                      <ProjectedPageGhost
                        page={page}
                        containerId={doc.id}
                        insertionSlot={projectedTarget?.insertionSlot ?? idx}
                        docColor={doc.color}
                      />
                    ) : (
                      <PageThumbnail
                        pageId={page.id}
                        documentId={page.documentId}
                        sourceDocumentId={page.sourceDocumentId}
                        originalPageIndex={page.originalPageIndex}
                        pageNumber={page.pageNumber}
                        thumbnailStatus={page.thumbnailStatus}
                        thumbnailUrl={page.thumbnailUrl}
                        docColor={doc.color}
                        docName={doc.name}
                        errorMessage={page.errorMessage}
                        onStatusChange={onUpdatePageThumbnail}
                        isSelected={page.id === selectedPageId}
                        onSelect={onSelectPage}
                        onOpenViewer={onOpenPageViewer}
                        onClearSelection={onClearPageSelection}
                        activeDragPageId={activeDragPageId}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>
        )}
      </div>
    </section>
  );
};
