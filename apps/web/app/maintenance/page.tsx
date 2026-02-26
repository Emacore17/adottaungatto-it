import { Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] items-center px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="w-full border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle>Manutenzione in corso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
          <p>
            Stiamo applicando aggiornamenti infrastrutturali. Torna tra pochi minuti per continuare.
          </p>
          <Link href="/">
            <Button>Ricarica home</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
