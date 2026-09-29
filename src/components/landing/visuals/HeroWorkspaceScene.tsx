import React from "react";
import { Check, FileStack } from "lucide-react";
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
      <div className="hero-scene-lighting">
        <i />
        <i />
      </div>

      <div className="hero-workspace-topbar">
        <span className="hero-workspace-brand">
          <FileStack />
          PDF Space
        </span>
        <span>Focused document flow</span>
        <span className="hero-workspace-project">Local workspace</span>
      </div>

      <div className="hero-workspace-canvas">
        <motion.div
          animate={
            reduceMotion
              ? { opacity: 0.2 }
              : { opacity: [...landingMotion.hero.sourceFocus] }
          }
          className="hero-lane-focus is-source"
          transition={transition}
        />
        <motion.div
          animate={
            reduceMotion
              ? { opacity: 0.72 }
              : { opacity: [...landingMotion.hero.destinationFocus] }
          }
          className="hero-lane-focus is-destination"
          transition={transition}
        />

        <svg
          aria-hidden="true"
          className="hero-transfer-trajectory"
          viewBox="0 0 1000 450"
        >
          <defs>
            <linearGradient id="hero-trajectory-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#3f79bb" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#78a5d7" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#8c3a70" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M 290 140 C 450 60, 600 60, 780 180"
            fill="none"
            stroke="url(#hero-trajectory-gradient)"
            strokeDasharray="6 8"
            strokeWidth="2.5"
          />
        </svg>

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

        <motion.div
          className="hero-active-page-scroll"
          style={foregroundStyle ?? {}}
        >
          <motion.div
            animate={
              reduceMotion
                ? {
                    opacity: 1,
                    rotate: 0,
                    scale: 0.78,
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
            <Check />
            {copy.hero.transferStatus}
          </motion.span>
        </motion.div>
      </div>

      <div className="hero-workspace-reflection" />
    </div>
  );
};
