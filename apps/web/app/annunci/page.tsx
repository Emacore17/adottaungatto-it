import { Card, CardContent, CardHeader, Skeleton } from '@adottaungatto/ui';
import { Suspense } from 'react';
import { SearchListingsClient } from './search-listings-client';

const defaultApiBaseUrl = 'http://localhost:3002';

export default function PublicListingsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl;

  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="w-full space-y-6">
            <Card className="border-slate-300/70 bg-white/90">
              <CardHeader className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
              </CardHeader>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Card className="border-slate-300/70 bg-white/95">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardHeader className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-4/5" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
              <Card className="border-slate-300/70 bg-white/95">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardHeader className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-4/5" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
              <Card className="hidden border-slate-300/70 bg-white/95 xl:block">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardHeader className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-4/5" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      }
    >
      <SearchListingsClient apiBaseUrl={apiBaseUrl} />
    </Suspense>
  );
}
