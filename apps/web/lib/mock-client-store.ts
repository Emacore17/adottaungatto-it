'use client';

import type {
  FavoriteListingItem,
  MessageEntry,
  MessageThreadSummary,
  NotificationItem,
  SellerReview,
} from '@adottaungatto/types';
import { mockMessageThreads, mockMessages, mockNotifications } from '../mocks/engagement';
import { findMockReviewsBySeller } from '../mocks/listings';
import { isMockModeEnabled } from './mock-mode';

const favoritesKey = 'adottaungatto:favorites';
const threadsKey = 'adottaungatto:threads';
const messagesKey = 'adottaungatto:messages';
const notificationsKey = 'adottaungatto:notifications';

const parseJson = <TValue>(raw: string | null, fallback: TValue): TValue => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as TValue;
  } catch {
    return fallback;
  }
};

const readStorageValue = <TValue>(key: string, fallback: TValue): TValue => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return parseJson(window.localStorage.getItem(key), fallback);
};

const writeStorageValue = <TValue>(key: string, value: TValue): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const normalizeFavorites = (favorites: FavoriteListingItem[]) =>
  [...favorites].sort((left, right) => (left.addedAt < right.addedAt ? 1 : -1));

export const getMockFavoriteItems = (): FavoriteListingItem[] => {
  if (!isMockModeEnabled) {
    return [];
  }

  return normalizeFavorites(readStorageValue<FavoriteListingItem[]>(favoritesKey, []));
};

export const seedMockFavorites = (seed: FavoriteListingItem[]) => {
  if (!isMockModeEnabled) {
    return;
  }

  const existing = readStorageValue<FavoriteListingItem[]>(favoritesKey, []);
  if (existing.length === 0) {
    writeStorageValue(favoritesKey, normalizeFavorites(seed));
  }
};

export const toggleMockFavorite = (listingId: string) => {
  const current = getMockFavoriteItems();
  const isFavorite = current.some((item) => item.listingId === listingId);

  const next = isFavorite
    ? current.filter((item) => item.listingId !== listingId)
    : normalizeFavorites([
        ...current,
        {
          listingId,
          addedAt: new Date().toISOString(),
        },
      ]);

  writeStorageValue(favoritesKey, next);
  return next;
};

export const getMockThreads = (): MessageThreadSummary[] => {
  if (!isMockModeEnabled) {
    return [];
  }

  const seeded = readStorageValue<MessageThreadSummary[]>(threadsKey, []);
  if (seeded.length > 0) {
    return seeded;
  }

  writeStorageValue(threadsKey, mockMessageThreads);
  return mockMessageThreads;
};

export const getMockMessages = (threadId: string): MessageEntry[] => {
  if (!isMockModeEnabled) {
    return [];
  }

  const seeded = readStorageValue<MessageEntry[]>(messagesKey, []);
  if (seeded.length === 0) {
    writeStorageValue(messagesKey, mockMessages);
    return mockMessages.filter((message) => message.threadId === threadId);
  }

  return seeded.filter((message) => message.threadId === threadId);
};

export const appendMockMessage = (threadId: string, body: string) => {
  if (!isMockModeEnabled) {
    return [];
  }

  const allMessages = readStorageValue<MessageEntry[]>(messagesKey, mockMessages);
  const nextMessage: MessageEntry = {
    id: `msg-local-${threadId}-${allMessages.length + 1}`,
    threadId,
    senderRole: 'me',
    body,
    sentAt: new Date().toISOString(),
  };

  const nextMessages = [...allMessages, nextMessage];
  writeStorageValue(messagesKey, nextMessages);

  const allThreads = getMockThreads();
  const nextThreads = allThreads.map((thread) =>
    thread.id === threadId
      ? {
          ...thread,
          lastMessagePreview: body,
          updatedAt: nextMessage.sentAt,
          unreadCount: 0,
        }
      : thread,
  );
  writeStorageValue(threadsKey, nextThreads);

  return nextMessages.filter((message) => message.threadId === threadId);
};

export const getMockNotifications = (): NotificationItem[] => {
  if (!isMockModeEnabled) {
    return [];
  }

  const seeded = readStorageValue<NotificationItem[]>(notificationsKey, []);
  if (seeded.length > 0) {
    return seeded;
  }

  writeStorageValue(notificationsKey, mockNotifications);
  return mockNotifications;
};

export const markMockNotificationAsRead = (notificationId: string): NotificationItem[] => {
  const notifications = getMockNotifications();
  const nextNotifications = notifications.map((notification) =>
    notification.id === notificationId ? { ...notification, read: true } : notification,
  );
  writeStorageValue(notificationsKey, nextNotifications);
  return nextNotifications;
};

export const getMockSellerReviews = (username: string): SellerReview[] => {
  if (!isMockModeEnabled) {
    return [];
  }

  return findMockReviewsBySeller(username);
};
