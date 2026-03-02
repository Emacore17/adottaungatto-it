'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Toast } from '@adottaungatto/ui';
import { LoaderCircle, MessageCircle, RefreshCcw, SendHorizontal } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { formatDate } from '../lib/formatters';
import type { MessageSummary, MessageThreadPage } from '../lib/messages';

type ToastState = {
  open: boolean;
  title: string;
  description?: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
};

const mergeMessages = (existing: MessageSummary[], incoming: MessageSummary[]) => {
  const byId = new Map<string, MessageSummary>();
  for (const message of [...existing, ...incoming]) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort((left, right) => Number(left.id) - Number(right.id));
};

const buildCounterpartLabel = (thread: MessageThreadPage['thread']) =>
  thread.viewerRole === 'owner'
    ? `Interessato: ${thread.otherParticipant.email}`
    : `Inserzionista: ${thread.otherParticipant.email}`;

const isMessageMine = (thread: MessageThreadPage['thread'], message: MessageSummary) =>
  thread.viewerRole === message.senderRole;

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseThreadPagePayload = (value: unknown): MessageThreadPage | null => {
  const record = asRecord(value);
  const thread = asRecord(record.thread);
  const pagination = asRecord(record.pagination);
  const rawMessages = Array.isArray(thread.messages) ? thread.messages : [];
  if (typeof thread.id !== 'string' || typeof thread.listingId !== 'string') {
    return null;
  }

  return {
    thread: {
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
        role:
          thread.otherParticipant && asRecord(thread.otherParticipant).role === 'owner'
            ? 'owner'
            : 'requester',
        email: String(asRecord(thread.otherParticipant).email ?? ''),
        providerSubject: String(asRecord(thread.otherParticipant).providerSubject ?? ''),
      },
      latestMessage:
        thread.latestMessage && typeof asRecord(thread.latestMessage).id === 'string'
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
      messages: rawMessages
        .map((item) => {
          const message = asRecord(item);
          if (
            typeof message.id !== 'string' ||
            typeof message.threadId !== 'string' ||
            typeof message.body !== 'string'
          ) {
            return null;
          }

          return {
            id: message.id,
            threadId: message.threadId,
            senderRole: message.senderRole === 'owner' ? 'owner' : 'requester',
            senderEmail: String(message.senderEmail ?? ''),
            body: message.body,
            createdAt: String(message.createdAt ?? ''),
          } satisfies MessageSummary;
        })
        .filter((item): item is MessageSummary => item !== null),
    },
    pagination: {
      limit: typeof pagination.limit === 'number' ? pagination.limit : 40,
      beforeMessageId:
        typeof pagination.beforeMessageId === 'string' ? pagination.beforeMessageId : null,
      hasMore: pagination.hasMore === true,
    },
  };
};

export function MessageThreadView({ initialThreadPage }: { initialThreadPage: MessageThreadPage }) {
  const [threadPage, setThreadPage] = useState(initialThreadPage);
  const [composerValue, setComposerValue] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'info',
  });
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThreadPage(initialThreadPage);
  }, [initialThreadPage]);

  const markRead = useEffectEvent(async (threadId: string, unreadCount: number) => {
    if (unreadCount === 0) {
      return;
    }

    await fetch(`/api/messages/threads/${threadId}/read`, {
      method: 'POST',
    });

    setThreadPage((currentValue) => ({
      ...currentValue,
      thread: {
        ...currentValue.thread,
        unreadCount: 0,
      },
    }));
  });

  const refreshThread = useEffectEvent(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(
        `/api/messages/threads/${threadPage.thread.id}?limit=${threadPage.pagination.limit.toString()}`,
        {
          cache: 'no-store',
        },
      );
      const payload = parseThreadPagePayload(await response.json().catch(() => null));
      if (!response.ok || !payload) {
        throw new Error('Impossibile aggiornare la conversazione.');
      }

      setThreadPage((currentValue) => ({
        thread: {
          ...payload.thread,
          messages: mergeMessages(currentValue.thread.messages, payload.thread.messages),
        },
        pagination: {
          ...currentValue.pagination,
          limit: payload.pagination.limit,
          hasMore: currentValue.pagination.hasMore || payload.pagination.hasMore,
        },
      }));

      if (payload.thread.unreadCount > 0) {
        await markRead(payload.thread.id, payload.thread.unreadCount);
      }
    } catch (error) {
      setToast({
        open: true,
        title: 'Aggiornamento non riuscito',
        description:
          error instanceof Error ? error.message : 'Impossibile aggiornare la conversazione.',
        variant: 'warning',
      });
    } finally {
      setRefreshing(false);
    }
  });

  const loadOlderMessages = async () => {
    const beforeMessageId = threadPage.thread.messages[0]?.id;
    if (!beforeMessageId) {
      return;
    }

    setLoadingOlder(true);
    try {
      const response = await fetch(
        `/api/messages/threads/${threadPage.thread.id}?limit=${threadPage.pagination.limit.toString()}&beforeMessageId=${beforeMessageId}`,
        {
          cache: 'no-store',
        },
      );
      const payload = parseThreadPagePayload(await response.json().catch(() => null));
      if (!response.ok || !payload) {
        throw new Error('Impossibile caricare i messaggi precedenti.');
      }

      setThreadPage((currentValue) => ({
        thread: {
          ...payload.thread,
          messages: mergeMessages(payload.thread.messages, currentValue.thread.messages),
        },
        pagination: payload.pagination,
      }));
    } catch (error) {
      setToast({
        open: true,
        title: 'Caricamento non riuscito',
        description:
          error instanceof Error ? error.message : 'Impossibile caricare i messaggi precedenti.',
        variant: 'danger',
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async () => {
    const body = composerValue.trim();
    if (!body) {
      setToast({
        open: true,
        title: 'Messaggio vuoto',
        description: 'Scrivi il contenuto prima di inviare.',
        variant: 'warning',
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/messages/threads/${threadPage.thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      });
      const rawPayload = asRecord(await response.json().catch(() => null));
      if (!response.ok) {
        throw new Error(String(rawPayload.message ?? 'Impossibile inviare il messaggio.'));
      }

      const nextThread = parseThreadPagePayload({
        thread: rawPayload.thread,
        pagination: {
          limit: threadPage.pagination.limit,
          beforeMessageId: null,
          hasMore: threadPage.pagination.hasMore,
        },
      });

      if (!nextThread) {
        throw new Error('Risposta thread non valida.');
      }

      setThreadPage((currentValue) => ({
        thread: {
          ...nextThread.thread,
          messages: mergeMessages(currentValue.thread.messages, nextThread.thread.messages),
          unreadCount: 0,
        },
        pagination: {
          ...currentValue.pagination,
          limit: nextThread.pagination.limit,
        },
      }));
      setComposerValue('');

      window.requestAnimationFrame(() => {
        messagesContainerRef.current?.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Invio non riuscito',
        description: error instanceof Error ? error.message : 'Impossibile inviare il messaggio.',
        variant: 'danger',
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    void markRead(threadPage.thread.id, threadPage.thread.unreadCount);
    const intervalId = window.setInterval(() => {
      void refreshThread();
    }, 12000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [markRead, refreshThread, threadPage.thread.id, threadPage.thread.unreadCount]);

  return (
    <>
      <Card className="overflow-hidden border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
        <CardHeader className="border-b border-[var(--color-border)]/80 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-[1.15rem]">{threadPage.thread.listingTitle}</CardTitle>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                {buildCounterpartLabel(threadPage.thread)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                Ultimo aggiornamento {formatDate(threadPage.thread.latestMessageAt)}
              </span>
              <Button
                className="h-10 rounded-full px-4"
                disabled={refreshing}
                onClick={() => void refreshThread()}
                type="button"
                variant="outline"
              >
                {refreshing ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {threadPage.pagination.hasMore ? (
            <div className="flex justify-center">
              <Button
                className="rounded-full px-4"
                disabled={loadingOlder}
                onClick={() => void loadOlderMessages()}
                type="button"
                variant="secondary"
              >
                {loadingOlder ? 'Carico...' : 'Carica messaggi precedenti'}
              </Button>
            </div>
          ) : null}

          <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1" ref={messagesContainerRef}>
            {threadPage.thread.messages.map((message) => {
              const mine = isMessageMine(threadPage.thread, message);
              return (
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`} key={message.id}>
                  <div
                    className={`max-w-[42rem] rounded-[24px] px-4 py-3 shadow-[0_14px_30px_rgb(66_40_49_/_0.08)] ${
                      mine
                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                        : 'border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_90%,white_10%)] text-[var(--color-text)]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <p
                        className={`text-xs font-semibold ${mine ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}
                      >
                        {mine ? 'Tu' : message.senderEmail}
                      </p>
                      <p
                        className={`text-xs ${mine ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}
                      >
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                  </div>
                </div>
              );
            })}

            {threadPage.thread.messages.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_58%,transparent)] px-4 py-6 text-center text-sm leading-6 text-[var(--color-text-muted)]">
                Nessun messaggio disponibile in questa conversazione.
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-[color:color-mix(in_srgb,var(--color-primary)_20%,var(--color-border)_80%)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] p-4">
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
              <MessageCircle className="h-4 w-4 text-[var(--color-primary)]" />
              Rispondi nella conversazione
            </div>
            <div className="space-y-3">
              <textarea
                className="min-h-[124px] w-full rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white_8%)] px-4 py-3 text-sm leading-6 text-[var(--color-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]"
                maxLength={2000}
                onChange={(event) => setComposerValue(event.target.value)}
                placeholder="Scrivi un messaggio chiaro e utile. Evita dati sensibili che non vuoi condividere."
                value={composerValue}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {composerValue.trim().length}/2000 caratteri
                </p>
                <Button
                  className="h-11 rounded-full px-5"
                  disabled={sending}
                  onClick={() => void sendMessage()}
                  type="button"
                >
                  {sending ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Invio...
                    </>
                  ) : (
                    <>
                      <SendHorizontal className="mr-2 h-4 w-4" />
                      Invia messaggio
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Toast
        description={toast.description}
        onOpenChange={(open) => setToast((currentValue) => ({ ...currentValue, open }))}
        open={toast.open}
        title={toast.title}
        variant={toast.variant}
      />
    </>
  );
}
