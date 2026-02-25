'use client';

import { type VariantProps, cva } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-lg)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]',
        secondary:
          'bg-[var(--color-surface-muted)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted-strong)]',
        outline:
          'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
        ghost: 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
        success:
          'bg-[var(--color-success-solid)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-success-solid-hover)]',
        danger:
          'bg-[var(--color-danger-solid)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-danger-solid-hover)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-[var(--radius-md)] px-3',
        lg: 'h-11 rounded-[var(--radius-md)] px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} type="button" {...props} />
  );
}
