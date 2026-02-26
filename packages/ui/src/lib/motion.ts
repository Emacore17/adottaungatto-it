export const motionDurations = {
  instant: 0.16,
  quick: 0.24,
  base: 0.4,
  slow: 0.56,
} as const;

export const motionEasing = {
  standard: [0.22, 1, 0.36, 1],
  smooth: [0.2, 0.8, 0.2, 1],
  premium: [0.24, 0.92, 0.25, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export const motionPresets = {
  page: {
    initial: { opacity: 0, y: 12, scale: 0.998, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: { duration: motionDurations.base, ease: motionEasing.premium },
  },
  sectionEnter: {
    initial: { opacity: 0, y: 22, scale: 0.996, filter: 'blur(3px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: { duration: motionDurations.base, ease: motionEasing.smooth },
  },
  listEnter: {
    initial: { opacity: 0, y: 14, scale: 0.994 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: motionDurations.base, ease: motionEasing.standard },
  },
  hoverLift: {
    whileHover: { y: -4, scale: 1.008 },
    whileTap: { y: -1, scale: 0.997 },
    transition: { duration: motionDurations.instant, ease: motionEasing.smooth },
  },
  crossfade: {
    initial: { opacity: 0, y: 10, filter: 'blur(3px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -8, filter: 'blur(1px)' },
    transition: { duration: motionDurations.quick, ease: motionEasing.smooth },
  },
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        delayChildren: 0.04,
        staggerChildren: 0.065,
      },
    },
  },
  staggerItem: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionDurations.base, ease: motionEasing.standard },
  },
  softFloat: {
    animate: { y: [0, -4, 0] },
    transition: {
      duration: 4.8,
      ease: motionEasing.smooth,
      repeat: Number.POSITIVE_INFINITY,
    },
  },
} as const;
