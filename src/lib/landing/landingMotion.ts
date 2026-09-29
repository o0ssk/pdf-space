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
    durationSeconds: 10.4,
    times: [0, 0.14, 0.26, 0.44, 0.58, 0.73, 0.88, 1] as const,
    activePage: {
      opacity: [1, 1, 1, 1, 1, 1, 0, 0],
      rotate: [-1.2, -1.2, -0.4, 0.8, 0, 0, 0, -1.2],
      scale: [0.92, 0.92, 1.08, 1.08, 0.78, 0.78, 0.78, 0.92],
      x: [
        "0%",
        "0%",
        "0%",
        "var(--hero-page-travel)",
        "var(--hero-page-travel)",
        "var(--hero-page-travel)",
        "var(--hero-page-travel)",
        "0%",
      ],
      y: [
        "0%",
        "0%",
        "-7%",
        "-12%",
        "var(--hero-page-placement-y)",
        "var(--hero-page-placement-y)",
        "var(--hero-page-placement-y)",
        "0%",
      ],
    },
    sourceFocus: [0.18, 0.45, 0.6, 0.22, 0.12, 0.12, 0.12, 0.18],
    destinationFocus: [0.08, 0.08, 0.18, 0.68, 0.78, 0.72, 0.3, 0.08],
    slotOpacity: [0.22, 0.22, 0.78, 1, 0.45, 0.28, 0.18, 0.22],
    slotScale: [0.98, 0.98, 1, 1.025, 1, 1, 1, 0.98],
    statusOpacity: [0, 0, 1, 1, 1, 1, 0, 0],
    statusY: [8, 8, 0, 0, 0, 0, -4, 8],
    confirmationOpacity: [0, 0, 0, 0, 1, 1, 0, 0],
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
