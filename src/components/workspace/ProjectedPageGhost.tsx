import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { WorkspacePage } from "../../types/workspace";

type ProjectedPageGhostProps = {
  page: WorkspacePage;
  containerId: string;
  insertionSlot: number;
  docColor: string;
};

/**
 * Visual-only projected page slot. It is registered as a droppable so the
 * canonical insertion slot remains stable when the pointer is directly over
 * the ghost itself.
 */
export const ProjectedPageGhost: React.FC<ProjectedPageGhostProps> = ({
  page,
  containerId,
  insertionSlot,
  docColor,
}) => {
  const ghostId = `ghost:${containerId}:${page.id}`;
  const { setNodeRef } = useDroppable({
    id: ghostId,
    data: {
      type: "ghost",
      containerId,
      insertionSlot,
      pageId: page.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="relative flex flex-col items-center p-1 opacity-30 select-none blur-[1px]"
      id={`page-container-${ghostId}`}
      aria-hidden="true"
    >
      <div className="relative">
        <div
          className="w-[140px] sm:w-[150px] aspect-[1/1.41] rounded-xl bg-blue-bright/5 border border-blue-bright/40 text-left overflow-hidden flex flex-col items-center justify-center relative shadow-md"
          style={{
            borderLeftWidth: "4px",
            borderLeftColor: docColor,
          }}
        >
          {page.thumbnailStatus === "ready" && page.thumbnailUrl ? (
            <img
              src={page.thumbnailUrl}
              alt=""
              referrerPolicy="no-referrer"
              draggable={false}
              className="w-full h-full object-contain select-none saturate-50 pointer-events-none"
            />
          ) : (
            <div className="w-full h-full bg-panel-elevated/20 flex items-center justify-center text-muted-text text-[11px] uppercase font-bold tracking-wider pointer-events-none">
              Move here
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-blue-bright select-none opacity-80 pointer-events-none">
        <span className="text-[10px] uppercase font-mono tracking-wide">Move here</span>
      </div>
    </div>
  );
};
