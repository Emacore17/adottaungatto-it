'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { appendMockMessage, getMockMessages, getMockThreads } from '../../../lib/mock-client-store';

const formatTime = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(rawDate),
  );

export default function MessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId;
  const thread = getMockThreads().find((item) => item.id === threadId) ?? null;
  const [messageDraft, setMessageDraft] = useState('');
  const [messages, setMessages] = useState(() => getMockMessages(threadId));

  const sortedMessages = useMemo(
    () => [...messages].sort((left, right) => left.sentAt.localeCompare(right.sentAt)),
    [messages],
  );

  if (!thread) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-[920px] space-y-4 px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="space-y-2">
          <Link className="text-xs text-[var(--color-primary)]" href="/messaggi">
            â† Torna alle conversazioni
          </Link>
          <CardTitle>{thread.counterpartName}</CardTitle>
          <p className="text-xs text-[var(--color-text-muted)]">{thread.listingTitle}</p>
        </CardHeader>
      </Card>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardContent className="space-y-3 py-4">
          {sortedMessages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Nessun messaggio in questa chat.
            </p>
          ) : (
            sortedMessages.map((message) => (
              <div
                className={[
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  message.senderRole === 'me'
                    ? 'ml-auto bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text)]',
                ].join(' ')}
                key={message.id}
              >
                <p>{message.body}</p>
                <p
                  className={[
                    'mt-1 text-[10px]',
                    message.senderRole === 'me'
                      ? 'text-[var(--color-primary-foreground)]/80'
                      : 'text-[var(--color-text-muted)]',
                  ].join(' ')}
                >
                  {formatTime(message.sentAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardContent className="space-y-3 py-4">
          <label className="sr-only" htmlFor="message-body">
            Scrivi messaggio
          </label>
          <textarea
            className="min-h-24 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            id="message-body"
            onChange={(event) => setMessageDraft(event.target.value)}
            placeholder="Scrivi qui il tuo messaggio..."
            value={messageDraft}
          />
          <div className="flex justify-end">
            <Button
              disabled={messageDraft.trim().length < 2}
              onClick={() => {
                setMessages(appendMockMessage(threadId, messageDraft.trim()));
                setMessageDraft('');
              }}
              type="button"
            >
              Invia messaggio
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
