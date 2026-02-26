import { Card, CardContent, CardHeader, Skeleton } from '@adottaungatto/ui';

export default function ListingDetailLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full space-y-6">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
