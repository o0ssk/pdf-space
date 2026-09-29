import React, {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LandingCopy } from "../../lib/landing/landingCopy";
import {
  getNextShowcaseTab,
  landingMotion,
  shouldAutoplayShowcase,
} from "../../lib/landing/landingMotion";
import {
  MiniWorkspace,
  type MiniWorkspaceMode,
} from "./visuals/MiniWorkspace";

type ProductShowcaseProps = {
  copy: LandingCopy;
};

const modes: readonly MiniWorkspaceMode[] = ["full", "ordering", "transfer"];

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({ copy }) => {
  const reduceMotion = useReducedMotion();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const manualPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [documentVisible, setDocumentVisible] = useState(
    typeof document === "undefined" ? true : !document.hidden
  );
  const [focusWithin, setFocusWithin] = useState(false);
  const [hover, setHover] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const activeMode = modes[activeIndex] ?? "full";

  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(
    () => () => {
      if (manualPauseTimer.current) clearTimeout(manualPauseTimer.current);
    },
    []
  );

  useEffect(() => {
    const autoplay = shouldAutoplayShowcase({
      documentVisible,
      focusWithin,
      hover,
      manualPause,
      reducedMotion: Boolean(reduceMotion),
    });
    if (!autoplay) return;

    const timer = window.setTimeout(
      () => setActiveIndex((index) => getNextShowcaseTab(index, modes.length)),
      landingMotion.showcaseIntervalMs
    );
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    documentVisible,
    focusWithin,
    hover,
    manualPause,
    reduceMotion,
  ]);

  const selectTab = (index: number, pauseAutoplay = true) => {
    setActiveIndex(index);
    if (!pauseAutoplay || reduceMotion) return;
    setManualPause(true);
    if (manualPauseTimer.current) clearTimeout(manualPauseTimer.current);
    manualPauseTimer.current = setTimeout(
      () => setManualPause(false),
      landingMotion.showcaseManualPauseMs
    );
  };

  const onTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % modes.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + modes.length) % modes.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = modes.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    selectTab(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section className="product-showcase-section" id="product-showcase">
      <div className="landing-shell">
        <div className="landing-section-header">
          <span className="editorial-eyebrow">{copy.navigation.product}</span>
          <h2 className="editorial-title">{copy.showcase.title}</h2>
          <p className="editorial-lead">{copy.showcase.description}</p>
        </div>

      <div
        className="product-showcase-demo"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocusWithin(false);
          }
        }}
        onFocus={() => setFocusWithin(true)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div
          aria-label={copy.showcase.title}
          className="showcase-tabs"
          role="tablist"
        >
          {copy.showcase.tabs.map((label, index) => (
            <button
              aria-controls={`showcase-panel-${index}`}
              aria-selected={activeIndex === index}
              className={activeIndex === index ? "is-active" : ""}
              id={`showcase-tab-${index}`}
              key={label}
              onClick={() => selectTab(index)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={activeIndex === index ? 0 : -1}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="showcase-panel-frame">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              aria-labelledby={`showcase-tab-${activeIndex}`}
              className="showcase-panel"
              id={`showcase-panel-${activeIndex}`}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              key={activeMode}
              role="tabpanel"
              {...(reduceMotion ? {} : { exit: { opacity: 0, y: -8 } })}
              transition={{
                duration: landingMotion.duration.control,
                ease: landingMotion.ease.enter,
              }}
            >
              <MiniWorkspace copy={copy} mode={activeMode} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  </section>
);
};
