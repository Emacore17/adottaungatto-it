import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-muted-strong)]',
        className,
      )}
      {...props}
    />
  );
}
