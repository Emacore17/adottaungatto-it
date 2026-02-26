import { Card, CardContent, CardHeader, Skeleton } from '@adottaungatto/ui';

export default function AdminModerationLoading() {
  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-72" />
        </CardHeader>
      </Card>
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardContent className="space-y-3 py-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
