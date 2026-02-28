import { Card, Skeleton } from '@adottaungatto/ui';

interface PageLoadingProps {
  title?: string;
}

export function PageLoading({ title = 'Caricamento scaffold...' }: PageLoadingProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Skeleton className="h-6 w-36 rounded-full" />
        <Skeleton className="h-12 w-full max-w-3xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>

      <Card className="space-y-4">
        <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Card>
    </div>
  );
}
