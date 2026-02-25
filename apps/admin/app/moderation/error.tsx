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

interface ModerationErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ModerationErrorPage({ error, reset }: ModerationErrorPageProps) {
  useEffect(() => {
    console.error('Moderation segment error:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 sm:py-10">
      <Card className="w-full border-rose-300/70 bg-rose-50/80">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="danger">Errore coda moderazione</Badge>
            {error.digest ? <Badge variant="outline">digest {error.digest}</Badge> : null}
          </div>
          <CardTitle>La coda non e disponibile al momento</CardTitle>
          <CardDescription>
            Aggiorna la pagina o riprova la richiesta di caricamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={reset} type="button">
            Riprova caricamento
          </Button>
          <a
            className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-900 transition-colors hover:bg-rose-100"
            href="/moderation"
          >
            Riapri moderazione
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
