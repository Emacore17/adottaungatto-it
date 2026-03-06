'use client';

import { motionPresets } from '@adottaungatto/ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={motionPresets.page.animate}
      initial={prefersReducedMotion ? false : motionPresets.page.initial}
      transition={prefersReducedMotion ? { duration: 0 } : motionPresets.page.transition}
    >
      {children}
    </motion.div>
  );
}
