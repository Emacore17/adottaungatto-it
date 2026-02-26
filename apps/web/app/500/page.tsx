import { Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';

export default function ServerErrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] items-center px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="w-full border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]">
        <CardHeader>
          <CardTitle>500 · Errore temporaneo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--color-danger-fg)]">
          <p>Il servizio ha riscontrato un problema temporaneo. Riprova tra pochi secondi.</p>
          <div className="flex gap-2">
            <Link href="/">
              <Button>Torna alla home</Button>
            </Link>
            <Link href="/contatti">
              <Button variant="outline">Contatta supporto</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
