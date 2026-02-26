'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';

interface AdminModerationErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminModerationError({ error, reset }: AdminModerationErrorProps) {
  return (
    <main className="space-y-4">
      <Card className="border-rose-300 bg-rose-50/90">
        <CardHeader>
          <CardTitle>Errore caricamento moderazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-rose-800">
          <p>{error.message}</p>
          <Button onClick={reset} type="button">
            Riprova
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
