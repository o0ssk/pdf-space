export const landingMotion = {
  duration: {
    hover: 0.18,
    control: 0.24,
    section: 0.62,
    interface: 0.72,
  },
  ease: {
    enter: [0.16, 1, 0.3, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
  },
  hero: {
    durationSeconds: 7.2,
    times: [0, 0.2, 0.45, 0.72, 0.92, 1] as const,
    activePage: {
      opacity: [1, 1, 1, 1, 1, 1],
      rotate: [0, 0, 0, 0, 0, 0],
      scale: [1, 1.03, 1, 1, 1.02, 1],
      x: [
        "0%",
        "0%",
        "var(--hero-page-travel)",
        "var(--hero-page-travel)",
        "0%",
        "0%",
      ],
      y: [
        "0%",
        "-4%",
        "var(--hero-page-placement-y)",
        "var(--hero-page-placement-y)",
        "-4%",
        "0%",
      ],
    },
    sourceFocus: [0.4, 0.5, 0.2, 0.2, 0.4, 0.4],
    destinationFocus: [0.15, 0.2, 0.65, 0.65, 0.2, 0.15],
    slotOpacity: [0.3, 0.6, 1, 1, 0.4, 0.3],
    slotScale: [1, 1.02, 1, 1, 1, 1],
    statusOpacity: [0, 0.8, 1, 1, 0.6, 0],
    statusY: [6, 0, 0, 0, 4, 6],
    confirmationOpacity: [0, 0, 1, 1, 0, 0],
  },
  showcaseIntervalMs: 5_500,
  showcaseManualPauseMs: 9_000,
} as const;

export const getHeroSceneTransition = (reducedMotion: boolean) =>
  reducedMotion
    ? { duration: 0 }
    : {
        duration: landingMotion.hero.durationSeconds,
        ease: "easeInOut" as const,
        repeat: Infinity,
        times: [...landingMotion.hero.times],
      };

export const getNextShowcaseTab = (currentIndex: number, tabCount = 3) =>
  tabCount <= 0 ? 0 : (currentIndex + 1) % tabCount;

export const shouldAutoplayShowcase = ({
  documentVisible,
  focusWithin,
  hover,
  manualPause,
  reducedMotion,
}: {
  documentVisible: boolean;
  focusWithin: boolean;
  hover: boolean;
  manualPause: boolean;
  reducedMotion: boolean;
}) =>
  documentVisible &&
  !focusWithin &&
  !hover &&
  !manualPause &&
  !reducedMotion;
