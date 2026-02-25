export const motionDurations = {
  quick: 0.16,
  base: 0.24,
  slow: 0.32,
} as const;

export const motionEasing = {
  standard: [0.22, 1, 0.36, 1],
  smooth: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export const motionPresets = {
  page: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionDurations.base, ease: motionEasing.standard },
  },
  sectionEnter: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionDurations.base, ease: motionEasing.smooth },
  },
  listEnter: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionDurations.quick, ease: motionEasing.standard },
  },
  hoverLift: {
    whileHover: { y: -3, scale: 1.01 },
    whileTap: { scale: 0.995 },
    transition: { duration: motionDurations.quick, ease: motionEasing.standard },
  },
  crossfade: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: motionDurations.quick, ease: motionEasing.standard },
  },
} as const;
