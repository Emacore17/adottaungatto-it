'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { useEffect, useEffectEvent, useState } from 'react';
import { SESSION_EXPIRED_MESSAGE, fetchWithAuthRefresh } from '../lib/client-auth-fetch';
import { LinkButton } from './link-button';
import { MessageThreadList } from './message-thread-list';

type MessageParticipantSummary = {
  role: 'owner' | 'requester';
  email: string;
  providerSubject: string;
};

type MessageSummary = {
  id: string;
  threadId: string;
  senderRole: 'owner' | 'requester';
  senderEmail: string;
  body: string;
  createdAt: string;
};

type MessageThreadSummary = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  latestMessageAt: string;
  unreadCount: number;
  viewerRole: 'owner' | 'requester';
  otherParticipant: MessageParticipantSummary;
  latestMessage: MessageSummary | null;
};

type MessageThreadsPage = {
  threads: MessageThreadSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  unreadMessages: number;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseThreadsPagePayload = (value: unknown): MessageThreadsPage | null => {
  const record = asRecord(value);
  const rawThreads = Array.isArray(record.threads) ? record.threads : [];
  const pagination = asRecord(record.pagination);

  return {
    threads: rawThreads
      .map((threadValue) => {
        const thread = asRecord(threadValue);
        const otherParticipant = asRecord(thread.otherParticipant);
        if (typeof thread.id !== 'string' || typeof thread.listingId !== 'string') {
          return null;
        }

        return {
          id: thread.id,
          listingId: thread.listingId,
          listingTitle: String(thread.listingTitle ?? ''),
          listingStatus: thread.listingStatus === null ? null : String(thread.listingStatus ?? ''),
          source: String(thread.source ?? 'web_listing'),
          createdAt: String(thread.createdAt ?? ''),
          updatedAt: String(thread.updatedAt ?? ''),
          latestMessageAt: String(thread.latestMessageAt ?? ''),
          unreadCount: typeof thread.unreadCount === 'number' ? thread.unreadCount : 0,
          viewerRole: thread.viewerRole === 'owner' ? 'owner' : 'requester',
          otherParticipant: {
            role: otherParticipant.role === 'owner' ? 'owner' : 'requester',
            email: String(otherParticipant.email ?? ''),
            providerSubject: String(otherParticipant.providerSubject ?? ''),
          },
          latestMessage:
            typeof asRecord(thread.latestMessage).id === 'string'
              ? {
                  id: String(asRecord(thread.latestMessage).id),
                  threadId: String(asRecord(thread.latestMessage).threadId ?? thread.id),
                  senderRole:
                    asRecord(thread.latestMessage).senderRole === 'owner' ? 'owner' : 'requester',
                  senderEmail: String(asRecord(thread.latestMessage).senderEmail ?? ''),
                  body: String(asRecord(thread.latestMessage).body ?? ''),
                  createdAt: String(asRecord(thread.latestMessage).createdAt ?? ''),
                }
              : null,
        } satisfies MessageThreadSummary;
      })
      .filter((thread): thread is MessageThreadSummary => thread !== null),
    pagination: {
      limit: typeof pagination.limit === 'number' ? pagination.limit : 30,
      offset: typeof pagination.offset === 'number' ? pagination.offset : 0,
      total: typeof pagination.total === 'number' ? pagination.total : 0,
      hasMore: pagination.hasMore === true,
    },
    unreadMessages: typeof record.unreadMessages === 'number' ? record.unreadMessages : 0,
  };
};

export function MessagesInboxOverview({
  initialThreadPage,
}: {
  initialThreadPage: MessageThreadsPage;
}) {
  const [threadPage, setThreadPage] = useState(initialThreadPage);

  useEffect(() => {
    setThreadPage(initialThreadPage);
  }, [initialThreadPage]);

  const refreshThreads = useEffectEvent(async () => {
    const response = await fetchWithAuthRefresh(
      `/api/messages/threads?limit=${threadPage.pagination.limit.toString()}&offset=0`,
      {
        cache: 'no-store',
      },
    );
    const payload = parseThreadsPagePayload(await response.json().catch(() => null));
    if (!response.ok || !payload) {
      if (response.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE);
      }
      throw new Error('Impossibile aggiornare le conversazioni.');
    }

    setThreadPage(payload);
  });

  useEffect(() => {
    const fallbackInterval = window.setInterval(() => {
      void refreshThreads().catch(() => undefined);
    }, 45_000);

    if (typeof window.EventSource !== 'function') {
      return () => {
        window.clearInterval(fallbackInterval);
      };
    }

    const eventSource = new window.EventSource('/api/messages/events');
    const handleUpdate = () => {
      void refreshThreads().catch(() => undefined);
    };

    eventSource.addEventListener('thread_updated', handleUpdate);
    eventSource.onerror = () => undefined;

    return () => {
      window.clearInterval(fallbackInterval);
      eventSource.removeEventListener('thread_updated', handleUpdate);
      eventSource.close();
    };
  }, [refreshThreads]);

  const latestThread = threadPage.threads[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <MessageThreadList threads={threadPage.threads} />

      {latestThread ? (
        <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Conversazione piu recente</CardTitle>
                <Badge variant="secondary">{threadPage.threads.length} thread</Badge>
                <Badge variant="outline">{threadPage.unreadMessages} non letti</Badge>
              </div>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Riprendi subito l&apos;ultima chat aperta oppure entra in inbox per sceglierne una
                diversa.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_60%,transparent)] px-4 py-4">
              <p className="text-base font-semibold text-[var(--color-text)]">
                {latestThread.listingTitle}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {latestThread.viewerRole === 'owner' ? 'Interessato' : 'Inserzionista'}:{' '}
                {latestThread.otherParticipant.email}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                {latestThread.latestMessage?.body ?? 'Nessun messaggio disponibile.'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <LinkButton href={`/messaggi/${latestThread.id}`}>Apri conversazione</LinkButton>
            <LinkButton href="/annunci" variant="outline">
              Torna agli annunci
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <CardTitle>Nessuna conversazione attiva</CardTitle>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Apri un annuncio e invia il primo messaggio per iniziare a usare la chat interna.
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <LinkButton href="/annunci">Esplora gli annunci</LinkButton>
            <LinkButton href="/account/annunci" variant="outline">
              I miei annunci
            </LinkButton>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
