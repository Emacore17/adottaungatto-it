'use client';

import { cn, motionPresets } from '@adottaungatto/ui';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SectionReveal({ children, className, delay = 0 }: SectionRevealProps) {
  return (
    <motion.div
      animate={motionPresets.sectionEnter.animate}
      className={cn(className)}
      initial={motionPresets.sectionEnter.initial}
      transition={{
        ...motionPresets.sectionEnter.transition,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
