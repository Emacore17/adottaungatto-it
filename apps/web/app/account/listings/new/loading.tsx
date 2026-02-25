import { Card, CardContent, CardHeader, Skeleton } from '@adottaungatto/ui';

export default function ListingCreateLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full space-y-6">
        <Card className="border-slate-300/70 bg-white/90">
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>

        <Card className="border-slate-300/80">
          <CardHeader className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>

        <Card className="border-slate-300/80">
          <CardHeader className="space-y-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
