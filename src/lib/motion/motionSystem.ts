export const motionDurations = {
  instant: 0.08,
  micro: 0.14,
  quick: 0.2,
  standard: 0.28,
  deliberate: 0.42,
  story: 0.64,
} as const;

export const motionEasings = {
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  spatial: [0.22, 1, 0.36, 1],
} as const;

export const motionSprings = {
  control: { type: "spring", stiffness: 420, damping: 34, mass: 0.6 },
  surface: { type: "spring", stiffness: 280, damping: 30, mass: 0.75 },
  drag: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
} as const;

export const motionDistances = {
  micro: 4,
  control: 8,
  surface: 16,
  story: 28,
} as const;

export const motionOpacityLevels = {
  hidden: 0,
  subdued: 0.58,
  resting: 1,
} as const;

export const dialogMotion = {
  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  surface: {
    hidden: { opacity: 0, y: motionDistances.surface, scale: 0.985 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
} as const;

export const revealMotion = {
  hidden: { opacity: 0, y: motionDistances.surface },
  visible: { opacity: 1, y: 0 },
} as const;

export const reducedMotionTransition = { duration: 0 } as const;
