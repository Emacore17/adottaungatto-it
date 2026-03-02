import { loadWebEnv } from '@adottaungatto/config';
import { cookies } from 'next/headers';
import { webSessionCookieName } from './auth';

const env = loadWebEnv();

export type MessageParticipantRole = 'owner' | 'requester';

export interface MessageParticipantSummary {
  role: MessageParticipantRole;
  email: string;
  providerSubject: string;
}

export interface MessageSummary {
  id: string;
  threadId: string;
  senderRole: MessageParticipantRole;
  senderEmail: string;
  body: string;
  createdAt: string;
}

export interface MessageThreadSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  latestMessageAt: string;
  unreadCount: number;
  viewerRole: MessageParticipantRole;
  otherParticipant: MessageParticipantSummary;
  latestMessage: MessageSummary | null;
}

export interface MessageThreadDetail extends MessageThreadSummary {
  messages: MessageSummary[];
}

export interface MessageThreadsPage {
  threads: MessageThreadSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  unreadMessages: number;
}

export interface MessageThreadPage {
  thread: MessageThreadDetail;
  pagination: {
    limit: number;
    beforeMessageId: string | null;
    hasMore: boolean;
  };
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseInteger = (value: unknown, fallbackValue: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallbackValue;
};

const parseMessageParticipantRole = (value: unknown): MessageParticipantRole =>
  value === 'owner' ? 'owner' : 'requester';

const parseMessageSummary = (value: unknown): MessageSummary | null => {
  const record = asRecord(value);
  if (
    typeof record.id !== 'string' ||
    typeof record.threadId !== 'string' ||
    typeof record.body !== 'string'
  ) {
    return null;
  }

  return {
    id: record.id,
    threadId: record.threadId,
    senderRole: parseMessageParticipantRole(record.senderRole),
    senderEmail: String(record.senderEmail ?? ''),
    body: record.body,
    createdAt: String(record.createdAt ?? ''),
  };
};

const parseMessageParticipantSummary = (value: unknown): MessageParticipantSummary | null => {
  const record = asRecord(value);
  if (typeof record.email !== 'string' || typeof record.providerSubject !== 'string') {
    return null;
  }

  return {
    role: parseMessageParticipantRole(record.role),
    email: record.email,
    providerSubject: record.providerSubject,
  };
};

const parseMessageThreadSummary = (value: unknown): MessageThreadSummary | null => {
  const record = asRecord(value);
  const otherParticipant = parseMessageParticipantSummary(record.otherParticipant);
  if (
    typeof record.id !== 'string' ||
    typeof record.listingId !== 'string' ||
    typeof record.listingTitle !== 'string' ||
    !otherParticipant
  ) {
    return null;
  }

  return {
    id: record.id,
    listingId: record.listingId,
    listingTitle: record.listingTitle,
    listingStatus: record.listingStatus === null ? null : String(record.listingStatus ?? ''),
    source: String(record.source ?? 'web_listing'),
    createdAt: String(record.createdAt ?? ''),
    updatedAt: String(record.updatedAt ?? ''),
    latestMessageAt: String(record.latestMessageAt ?? ''),
    unreadCount: parseInteger(record.unreadCount, 0),
    viewerRole: parseMessageParticipantRole(record.viewerRole),
    otherParticipant,
    latestMessage: parseMessageSummary(record.latestMessage),
  };
};

const parseMessageThreadDetail = (value: unknown): MessageThreadDetail | null => {
  const summary = parseMessageThreadSummary(value);
  if (!summary) {
    return null;
  }

  const record = asRecord(value);
  const rawMessages = Array.isArray(record.messages) ? record.messages : [];
  return {
    ...summary,
    messages: rawMessages
      .map((item) => parseMessageSummary(item))
      .filter((item): item is MessageSummary => item !== null),
  };
};

const parseThreadsPagination = (value: unknown): MessageThreadsPage['pagination'] => {
  const record = asRecord(value);
  return {
    limit: parseInteger(record.limit, 20),
    offset: parseInteger(record.offset, 0),
    total: parseInteger(record.total, 0),
    hasMore: record.hasMore === true,
  };
};

const parseThreadPagination = (value: unknown): MessageThreadPage['pagination'] => {
  const record = asRecord(value);
  return {
    limit: parseInteger(record.limit, 40),
    beforeMessageId: typeof record.beforeMessageId === 'string' ? record.beforeMessageId : null,
    hasMore: record.hasMore === true,
  };
};

const fetchAuthedJson = async (pathname: string) => {
  const cookieStore = await cookies();
  const token = cookieStore.get(webSessionCookieName)?.value;
  if (!token) {
    return null;
  }

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${pathname} with status ${response.status}.`);
  }

  return asRecord(await response.json());
};

export const fetchMessageThreads = async (
  options: { limit?: number; offset?: number } = {},
): Promise<MessageThreadsPage> => {
  const limit = Number.isFinite(options.limit) ? Math.trunc(options.limit ?? 20) : 20;
  const offset = Number.isFinite(options.offset) ? Math.trunc(options.offset ?? 0) : 0;
  const query = new URLSearchParams({
    limit: String(limit > 0 ? limit : 20),
    offset: String(offset >= 0 ? offset : 0),
  });
  const payload = await fetchAuthedJson(`/v1/messages/threads?${query.toString()}`);
  if (!payload) {
    return {
      threads: [],
      pagination: {
        limit,
        offset,
        total: 0,
        hasMore: false,
      },
      unreadMessages: 0,
    };
  }

  const rawThreads = Array.isArray(payload.threads) ? payload.threads : [];
  return {
    threads: rawThreads
      .map((item) => parseMessageThreadSummary(item))
      .filter((item): item is MessageThreadSummary => item !== null),
    pagination: parseThreadsPagination(payload.pagination),
    unreadMessages: parseInteger(payload.unreadMessages, 0),
  };
};

export const fetchMessageThread = async (
  threadId: string,
  options: { limit?: number; beforeMessageId?: string | null } = {},
): Promise<MessageThreadPage | null> => {
  const normalizedThreadId = threadId.trim();
  if (!/^[1-9]\d*$/.test(normalizedThreadId)) {
    return null;
  }

  const query = new URLSearchParams();
  if (typeof options.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0) {
    query.set('limit', String(Math.trunc(options.limit)));
  }
  if (typeof options.beforeMessageId === 'string' && /^[1-9]\d*$/.test(options.beforeMessageId)) {
    query.set('beforeMessageId', options.beforeMessageId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await fetchAuthedJson(`/v1/messages/threads/${normalizedThreadId}${suffix}`);
  if (!payload) {
    return null;
  }

  const thread = parseMessageThreadDetail(payload.thread);
  if (!thread) {
    return null;
  }

  return {
    thread,
    pagination: parseThreadPagination(payload.pagination),
  };
};
