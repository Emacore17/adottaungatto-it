import { Badge, Card } from '@adottaungatto/ui';
import type { ReactNode } from 'react';
import { SectionReveal } from './motion/section-reveal';

interface PageShellProps {
  breadcrumbs?: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  titleExtra?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}

const slugifyTitle = (value: string) => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

  return normalized || 'page';
};

export function PageShell({
  breadcrumbs,
  eyebrow,
  title,
  description,
  titleExtra,
  aside,
  children,
}: PageShellProps) {
  const titleId = `page-title-${slugifyTitle(title)}`;
  const descriptionId = `${titleId}-description`;

  return (
    <div className="space-y-8">
      <SectionReveal>
        <section
          aria-labelledby={titleId}
          className={aside ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]' : 'space-y-4'}
        >
          <header className="space-y-4">
            {breadcrumbs}
            {eyebrow ? (
              <Badge className="w-fit" variant="secondary">
                {eyebrow}
              </Badge>
            ) : null}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1
                  className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl"
                  id={titleId}
                >
                  {title}
                </h1>
                {titleExtra}
              </div>
              <p
                className="max-w-2xl text-base text-[var(--color-text-muted)] sm:text-lg"
                id={descriptionId}
              >
                {description}
              </p>
            </div>
          </header>
          {aside ? (
            <aside aria-describedby={descriptionId} aria-label={`Informazioni rapide su ${title}`}>
              <Card className="h-fit bg-[var(--color-surface-overlay-strong)]">{aside}</Card>
            </aside>
          ) : null}
        </section>
      </SectionReveal>

      {children ? (
        <SectionReveal delay={0.08}>
          <div className="space-y-4">{children}</div>
        </SectionReveal>
      ) : null}
    </div>
  );
}
