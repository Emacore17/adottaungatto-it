import { Badge, Card } from '@adottaungatto/ui';
import type { ReactNode } from 'react';
import { SectionReveal } from './motion/section-reveal';

interface PageShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  aside?: ReactNode;
  children?: ReactNode;
}

export function PageShell({ eyebrow, title, description, aside, children }: PageShellProps) {
  return (
    <div className="space-y-8">
      <SectionReveal>
        <section className={aside ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]' : 'space-y-4'}>
          <div className="space-y-4">
            {eyebrow ? (
              <Badge className="w-fit" variant="secondary">
                {eyebrow}
              </Badge>
            ) : null}
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base text-[var(--color-text-muted)] sm:text-lg">
                {description}
              </p>
            </div>
          </div>
          {aside ? (
            <Card className="h-fit bg-[var(--color-surface-overlay-strong)]">{aside}</Card>
          ) : null}
        </section>
      </SectionReveal>

      {children ? (
        <SectionReveal delay={0.08}>
          <section className="space-y-4">{children}</section>
        </SectionReveal>
      ) : null}
    </div>
  );
}
