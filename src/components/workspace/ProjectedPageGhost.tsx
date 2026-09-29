import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "motion/react";
import { WorkspacePage } from "../../types/workspace";
import {
  motionDurations,
  motionEasings,
  reducedMotionTransition,
} from "../../lib/motion/motionSystem";

type ProjectedPageGhostProps = {
  page: WorkspacePage;
  containerId: string;
  insertionSlot: number;
  docColor: string;
};

/**
 * Visual-only projected page slot. It remains a droppable so the canonical
 * insertion slot stays stable when the pointer is directly over the preview.
 */
export const ProjectedPageGhost: React.FC<ProjectedPageGhostProps> = ({
  page,
  containerId,
  insertionSlot,
  docColor,
}) => {
  const reduceMotion = useReducedMotion();
  const isLandscape = page.rotation === 90 || page.rotation === 270;
  const ghostId = `ghost:${containerId}:${insertionSlot}`;
  const { setNodeRef } = useDroppable({
    id: ghostId,
    data: {
      type: "projected-slot",
      containerId,
      insertionSlot,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="precision-page-cell relative flex justify-center select-none"
      id={`page-container-${ghostId}`}
      data-projected-insertion-slot={insertionSlot}
      data-page-orientation={isLandscape ? "landscape" : "portrait"}
      aria-hidden="true"
    >
      <motion.div
        className="precision-page-object projected-page-object"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.975 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reduceMotion
            ? reducedMotionTransition
            : {
                duration: motionDurations.quick,
                ease: motionEasings.enter,
              }
        }
      >
        <div className="projected-insertion-frame" />
        <div className="precision-page-primary projected-page-primary">
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
              style={{ backgroundColor: docColor }}
            />
            <span className="studio-number precision-page-folio">
              {String(insertionSlot + 1).padStart(2, "0")}
            </span>
            <span className="projected-insertion-mark" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
