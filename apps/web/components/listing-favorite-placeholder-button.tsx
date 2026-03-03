import { cn } from '@adottaungatto/ui';

interface ListingFavoritePlaceholderButtonProps {
  className?: string;
}

export function ListingFavoritePlaceholderButton({
  className,
}: ListingFavoritePlaceholderButtonProps) {
  return (
    <button
      aria-label="Salva nei preferiti"
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)] text-[var(--color-text)] shadow-[var(--shadow-sm)] backdrop-blur-md transition-colors hover:bg-[var(--color-surface-elevated)]',
        className,
      )}
      type="button"
    >
      <svg
        aria-hidden="true"
        fill="none"
        focusable="false"
        height="20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="20"
      >
        <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L4.6 14.4 12 21.8l7.4-7.4 1.4-1.4a5.2 5.2 0 0 0 0-7.4Z" />
      </svg>
    </button>
  );
}
