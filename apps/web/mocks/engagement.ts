import type {
  FavoriteListingItem,
  MessageEntry,
  MessageThreadSummary,
  NotificationItem,
} from '@adottaungatto/types';

const toIso = (input: string) => new Date(input).toISOString();

export const mockFavoriteListingIds: FavoriteListingItem[] = [
  { listingId: '101', addedAt: toIso('2026-02-23T09:10:00.000Z') },
  { listingId: '105', addedAt: toIso('2026-02-24T11:20:00.000Z') },
  { listingId: '110', addedAt: toIso('2026-02-25T14:40:00.000Z') },
];

export const mockMessageThreads: MessageThreadSummary[] = [
  {
    id: 'thread-roma-1',
    listingId: '101',
    listingTitle: 'Milo cerca casa a Roma',
    counterpartName: 'Gatti Roma Rescue',
    counterpartVerified: true,
    unreadCount: 2,
    lastMessagePreview: 'Possiamo fissare un colloquio sabato mattina?',
    updatedAt: toIso('2026-02-25T17:20:00.000Z'),
  },
  {
    id: 'thread-milano-2',
    listingId: '102',
    listingTitle: 'Luna dolce e socievole',
    counterpartName: 'Miao Family Milano',
    counterpartVerified: true,
    unreadCount: 0,
    lastMessagePreview: 'Ti mando il questionario pre-affido via mail.',
    updatedAt: toIso('2026-02-23T10:00:00.000Z'),
  },
  {
    id: 'thread-torino-3',
    listingId: '103',
    listingTitle: 'Stallo urgente per Frida',
    counterpartName: 'Rescue Piemonte',
    counterpartVerified: true,
    unreadCount: 1,
    lastMessagePreview: 'Grazie, ti confermo i dettagli entro sera.',
    updatedAt: toIso('2026-02-22T20:30:00.000Z'),
  },
];

export const mockMessages: MessageEntry[] = [
  {
    id: 'msg-1',
    threadId: 'thread-roma-1',
    senderRole: 'other',
    body: 'Ciao! Grazie per averci scritto per Milo.',
    sentAt: toIso('2026-02-25T16:12:00.000Z'),
  },
  {
    id: 'msg-2',
    threadId: 'thread-roma-1',
    senderRole: 'me',
    body: 'Ciao, vorrei sapere se e compatibile con appartamento.',
    sentAt: toIso('2026-02-25T16:15:00.000Z'),
  },
  {
    id: 'msg-3',
    threadId: 'thread-roma-1',
    senderRole: 'other',
    body: 'Si, e abituato. Possiamo fissare un colloquio sabato mattina?',
    sentAt: toIso('2026-02-25T17:20:00.000Z'),
  },
  {
    id: 'msg-4',
    threadId: 'thread-milano-2',
    senderRole: 'other',
    body: 'Ti mando il questionario pre-affido via mail.',
    sentAt: toIso('2026-02-23T10:00:00.000Z'),
  },
  {
    id: 'msg-5',
    threadId: 'thread-torino-3',
    senderRole: 'me',
    body: 'Posso aiutare con stallo temporaneo da domenica.',
    sentAt: toIso('2026-02-22T20:12:00.000Z'),
  },
  {
    id: 'msg-6',
    threadId: 'thread-torino-3',
    senderRole: 'other',
    body: 'Grazie, ti confermo i dettagli entro sera.',
    sentAt: toIso('2026-02-22T20:30:00.000Z'),
  },
];

export const mockNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'message',
    title: 'Nuovo messaggio',
    body: 'Hai 2 messaggi non letti su Milo.',
    href: '/messaggi/thread-roma-1',
    createdAt: toIso('2026-02-25T17:21:00.000Z'),
    read: false,
  },
  {
    id: 'notif-2',
    type: 'favorite',
    title: 'Prezzo aggiornato',
    body: 'Uno dei tuoi preferiti ha aggiornato il prezzo.',
    href: '/preferiti',
    createdAt: toIso('2026-02-24T10:00:00.000Z'),
    read: false,
  },
  {
    id: 'notif-3',
    type: 'system',
    title: 'Suggerimento sicurezza',
    body: 'Controlla la nostra guida anti-truffa prima di finalizzare un affido.',
    href: '/sicurezza',
    createdAt: toIso('2026-02-20T09:00:00.000Z'),
    read: true,
  },
];
