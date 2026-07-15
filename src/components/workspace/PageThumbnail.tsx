import React from "react";
import { Loader2, AlertCircle, Check, Eye } from "lucide-react";
import { usePageThumbnail } from "../../hooks/usePageThumbnail";
import { ThumbnailStatus } from "../../types/workspace";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type PageThumbnailProps = {
  pageId: string;
  documentId: string;
  sourceDocumentId: string;
  originalPageIndex: number;
  pageNumber: number;
  thumbnailStatus: ThumbnailStatus;
  thumbnailUrl?: string;
  docColor: string;
  docName: string;
  errorMessage?: string;
  onStatusChange: (
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string
  ) => boolean;
  isSelected?: boolean;
  onSelect?: (pageId: string, documentId: string) => void;
  onOpenViewer?: (pageId: string, documentId: string) => void;
  onClearSelection?: () => void;
  activeDragPageId?: string | null;
};

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  pageId,
  documentId,
  sourceDocumentId,
  originalPageIndex,
  pageNumber,
  thumbnailStatus,
  thumbnailUrl,
  docColor,
  docName,
  errorMessage,
  onStatusChange,
  isSelected = false,
  onSelect,
  onOpenViewer,
  onClearSelection,
  activeDragPageId = null,
}) => {
  const { containerRef } = usePageThumbnail({
    pageId,
    sourceDocumentId,
    originalPageIndex,
    thumbnailStatus,
    onStatusChange,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `page:${pageId}`,
    disabled: thumbnailStatus === "error",
    data: {
      type: "page",
      pageId,
      currentContainerId: documentId,
      sourceIndex: originalPageIndex,
    },
  });

  const isCurrentDragging = isDragging || activeDragPageId === pageId;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrentDragging) return;
    onSelect?.(pageId, documentId);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrentDragging) return;
    onOpenViewer?.(pageId, documentId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isCurrentDragging) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onOpenViewer?.(pageId, documentId);
    } else if (e.key === " ") {
      e.preventDefault();
      onSelect?.(pageId, documentId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClearSelection?.();
    }
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent re-triggering select
    if (isCurrentDragging) return;
    onOpenViewer?.(pageId, documentId);
  };

  const combinedRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    setNodeRef(node);
  };

  return (
    <div
      ref={combinedRef}
      style={style}
      className={`relative flex flex-col items-center p-1 transition-opacity duration-200 ${
        isCurrentDragging ? "opacity-35 select-none pointer-events-none" : "group"
      }`}
      id={`page-container-${pageId}`}
      {...attributes}
      {...listeners}
    >
      <div className="relative">
        {/* Main Selection Wrapper to make the card fully interactive, accessible, and draggable */}
        <div
          role="button"
          tabIndex={isCurrentDragging ? -1 : 0}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          aria-label={`Select page ${pageNumber} of ${docName}`}
          className={`w-[140px] sm:w-[150px] aspect-[1/1.41] rounded-xl bg-panel-elevated/40 border text-left overflow-hidden flex flex-col items-center justify-center relative transition-all duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer select-none ${
            isSelected && !isCurrentDragging
              ? "border-blue-bright shadow-[0_0_20px_rgba(0,245,255,0.15)]"
              : "border-white/5 group-hover:border-white/15"
          }`}
          style={{
            borderLeftWidth: "4px",
            borderLeftColor: docColor,
          }}
        >
          {/* State Indicators */}
          {thumbnailStatus === "idle" && (
            <div className="absolute inset-0 bg-panel-elevated/20 animate-pulse flex items-center justify-center text-muted-text/30" aria-hidden="true">
              <span className="text-[9px] font-bold uppercase tracking-wider">Queueing</span>
            </div>
          )}

          {thumbnailStatus === "rendering" && (
            <div className="absolute inset-0 bg-panel-elevated/30 flex flex-col items-center justify-center gap-1.5 text-muted-text/50" aria-hidden="true">
              <Loader2 className="w-4.5 h-4.5 animate-spin text-blue-bright" />
              <span className="text-[8.5px] font-bold uppercase tracking-wider">Rendering</span>
            </div>
          )}

          {thumbnailStatus === "error" && (
            <div className="absolute inset-0 bg-red-500/5 flex flex-col items-center justify-center p-2.5 text-center gap-1.5 text-red-400" title={errorMessage}>
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span className="text-[8.5px] font-bold uppercase tracking-wider">Failed</span>
            </div>
          )}

          {thumbnailStatus === "ready" && thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={`Page ${pageNumber} of ${docName}`}
              referrerPolicy="no-referrer"
              draggable={false}
              className="w-full h-full object-contain select-none"
            />
          )}

          {/* Selected Indicator Corner Badge */}
          {isSelected && !isCurrentDragging && (
            <div className="absolute top-2 right-2 w-5.5 h-5.5 rounded-full bg-blue-bright text-[#07080a] flex items-center justify-center shadow-lg transition-transform duration-200">
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </div>
          )}
        </div>

        {/* Floating Quick Action Button - Visible only on Selection, perfectly positioned and avoids nested buttons */}
        {isSelected && !isCurrentDragging && (
          <button
            type="button"
            onClick={handleOpenClick}
            aria-label={`Open page ${pageNumber} of ${docName}`}
            title={`Open page ${pageNumber} of ${docName}`}
            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-panel-elevated/90 hover:bg-panel-elevated border border-white/10 hover:border-blue-bright text-muted-text hover:text-blue-bright shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Footer page number indicator */}
      <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-secondary-text select-none">
        <span className="text-muted-text text-[10px] uppercase font-mono tracking-wide">P.</span>
        <span className={isSelected && !isCurrentDragging ? "text-blue-bright font-extrabold" : ""}>{pageNumber}</span>
      </div>
    </div>
  );
};
