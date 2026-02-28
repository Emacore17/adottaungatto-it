'use client';

import { motionPresets } from '@adottaungatto/ui';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      animate={motionPresets.page.animate}
      className="will-change-transform"
      initial={motionPresets.page.initial}
      transition={motionPresets.page.transition}
    >
      {children}
    </motion.div>
  );
}
