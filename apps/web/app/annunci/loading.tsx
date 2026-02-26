import { Card, CardContent, CardHeader, Skeleton } from '@adottaungatto/ui';

const skeletonKeys = ['search-skeleton-a', 'search-skeleton-b', 'search-skeleton-c'];

export default function SearchListingsLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full space-y-6">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full sm:w-2/3" />
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {skeletonKeys.map((skeletonKey) => (
            <Card
              className="border-[var(--color-border)] bg-[var(--color-surface)]"
              key={skeletonKey}
            >
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
