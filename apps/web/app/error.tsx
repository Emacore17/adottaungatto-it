'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { useEffect } from 'react';
import { captureWebException } from './sentry-client';

interface RootErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootErrorPage({ error, reset }: RootErrorPageProps) {
  useEffect(() => {
    captureWebException(error, 'root_error_boundary');
    console.error('Web app error boundary:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 sm:px-6 sm:py-10">
      <Card className="w-full border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="danger">Errore applicazione</Badge>
            {error.digest ? <Badge variant="outline">digest {error.digest}</Badge> : null}
          </div>
          <CardTitle className="mt-2">Si e verificato un problema imprevisto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-danger-fg)]">
            Riprova il caricamento della pagina. Se il problema persiste puoi tornare alla home.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} type="button">
              Riprova
            </Button>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-danger-fg)] transition-colors hover:bg-[var(--color-danger-bg)]"
              href="/"
            >
              Torna alla home
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
