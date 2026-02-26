'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { useEffect } from 'react';

interface AnnunciErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AnnunciErrorPage({ error, reset }: AnnunciErrorPageProps) {
  useEffect(() => {
    console.error('Annunci segment error:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 sm:py-10">
      <Card className="w-full border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="danger">Ricerca non disponibile</Badge>
            {error.digest ? <Badge variant="outline">digest {error.digest}</Badge> : null}
          </div>
          <CardTitle>Impossibile caricare annunci e dettagli</CardTitle>
          <CardDescription>
            Si e verificato un errore temporaneo. Riprova tra pochi secondi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={reset} type="button">
            Riprova caricamento
          </Button>
          <a
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-danger-fg)] transition-colors hover:bg-[var(--color-danger-bg)]"
            href="/annunci"
          >
            Torna alla lista
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
