'use client';

import { Card, CardContent, CardHeader, CardTitle, motionPresets } from '@adottaungatto/ui';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StaticPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function StaticPage({ title, subtitle, children }: StaticPageProps) {
  return (
    <main className="mx-auto w-full max-w-[980px] space-y-5 px-4 pb-12 sm:px-6 lg:px-8">
      <motion.div
        initial={motionPresets.sectionEnter.initial}
        transition={motionPresets.sectionEnter.transition}
        viewport={{ once: true, amount: 0.25 }}
        whileInView={motionPresets.sectionEnter.animate}
      >
        <Card className="relative overflow-hidden border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)] shadow-[var(--shadow-lg)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(245,196,174,0.2),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(233,180,209,0.18),transparent_36%)]" />
          <CardHeader className="relative">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          </CardHeader>
          <CardContent className="relative space-y-4 text-sm text-[var(--color-text-muted)]">
            {children}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
