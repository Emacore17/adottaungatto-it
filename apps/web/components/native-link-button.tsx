import { cn } from '@adottaungatto/ui';
import type { AnchorHTMLAttributes } from 'react';

const baseClassName =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[var(--radius-lg)] px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]';

const variantClassNames = {
  default:
    'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]',
  secondary:
    'bg-[var(--color-surface-muted)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted-strong)]',
  outline:
    'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
  ghost: 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
} as const;

interface NativeLinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: keyof typeof variantClassNames;
}

export function NativeLinkButton({
  className,
  variant = 'default',
  ...props
}: NativeLinkButtonProps) {
  return <a className={cn(baseClassName, variantClassNames[variant], className)} {...props} />;
}
