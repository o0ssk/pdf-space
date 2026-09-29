import React, { useCallback } from "react";
import { AlertCircle, Check, Eye } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { usePageThumbnail } from "../../hooks/usePageThumbnail";
import {
  PageSelectionModifiers,
  PageRotation,
  ThumbnailStatus,
} from "../../types/workspace";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motionSprings, reducedMotionTransition } from "../../lib/motion/motionSystem";

type PageThumbnailProps = {
  pageId: string;
  documentId: string;
  sourceDocumentId: string;
  originalPageIndex: number;
  rotation: PageRotation;
  pageNumber: number;
  thumbnailStatus: ThumbnailStatus;
  thumbnailUrl?: string | undefined;
  docColor: string;
  docName: string;
  errorMessage?: string | undefined;
  onStatusChange: (
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string,
    expectedRotation?: PageRotation
  ) => boolean;
  isSelected?: boolean;
  isActive?: boolean;
  isViewerPage?: boolean;
  onSelect?: (
    pageId: string,
    documentId: string,
    modifiers?: PageSelectionModifiers
  ) => void;
  onOpenViewer?: (pageId: string, documentId: string) => void;
  activeDragPageId?: string | null;
  registerPageElement?: (pageId: string, element: HTMLElement | null) => void;
  isNavigationHighlighted?: boolean;
  isActiveDocument?: boolean;
};

const PageThumbnailComponent: React.FC<PageThumbnailProps> = ({
  pageId,
  documentId,
  sourceDocumentId,
  originalPageIndex,
  rotation,
  pageNumber,
  thumbnailStatus,
  thumbnailUrl,
  docColor,
  docName,
  errorMessage,
  onStatusChange,
  isSelected = false,
  isActive = false,
  isViewerPage = false,
  onSelect,
  onOpenViewer,
  activeDragPageId = null,
  registerPageElement,
  isNavigationHighlighted = false,
  isActiveDocument = false,
}) => {
  const reduceMotion = useReducedMotion();
  const { containerRef } = usePageThumbnail({
    pageId,
    sourceDocumentId,
    originalPageIndex,
    rotation,
    thumbnailStatus,
    isActiveDocument,
    onStatusChange,
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `page:${pageId}`,
      disabled: thumbnailStatus === "error",
      data: {
        type: "page",
        pageId,
        containerId: documentId,
        index: pageNumber - 1,
      },
    });
  const isCurrentDragging = isDragging || activeDragPageId === pageId;
  const isLandscape = rotation === 90 || rotation === 270;
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      setNodeRef(node);
      registerPageElement?.(pageId, node);
    },
    [containerRef, pageId, registerPageElement, setNodeRef]
  );
  const { onKeyDown: onDndKeyDown, ...pointerListeners } = listeners ?? {};
  const folio = String(pageNumber).padStart(2, "0");

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isCurrentDragging) return;
    const additive = event.ctrlKey || event.metaKey;
    onSelect?.(pageId, documentId, {
      toggle: additive && !event.shiftKey,
      range: event.shiftKey,
      preserveExisting: additive && event.shiftKey,
    });
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isCurrentDragging) return;
    onOpenViewer?.(pageId, documentId);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isCurrentDragging) return;
    if (event.key === "Enter") {
      event.preventDefault();
      onOpenViewer?.(pageId, documentId);
      return;
    }

    onDndKeyDown?.(event);
  };

  const handleSelectionControlClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (isCurrentDragging) return;
    onSelect?.(pageId, documentId, { toggle: true });
  };

  const handleSelectionControlKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    if (isCurrentDragging) return;
    onSelect?.(pageId, documentId, { toggle: true });
  };

  const handleOpenControlClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (isCurrentDragging) return;
    onOpenViewer?.(pageId, documentId);
  };

  return (
    <div
      ref={combinedRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        willChange: transform || isCurrentDragging ? "transform" : undefined,
      }}
      className={`precision-page-cell group relative flex justify-center ${
        isNavigationHighlighted ? "is-navigation-highlighted" : ""
      } ${isCurrentDragging ? "is-drag-source" : ""}`}
      id={`page-container-${pageId}`}
      data-page-id={pageId}
      data-container-id={documentId}
      data-page-selected={isSelected ? "true" : "false"}
      data-page-active={isActive ? "true" : "false"}
      data-page-orientation={isLandscape ? "landscape" : "portrait"}
    >
      <motion.div
        className={`precision-page-object ${
          isSelected ? "is-selected" : ""
        } ${isActive && isSelected ? "is-active-selected" : ""} ${
          isViewerPage ? "is-viewer-page" : ""
        }`}
        initial={false}
        animate={{
          y: reduceMotion || isCurrentDragging ? 0 : isActive && isSelected ? -4 : isSelected ? -2 : 0,
          scale: reduceMotion || isCurrentDragging ? 1 : isActive && isSelected ? 1.012 : isSelected ? 1.006 : 1,
        }}
        whileHover={
          reduceMotion || isCurrentDragging
            ? {}
            : { y: isSelected ? -3 : -2, scale: isSelected ? 1.008 : 1.005 }
        }
        transition={reduceMotion ? reducedMotionTransition : motionSprings.control}
      >
        <div className="precision-selection-frame" aria-hidden="true">
          <span className="precision-selection-corner corner-nw" />
          <span className="precision-selection-corner corner-ne" />
          <span className="precision-selection-corner corner-se" />
          <span className="precision-selection-corner corner-sw" />
        </div>

        <button
          type="button"
          data-page-primary-action
          {...attributes}
          {...pointerListeners}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          aria-label={`Page ${pageNumber} of ${docName}. ${
            isSelected ? "Selected" : "Not selected"
          }. Press Space to drag or Enter to open.`}
          aria-pressed={isSelected}
          aria-current={isViewerPage ? "page" : undefined}
          aria-busy={
            thumbnailStatus === "idle" || thumbnailStatus === "rendering"
              ? true
              : undefined
          }
          className="precision-page-primary cursor-grab select-none text-left active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright focus-visible:ring-offset-2 focus-visible:ring-offset-main-bg"
        >
          <span
            className={`precision-page-media ${
              isLandscape ? "aspect-[1.41/1]" : "aspect-[1/1.41]"
            }`}
          >
            {(thumbnailStatus === "idle" ||
              thumbnailStatus === "rendering") && (
              <span className="paper-skeleton" aria-hidden="true">
                <span className="paper-skeleton-rule paper-skeleton-rule-strong" />
                <span className="paper-skeleton-rule" />
                <span className="paper-skeleton-rule" />
                <span className="paper-skeleton-rule paper-skeleton-rule-short" />
              </span>
            )}

            {thumbnailStatus === "error" && (
              <span
                className="flex h-full w-full flex-col items-center justify-center gap-2 bg-red-500/[0.035] p-3 text-center text-red-500"
                title={errorMessage}
              >
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span className="text-[10px] font-semibold">
                  Preview unavailable
                </span>
              </span>
            )}

            {thumbnailStatus === "ready" && thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={`Page ${pageNumber} of ${docName}`}
                referrerPolicy="no-referrer"
                draggable={false}
                loading="lazy"
                className="h-full w-full select-none object-contain"
              />
            )}

            <span className="precision-drag-source-silhouette" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </span>

          <span className="precision-page-identity">
            <span
              className="precision-page-owner"
              style={{ backgroundColor: docColor }}
              aria-hidden="true"
            />
            <span className="studio-number precision-page-folio">{folio}</span>
            <span className="precision-page-origin" aria-hidden="true">
              {isLandscape ? "L" : "P"}
            </span>
            <span className="sr-only">
              Page {pageNumber}, original page {originalPageIndex + 1}
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-label={`Open page ${pageNumber} of ${docName}`}
          title={`Open page ${pageNumber}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleOpenControlClick}
          className="page-context-hit page-open-hit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          <span className="page-context-control">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={`${isSelected ? "Deselect" : "Select"} page ${pageNumber} of ${docName}`}
          title={`${isSelected ? "Deselect" : "Select"} page ${pageNumber}`}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={handleSelectionControlKeyDown}
          onClick={handleSelectionControlClick}
          className="page-context-hit page-selection-hit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          <span className="page-selection-control">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>
      </motion.div>
    </div>
  );
};

export const PageThumbnail = React.memo(PageThumbnailComponent);
