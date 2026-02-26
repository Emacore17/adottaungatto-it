'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { useEffect } from 'react';
import { captureAdminException } from './sentry-client';

interface AdminRootErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminRootErrorPage({ error, reset }: AdminRootErrorPageProps) {
  useEffect(() => {
    captureAdminException(error, 'root_error_boundary');
    console.error('Admin app error boundary:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 sm:px-6 sm:py-10">
      <Card className="w-full border-rose-300/70 bg-rose-50/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="danger">Errore admin</Badge>
            {error.digest ? <Badge variant="outline">digest {error.digest}</Badge> : null}
          </div>
          <CardTitle className="mt-2">Il pannello admin ha riscontrato un errore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-rose-800">
            Riprova la richiesta. Se necessario torna alla coda moderazione.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} type="button">
              Riprova
            </Button>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-300 bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-rose-900 transition-colors hover:bg-rose-100"
              href="/admin/moderazione"
            >
              Vai a moderazione
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
