'use client';

import { motionPresets } from '@adottaungatto/ui';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface WebTemplateProps {
  children: ReactNode;
}

export default function WebTemplate({ children }: WebTemplateProps) {
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
