'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@adottaungatto/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMockThreads } from '../../lib/mock-client-store';
import { mockMessageThreads } from '../../mocks/engagement';

const formatDate = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(rawDate),
  );

export default function MessagesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [threads, setThreads] = useState(mockMessageThreads);

  useEffect(() => {
    setThreads(getMockThreads());
    const timeout = window.setTimeout(() => setIsLoading(false), 220);
    return () => window.clearTimeout(timeout);
  }, []);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1120px] space-y-4 px-4 pb-12 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] space-y-4 px-4 pb-12 sm:px-6 lg:px-8">
      <h1>Messaggi</h1>
      {threads.length === 0 ? (
        <Card className="border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="py-10 text-sm text-[var(--color-text-muted)]">
            Nessuna conversazione disponibile.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Link href={`/messaggi/${thread.id}`} key={thread.id}>
              <Card className="border-[var(--color-border)] bg-[var(--color-surface)] transition-transform hover:-translate-y-0.5">
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{thread.counterpartName}</CardTitle>
                    <div className="flex items-center gap-2">
                      {thread.counterpartVerified ? (
                        <Badge variant="success">Verificato</Badge>
                      ) : null}
                      {thread.unreadCount > 0 ? (
                        <Badge variant="warning">{thread.unreadCount} nuove</Badge>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {thread.listingTitle} · {formatDate(thread.updatedAt)}
                  </p>
                </CardHeader>
                <CardContent className="text-sm text-[var(--color-text-muted)]">
                  {thread.lastMessagePreview}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
