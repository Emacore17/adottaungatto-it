import { cn } from '@adottaungatto/ui';
import { Sparkles } from 'lucide-react';

interface ListingSponsoredBadgeProps {
  className?: string;
}

export function ListingSponsoredBadge({ className }: ListingSponsoredBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_84%,white_16%)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] shadow-[0_12px_24px_rgb(66_40_49_/_0.08)] backdrop-blur-md',
        className,
      )}
    >
      <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[var(--color-primary)]" />
      Sponsorizzato
    </div>
  );
}
