'use client';

import { cn, motionPresets } from '@adottaungatto/ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SectionReveal({ children, className, delay = 0 }: SectionRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={motionPresets.sectionEnter.animate}
      className={cn(className)}
      initial={prefersReducedMotion ? false : motionPresets.sectionEnter.initial}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              ...motionPresets.sectionEnter.transition,
              delay,
            }
      }
    >
      {children}
    </motion.div>
  );
}
