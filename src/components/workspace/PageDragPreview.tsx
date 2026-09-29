import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { WorkspacePage } from "../../types/workspace";
import {
  motionSprings,
  reducedMotionTransition,
} from "../../lib/motion/motionSystem";

type PageDragPreviewProps = {
  page: WorkspacePage;
  documentName: string;
  documentColor: string;
  selectedCount: number;
};

export const PageDragPreview: React.FC<PageDragPreviewProps> = ({
  page,
  documentName,
  documentColor,
  selectedCount,
}) => {
  const reduceMotion = useReducedMotion();
  const isLandscape = page.rotation === 90 || page.rotation === 270;
  const stackCount = Math.max(1, selectedCount);
  const backingPlaneCount = Math.min(2, stackCount - 1);

  return (
    <motion.div
      className="page-drag-preview pointer-events-none relative select-none"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97, rotate: 0 }}
      animate={{
        opacity: 1,
        scale: reduceMotion ? 1 : 1.04,
        rotate: reduceMotion ? 0 : -0.65,
      }}
      transition={reduceMotion ? reducedMotionTransition : motionSprings.drag}
      data-drag-preview-count={stackCount}
    >
      {Array.from({ length: backingPlaneCount }, (_, index) => (
        <span
          key={index}
          className={`page-drag-backing-plane backing-${index + 1}`}
          aria-hidden="true"
        />
      ))}

      <div className="precision-page-primary page-drag-paper">
        <div
          className={`precision-page-media ${
            isLandscape ? "aspect-[1.41/1]" : "aspect-[1/1.41]"
          }`}
        >
          {page.thumbnailStatus === "ready" && page.thumbnailUrl ? (
            <img
              src={page.thumbnailUrl}
              alt=""
              referrerPolicy="no-referrer"
              draggable={false}
              className="h-full w-full select-none object-contain"
            />
          ) : (
            <div className="projected-paper-lines">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
        <div className="precision-page-identity">
          <span
            className="precision-page-owner"
            style={{ backgroundColor: documentColor }}
            aria-hidden="true"
          />
          <span className="studio-number precision-page-folio">
            {String(page.pageNumber).padStart(2, "0")}
          </span>
          <span className="page-drag-document" title={documentName}>
            {documentName}
          </span>
        </div>
      </div>

      {stackCount > 1 && (
        <span className="page-drag-count">
          {stackCount} pages
        </span>
      )}
    </motion.div>
  );
};
