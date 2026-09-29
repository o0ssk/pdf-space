import React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  PageOperationActionHandlers,
  PageOperationActions,
} from "./PageOperationActions";
import {
  motionDistances,
  motionSprings,
  reducedMotionTransition,
} from "../../lib/motion/motionSystem";

type SelectionActionToolbarProps = PageOperationActionHandlers & {
  selectedCount: number;
  mobile?: boolean;
};

export const SelectionActionToolbar: React.FC<
  SelectionActionToolbarProps
> = ({ selectedCount, mobile = false, ...handlers }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="toolbar"
      aria-label={`Actions for ${selectedCount} selected ${
        selectedCount === 1 ? "page" : "pages"
      }`}
      data-selection-command-dock
      initial={
        reduceMotion
          ? false
          : { opacity: 0, y: mobile ? motionDistances.control : -motionDistances.micro, scale: 0.985 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? reducedMotionTransition : motionSprings.surface}
      className={
        mobile
          ? "command-surface fixed bottom-[72px] left-3 right-3 z-30 p-2"
          : "command-surface mx-auto w-fit max-w-full px-2.5 py-2"
      }
    >
      <div className="selection-command-scroll flex items-center gap-2 overflow-x-auto">
        <div className="selection-count-block flex-shrink-0" aria-hidden="true">
          <span className="studio-number selection-count-number">{selectedCount}</span>
          <span>{selectedCount === 1 ? "page" : "pages"}</span>
        </div>
        <div className="h-7 w-px flex-shrink-0 bg-white/10" aria-hidden="true" />
        <PageOperationActions
          {...handlers}
          selectedCount={selectedCount}
          variant="toolbar"
        />
      </div>
    </motion.div>
  );
};
