import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">access denied</Badge>
          </div>
          <CardTitle>Permessi insufficienti</CardTitle>
          <CardDescription>
            L&apos;account autenticato non ha ruolo `moderator` o `admin`.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
            href="/login"
          >
            Cambia account
          </Link>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="secondary">
              Logout
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
