'use client';

import { Button, Toast } from '@adottaungatto/ui';
import { LoaderCircle, MessageCircleMore } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SESSION_EXPIRED_MESSAGE, fetchWithAuthRefresh } from '../lib/client-auth-fetch';

type ToastState = {
  open: boolean;
  title: string;
  description?: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export function ListingMessageComposer({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const loginRedirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'info',
  });

  useEffect(
    () => () => {
      if (loginRedirectTimeoutRef.current !== null) {
        clearTimeout(loginRedirectTimeoutRef.current);
      }
    },
    [],
  );

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const normalizedBody = body.trim();
    if (!normalizedBody) {
      setToast({
        open: true,
        title: 'Messaggio vuoto',
        description: 'Scrivi un messaggio prima di contattare l’inserzionista.',
        variant: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithAuthRefresh(`/api/messages/listings/${listingId}/thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: normalizedBody,
          source: 'web_listing_detail',
        }),
      });
      const payload = asRecord(await response.json().catch(() => null));
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(SESSION_EXPIRED_MESSAGE);
        }
        throw new Error(String(payload.message ?? 'Impossibile aprire la conversazione.'));
      }

      const thread = asRecord(payload.thread);
      const threadId = typeof thread.id === 'string' ? thread.id : null;
      if (!threadId) {
        throw new Error('Risposta conversazione non valida.');
      }

      router.push(`/messaggi/${threadId}`);
      router.refresh();
    } catch (error) {
      const isSessionExpired = error instanceof Error && error.message === SESSION_EXPIRED_MESSAGE;
      if (isSessionExpired) {
        setToast({
          open: true,
          title: 'Sessione scaduta',
          description: 'Sessione scaduta, accedi di nuovo.',
          variant: 'warning',
        });

        if (loginRedirectTimeoutRef.current !== null) {
          clearTimeout(loginRedirectTimeoutRef.current);
        }

        loginRedirectTimeoutRef.current = setTimeout(() => {
          const nextPath = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
          router.refresh();
        }, 1200);
        return;
      }

      setToast({
        open: true,
        title: 'Invio non riuscito',
        description:
          error instanceof Error ? error.message : 'Impossibile aprire la conversazione.',
        variant: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        aria-busy={submitting}
        className="rounded-[28px] border border-[color:color-mix(in_srgb,var(--color-primary)_22%,var(--color-border)_78%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)] p-4"
      >
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <MessageCircleMore className="h-4 w-4 text-[var(--color-primary)]" />
          Contatta l’inserzionista in chat
        </div>
        <div className="space-y-3">
          <textarea
            aria-busy={submitting}
            className="min-h-[130px] w-full rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white_8%)] px-4 py-3 text-sm leading-6 text-[var(--color-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]"
            disabled={submitting}
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Presentati e spiega in poche righe perche sei interessato a questo gatto."
            value={body}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-[var(--color-text-muted)]">
                {body.trim().length}/2000 caratteri
              </p>
              {submitting ? (
                <p
                  aria-live="polite"
                  className="text-xs font-medium text-[var(--color-text-muted)]"
                >
                  Invio del messaggio in corso...
                </p>
              ) : null}
            </div>
            <Button
              className="h-11 rounded-full px-5"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              type="button"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Invio...
                </>
              ) : (
                'Invia messaggio'
              )}
            </Button>
          </div>
        </div>
      </div>

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
