'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { MessageThreadList } from './message-thread-list';
import { MessageThreadView } from './message-thread-view';

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

type MessageThreadPage = {
  thread: MessageThreadSummary & {
    messages: MessageSummary[];
  };
  pagination: {
    limit: number;
    beforeMessageId: string | null;
    hasMore: boolean;
  };
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

export function MessageThreadWorkspace({
  initialThreadListPage,
  initialThreadPage,
}: {
  initialThreadListPage: MessageThreadsPage;
  initialThreadPage: MessageThreadPage;
}) {
  const [threadListPage, setThreadListPage] = useState(initialThreadListPage);

  useEffect(() => {
    setThreadListPage(initialThreadListPage);
  }, [initialThreadListPage]);

  const refreshThreads = useEffectEvent(async () => {
    const response = await fetch(
      `/api/messages/threads?limit=${threadListPage.pagination.limit.toString()}&offset=0`,
      {
        cache: 'no-store',
      },
    );
    const payload = parseThreadsPagePayload(await response.json().catch(() => null));
    if (!response.ok || !payload) {
      throw new Error('Impossibile aggiornare le conversazioni.');
    }

    setThreadListPage(payload);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <MessageThreadList
        currentThreadId={initialThreadPage.thread.id}
        threads={threadListPage.threads}
      />
      <MessageThreadView initialThreadPage={initialThreadPage} />
    </div>
  );
}
