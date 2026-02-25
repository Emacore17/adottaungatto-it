import 'server-only';

import { loadAdminEnv } from '@adottaungatto/config';
import { cookies } from 'next/headers';
import { adminSessionCookieName } from './auth';
import {
  type ListingStatus,
  type ModerationQueueItem,
  type ModerationQueueResponse,
  listingStatusValues,
} from './moderation-types';

const env = loadAdminEnv();
const listingStatusSet = new Set<string>(listingStatusValues);

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asNullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

const parseListingStatus = (value: unknown): ListingStatus => {
  if (typeof value !== 'string' || !listingStatusSet.has(value)) {
    return 'pending_review';
  }

  return value as ListingStatus;
};

const parseModerationQueueItem = (value: unknown): ModerationQueueItem | null => {
  const record = asRecord(value);
  if (typeof record.id !== 'string' || typeof record.title !== 'string') {
    return null;
  }

  return {
    id: record.id,
    ownerUserId: String(record.ownerUserId ?? ''),
    title: record.title,
    description: String(record.description ?? ''),
    listingType: String(record.listingType ?? ''),
    priceAmount: asNullableString(record.priceAmount),
    currency: String(record.currency ?? 'EUR'),
    ageText: String(record.ageText ?? ''),
    sex: String(record.sex ?? ''),
    breed: asNullableString(record.breed),
    status: parseListingStatus(record.status),
    regionId: String(record.regionId ?? ''),
    provinceId: String(record.provinceId ?? ''),
    comuneId: String(record.comuneId ?? ''),
    contactName: asNullableString(record.contactName),
    contactPhone: asNullableString(record.contactPhone),
    contactEmail: asNullableString(record.contactEmail),
    publishedAt: asNullableString(record.publishedAt),
    archivedAt: asNullableString(record.archivedAt),
    createdAt: String(record.createdAt ?? ''),
    updatedAt: String(record.updatedAt ?? ''),
    deletedAt: asNullableString(record.deletedAt),
    ownerEmail: String(record.ownerEmail ?? ''),
    regionName: String(record.regionName ?? ''),
    provinceName: String(record.provinceName ?? ''),
    provinceSigla: String(record.provinceSigla ?? ''),
    comuneName: String(record.comuneName ?? ''),
    mediaCount:
      typeof record.mediaCount === 'number' && Number.isFinite(record.mediaCount)
        ? record.mediaCount
        : Number.parseInt(String(record.mediaCount ?? '0'), 10) || 0,
  };
};

export const fetchModerationQueue = async (limit: number): Promise<ModerationQueueResponse> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName)?.value;
  if (!token) {
    throw new Error('Missing admin session token.');
  }

  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/v1/admin/moderation/queue?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch moderation queue with status ${response.status}.`);
  }

  const payload = asRecord(await response.json());
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .map((item) => parseModerationQueueItem(item))
    .filter((item): item is ModerationQueueItem => item !== null);

  const parsedLimit = Number.parseInt(String(payload.limit ?? limit), 10);

  return {
    items,
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : limit,
  };
};
