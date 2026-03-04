import { Badge, type BadgeProps, Card, CardContent, CardHeader } from '@adottaungatto/ui';
import type { ReactNode } from 'react';
import { PageShell } from './page-shell';

interface ContentPageBadge {
  label: string;
  variant?: BadgeProps['variant'];
}

interface ContentPageHighlight {
  label: string;
  value: string;
}

interface ContentPageSection {
  body?: ReactNode;
  description?: string;
  footer?: ReactNode;
  items?: string[];
  title: string;
}

interface ContentPageProps {
  actions?: ReactNode;
  asideDescription?: string;
  badges?: ContentPageBadge[];
  children?: ReactNode;
  description: string;
  eyebrow?: string;
  highlights?: ContentPageHighlight[];
  sectionColumns?: 1 | 2 | 3;
  sections: ContentPageSection[];
  title: string;
}

const sectionColumnsClassName = {
  1: 'grid gap-4',
  2: 'grid gap-4 lg:grid-cols-2',
  3: 'grid gap-4 lg:grid-cols-3',
} as const;

const slugifyValue = (value: string) => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

  return normalized || 'section';
};

export function ContentPage({
  actions,
  asideDescription,
  badges = [],
  children,
  description,
  eyebrow,
  highlights = [],
  sectionColumns = 2,
  sections,
  title,
}: ContentPageProps) {
  const pageScopeId = slugifyValue(title);

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.label} variant={badge.variant ?? 'secondary'}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}

          {asideDescription ? (
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">{asideDescription}</p>
          ) : null}

          {highlights.length > 0 ? (
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {highlights.map((highlight) => (
                <div
                  className="rounded-[20px] bg-[var(--color-surface-muted)] px-4 py-3"
                  key={highlight.label}
                >
                  <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    {highlight.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {highlight.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      }
      description={description}
      eyebrow={eyebrow}
      title={title}
    >
      <div className={sectionColumnsClassName[sectionColumns]}>
        {sections.map((section, index) => {
          const sectionId = `${pageScopeId}-section-${index + 1}`;

          return (
            <section aria-labelledby={sectionId} key={section.title}>
              <Card>
                <CardHeader className="space-y-2">
                  <h2
                    className="text-lg font-semibold tracking-tight text-[var(--color-text)]"
                    id={sectionId}
                  >
                    {section.title}
                  </h2>
                  {section.description ? (
                    <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                      {section.description}
                    </p>
                  ) : null}
                </CardHeader>
                {section.body || section.items || section.footer ? (
                  <CardContent className="space-y-4 text-sm leading-6 text-[var(--color-text-muted)]">
                    {section.body}
                    {section.items ? (
                      <ul className="space-y-3">
                        {section.items.map((item) => (
                          <li className="flex gap-3" key={item}>
                            <span
                              aria-hidden="true"
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {section.footer}
                  </CardContent>
                ) : null}
              </Card>
            </section>
          );
        })}
      </div>

      {children}
    </PageShell>
  );
}
