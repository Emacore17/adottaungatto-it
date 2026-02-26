import { Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] items-center px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="w-full border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle>404 · Pagina non trovata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--color-text-muted)]">
          <p>La risorsa richiesta non e disponibile oppure e stata spostata.</p>
          <div className="flex gap-2">
            <Link href="/">
              <Button>Torna alla home</Button>
            </Link>
            <Link href="/cerca">
              <Button variant="outline">Vai alla ricerca</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
