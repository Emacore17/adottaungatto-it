import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';

export default function AnnunciNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <Card className="w-full border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <Badge variant="outline">Annuncio non disponibile</Badge>
          <CardTitle className="mt-2">Questo annuncio non e visibile pubblicamente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text)]">
            L&apos;annuncio potrebbe non esistere, essere stato rimosso o non essere ancora
            pubblicato.
          </p>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
            href="/annunci"
          >
            Torna alla lista annunci
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
