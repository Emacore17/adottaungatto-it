import { cn } from '@adottaungatto/ui';
import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

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

interface LinkButtonProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: keyof typeof variantClassNames;
}

export function LinkButton({ className, variant = 'default', ...props }: LinkButtonProps) {
  return <Link className={cn(baseClassName, variantClassNames[variant], className)} {...props} />;
}
