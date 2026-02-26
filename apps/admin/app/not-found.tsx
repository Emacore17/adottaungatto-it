import { Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';

export default function AdminNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[760px] items-center px-4 sm:px-6 lg:px-8">
      <Card className="w-full border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle>404 admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
          <p>La risorsa richiesta non esiste o non e accessibile con il ruolo corrente.</p>
          <Link href="/admin">
            <Button>Torna alla dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
