import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

interface ListingsPaginationProps {
  buildPageHref: (page: number) => string;
  currentPage: number;
  totalPages: number;
}

const buildVisiblePages = (currentPage: number, totalPages: number) => {
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
};

export function ListingsPagination({
  buildPageHref,
  currentPage,
  totalPages,
}: ListingsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = buildVisiblePages(currentPage, totalPages);

  return (
    <nav
      aria-label="Paginazione annunci"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <Link
        aria-disabled={currentPage <= 1}
        className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
          currentPage <= 1
            ? 'pointer-events-none border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50'
            : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
        }`}
        href={buildPageHref(Math.max(1, currentPage - 1))}
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        Precedente
      </Link>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {visiblePages.map((page, index) => {
          const previousPage = visiblePages[index - 1];
          const hasGap = typeof previousPage === 'number' && page - previousPage > 1;

          return (
            <div className="flex items-center gap-2" key={page}>
              {hasGap ? (
                <span className="inline-flex h-11 w-11 items-center justify-center text-[var(--color-text-muted)]">
                  <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
                </span>
              ) : null}

              <Link
                aria-current={page === currentPage ? 'page' : undefined}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                  page === currentPage
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
                }`}
                href={buildPageHref(page)}
              >
                {page}
              </Link>
            </div>
          );
        })}
      </div>

      <Link
        aria-disabled={currentPage >= totalPages}
        className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
          currentPage >= totalPages
            ? 'pointer-events-none border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50'
            : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
        }`}
        href={buildPageHref(Math.min(totalPages, currentPage + 1))}
      >
        Successiva
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </nav>
  );
}
