'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { LinkButton } from './link-button';

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export function LiveMessagesLink({ initialUnreadCount }: { initialUnreadCount: number }) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const refreshUnreadCount = useEffectEvent(async () => {
    const response = await fetch('/api/messages/threads?limit=1&offset=0', {
      cache: 'no-store',
    });
    const payload = asRecord(await response.json().catch(() => null));
    if (!response.ok) {
      throw new Error(String(payload.message ?? 'Impossibile aggiornare i messaggi.'));
    }

    setUnreadCount(typeof payload.unreadMessages === 'number' ? payload.unreadMessages : 0);
  });

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    const fallbackInterval = window.setInterval(() => {
      void refreshUnreadCount().catch(() => undefined);
    }, 45_000);

    if (typeof window.EventSource !== 'function') {
      return () => {
        window.clearInterval(fallbackInterval);
      };
    }

    const eventSource = new window.EventSource('/api/messages/events');
    const handleThreadUpdated = () => {
      void refreshUnreadCount().catch(() => undefined);
    };

    eventSource.addEventListener('thread_updated', handleThreadUpdated);
    eventSource.onerror = () => undefined;

    return () => {
      window.clearInterval(fallbackInterval);
      eventSource.removeEventListener('thread_updated', handleThreadUpdated);
      eventSource.close();
    };
  }, [refreshUnreadCount]);

  return (
    <LinkButton className="hidden h-9 items-center gap-2 px-3 sm:inline-flex" href="/messaggi" variant="outline">
      Messaggi
      {unreadCount > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[11px] font-semibold text-[var(--color-primary-foreground)]">
          {unreadCount}
        </span>
      ) : null}
    </LinkButton>
  );
}
