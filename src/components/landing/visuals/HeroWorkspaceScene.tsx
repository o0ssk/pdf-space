import React from "react";
import {
  Check,
  FileStack,
  Layers,
  Scissors,
  RotateCw,
  Search,
  ArrowUpDown,
  Download,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  type MotionStyle,
} from "motion/react";
import type { LandingCopy } from "../../../lib/landing/landingCopy";
import {
  getHeroSceneTransition,
  landingMotion,
} from "../../../lib/landing/landingMotion";
import { HeroActivePage } from "./HeroActivePage";
import { HeroDocumentLane } from "./HeroDocumentLane";

type HeroWorkspaceSceneProps = {
  copy: LandingCopy;
  foregroundStyle?: MotionStyle | undefined;
};

export const HeroWorkspaceScene: React.FC<HeroWorkspaceSceneProps> = ({
  copy,
  foregroundStyle,
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const transition = getHeroSceneTransition(reduceMotion);

  return (
    <div
      aria-hidden="true"
      className={`hero-workspace-scene ${
        reduceMotion ? "is-reduced-motion" : ""
      }`}
      data-hero-workspace-scene
    >
      {/* Sleek macOS Window Chrome */}
      <div className="hero-workspace-chrome">
        <div className="hero-window-controls">
          <span className="window-dot is-close" />
          <span className="window-dot is-minimize" />
          <span className="window-dot is-maximize" />
        </div>

        <div className="hero-workspace-titlebar">
          <span className="hero-workspace-brand">
            <FileStack className="w-3.5 h-3.5" />
            PDF Space Studio
          </span>
          <span className="hero-titlebar-divider">/</span>
          <span className="hero-workspace-docname">Quarterly_Review_2026.pdf</span>
        </div>

        <div className="hero-workspace-status-badge">
          <span className="status-indicator-dot" />
          <span>Saved Locally</span>
        </div>
      </div>

      {/* Pro Toolbar */}
      <div className="hero-workspace-command-bar">
        <div className="command-bar-tools">
          <button className="command-tool-btn is-active" type="button">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Reorder</span>
          </button>
          <button className="command-tool-btn" type="button">
            <Scissors className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button className="command-tool-btn" type="button">
            <Layers className="w-3.5 h-3.5" />
            <span>Merge</span>
          </button>
          <button className="command-tool-btn" type="button">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate</span>
          </button>
          <button className="command-tool-btn is-search" type="button">
            <Search className="w-3.5 h-3.5" />
            <span>Search (⌘K)</span>
          </button>
        </div>

        <div className="command-bar-actions">
          <span className="command-zoom-badge">100%</span>
          <button className="command-export-btn" type="button">
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* The Workspace Canvas */}
      <div className="hero-workspace-canvas">
        <motion.div
          animate={
            reduceMotion
              ? { opacity: 0.25 }
              : { opacity: [...landingMotion.hero.sourceFocus] }
          }
          className="hero-lane-focus is-source"
          transition={transition}
        />
        <motion.div
          animate={
            reduceMotion
              ? { opacity: 0.6 }
              : { opacity: [...landingMotion.hero.destinationFocus] }
          }
          className="hero-lane-focus is-destination"
          transition={transition}
        />

        <HeroDocumentLane
          meta={copy.hero.sourceMeta}
          name={copy.hero.sourceName}
          roleLabel={copy.hero.sourceRole}
        />
        <HeroDocumentLane
          destination
          meta={copy.hero.destinationMeta}
          name={copy.hero.destinationName}
          roleLabel={copy.hero.destinationRole}
          slotLabel={copy.hero.destinationSlotLabel}
        />

        <motion.div
          animate={
            reduceMotion
              ? { opacity: 1, scale: 1 }
              : {
                  opacity: [...landingMotion.hero.slotOpacity],
                  scale: [...landingMotion.hero.slotScale],
                }
          }
          className="hero-slot-emphasis"
          transition={transition}
        />

        {/* Animated Transfer Page with Smooth Docking & No Vanishing */}
        <motion.div
          className="hero-active-page-scroll"
          style={foregroundStyle ?? {}}
        >
          <motion.div
            animate={
              reduceMotion
                ? {
                    opacity: 1,
                    scale: 0.95,
                    x: "var(--hero-page-travel)",
                    y: "var(--hero-page-placement-y)",
                  }
                : {
                    opacity: [...landingMotion.hero.activePage.opacity],
                    rotate: [...landingMotion.hero.activePage.rotate],
                    scale: [...landingMotion.hero.activePage.scale],
                    x: [...landingMotion.hero.activePage.x],
                    y: [...landingMotion.hero.activePage.y],
                  }
            }
            className="hero-active-page-motion"
            transition={transition}
          >
            <HeroActivePage pageLabel={copy.hero.activePageLabel} />
          </motion.div>
        </motion.div>

        {/* Dynamic Context Status Pill */}
        <motion.div
          animate={
            reduceMotion
              ? { opacity: 1, y: 0 }
              : {
                  opacity: [...landingMotion.hero.statusOpacity],
                  y: [...landingMotion.hero.statusY],
                }
          }
          className="hero-transfer-context"
          data-hero-transfer-context
          transition={transition}
        >
          <span className="hero-transfer-page-label">
            {copy.hero.activePageLabel}
          </span>
          <span className="hero-transfer-route" dir="ltr">
            {copy.hero.sourceName}
            <b aria-hidden="true">→</b>
            {copy.hero.destinationName}
          </span>
          <motion.span
            animate={
              reduceMotion
                ? { opacity: 1 }
                : {
                    opacity: [...landingMotion.hero.confirmationOpacity],
                  }
            }
            className="hero-transfer-confirmation"
            transition={transition}
          >
            <Check className="w-3.5 h-3.5" />
            {copy.hero.transferStatus}
          </motion.span>
        </motion.div>
      </div>
    </div>
  );
};
