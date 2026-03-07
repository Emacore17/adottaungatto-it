import { cn } from '@adottaungatto/ui';
import Link from 'next/link';

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

interface BreadcrumbsProps {
  className?: string;
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ className, items }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('text-xs text-[var(--color-text-muted)]', className)}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isCurrentPage = index === items.length - 1;
          const key = `${item.label}-${index}`;

          return (
            <li className="inline-flex items-center gap-1.5" key={key}>
              {item.href && !isCurrentPage ? (
                <Link
                  className="rounded-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isCurrentPage ? 'page' : undefined}
                  className={isCurrentPage ? 'font-semibold text-[var(--color-text)]' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isCurrentPage ? <span aria-hidden="true">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
