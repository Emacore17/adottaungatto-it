'use client';

import { type VariantProps, cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../lib/utils';

const toastVariants = cva(
  'pointer-events-auto w-full max-w-sm rounded-[var(--radius-xl)] border px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur-sm',
  {
    variants: {
      variant: {
        default: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
        success:
          'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-fg)]',
        warning:
          'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)]',
        danger:
          'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger-fg)]',
        info: 'border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-fg)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface ToastProps extends VariantProps<typeof toastVariants> {
  open: boolean;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onOpenChange?: (open: boolean) => void;
  autoHideMs?: number;
  className?: string;
}

export function Toast({
  open,
  title,
  description,
  actionLabel,
  onAction,
  onOpenChange,
  autoHideMs = 5000,
  variant,
  className,
}: ToastProps) {
  useEffect(() => {
    if (!open || autoHideMs <= 0 || !onOpenChange) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onOpenChange(false);
    }, autoHideMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoHideMs, onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] px-4 sm:left-auto sm:right-4 sm:inset-x-auto sm:w-full sm:max-w-sm sm:px-0">
      <div
        aria-live="polite"
        className={cn(toastVariants({ variant }), className)}
        role={variant === 'danger' ? 'alert' : 'status'}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{title}</p>
            {description ? <p className="text-xs opacity-90">{description}</p> : null}
          </div>
          <button
            aria-label="Chiudi notifica"
            className="rounded-md p-1 text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            onClick={() => onOpenChange?.(false)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {actionLabel && onAction ? (
          <div className="mt-3">
            <button
              className="inline-flex h-8 items-center justify-center rounded-[var(--radius-md)] border border-current/30 px-3 text-xs font-medium transition-colors hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              onClick={onAction}
              type="button"
            >
              {actionLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
