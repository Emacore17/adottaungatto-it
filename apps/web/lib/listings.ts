import { loadWebEnv } from '@adottaungatto/config';
import type { ListingCardData } from '@adottaungatto/types';
import { cookies } from 'next/headers';
import { findMockListingBySlug, mockListings } from '../mocks/listings';
import { webSessionCookieName } from './auth';
import { shouldFallbackToMock } from './mock-mode';

const env = loadWebEnv();

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'suspended'
  | 'archived';

export interface MyListing {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  listingType: string;
  priceAmount: string | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  status: ListingStatus;
  regionId: string;
  provinceId: string;
  comuneId: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PublicListingMedia {
  id: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  position: number;
  isPrimary: boolean;
  objectUrl: string;
}

export interface PublicListingSummary {
  id: string;
  title: string;
  description: string;
  listingType: string;
  priceAmount: string | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  publishedAt: string | null;
  createdAt: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  distanceKm: number | null;
  mediaCount: number;
  primaryMedia: PublicListingMedia | null;
}

export interface PublicListingDetail extends PublicListingSummary {
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  media: PublicListingMedia[];
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseListing = (value: unknown): MyListing | null => {
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
    priceAmount: record.priceAmount === null ? null : String(record.priceAmount ?? ''),
    currency: String(record.currency ?? 'EUR'),
    ageText: String(record.ageText ?? ''),
    sex: String(record.sex ?? ''),
    breed: record.breed === null ? null : String(record.breed ?? ''),
    status: String(record.status ?? 'pending_review') as ListingStatus,
    regionId: String(record.regionId ?? ''),
    provinceId: String(record.provinceId ?? ''),
    comuneId: String(record.comuneId ?? ''),
    contactName: record.contactName === null ? null : String(record.contactName ?? ''),
    contactPhone: record.contactPhone === null ? null : String(record.contactPhone ?? ''),
    contactEmail: record.contactEmail === null ? null : String(record.contactEmail ?? ''),
    publishedAt: record.publishedAt === null ? null : String(record.publishedAt ?? ''),
    archivedAt: record.archivedAt === null ? null : String(record.archivedAt ?? ''),
    createdAt: String(record.createdAt ?? ''),
    updatedAt: String(record.updatedAt ?? ''),
    deletedAt: record.deletedAt === null ? null : String(record.deletedAt ?? ''),
  };
};

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

const parseNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const parsePublicMedia = (value: unknown): PublicListingMedia | null => {
  const record = asRecord(value);
  if (typeof record.id !== 'string' || typeof record.objectUrl !== 'string') {
    return null;
  }

  return {
    id: record.id,
    mimeType: String(record.mimeType ?? 'image/jpeg'),
    width: typeof record.width === 'number' ? record.width : null,
    height: typeof record.height === 'number' ? record.height : null,
    position: parseInteger(record.position, 1),
    isPrimary: record.isPrimary === true,
    objectUrl: record.objectUrl,
  };
};

const parsePublicSummary = (value: unknown): PublicListingSummary | null => {
  const record = asRecord(value);
  if (typeof record.id !== 'string' || typeof record.title !== 'string') {
    return null;
  }

  return {
    id: record.id,
    title: record.title,
    description: String(record.description ?? ''),
    listingType: String(record.listingType ?? ''),
    priceAmount: record.priceAmount === null ? null : String(record.priceAmount ?? ''),
    currency: String(record.currency ?? 'EUR'),
    ageText: String(record.ageText ?? ''),
    sex: String(record.sex ?? ''),
    breed: record.breed === null ? null : String(record.breed ?? ''),
    publishedAt: record.publishedAt === null ? null : String(record.publishedAt ?? ''),
    createdAt: String(record.createdAt ?? ''),
    regionName: String(record.regionName ?? ''),
    provinceName: String(record.provinceName ?? ''),
    provinceSigla: String(record.provinceSigla ?? ''),
    comuneName: String(record.comuneName ?? ''),
    distanceKm: parseNullableNumber(record.distanceKm),
    mediaCount: parseInteger(record.mediaCount, 0),
    primaryMedia: parsePublicMedia(record.primaryMedia),
  };
};

const parsePublicDetail = (value: unknown): PublicListingDetail | null => {
  const summary = parsePublicSummary(value);
  if (!summary) {
    return null;
  }

  const record = asRecord(value);
  const rawMedia = Array.isArray(record.media) ? record.media : [];

  return {
    ...summary,
    contactName: record.contactName === null ? null : String(record.contactName ?? ''),
    contactPhone: record.contactPhone === null ? null : String(record.contactPhone ?? ''),
    contactEmail: record.contactEmail === null ? null : String(record.contactEmail ?? ''),
    media: rawMedia
      .map((item) => parsePublicMedia(item))
      .filter((item): item is PublicListingMedia => item !== null),
  };
};

const mapMockListingToPublicSummary = (listing: ListingCardData): PublicListingSummary => {
  const primaryMedia = listing.media.find((media) => media.isPrimary) ?? listing.media[0] ?? null;

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    listingType: listing.listingType,
    priceAmount: listing.priceAmount === null ? null : String(listing.priceAmount),
    currency: listing.currency,
    ageText: listing.ageText,
    sex: listing.sex,
    breed: listing.breed,
    publishedAt: listing.publishedAt,
    createdAt: listing.publishedAt,
    regionName: listing.region,
    provinceName: listing.province,
    provinceSigla: listing.province,
    comuneName: listing.city,
    distanceKm: listing.distanceKm,
    mediaCount: listing.media.length,
    primaryMedia: primaryMedia
      ? {
          id: primaryMedia.id,
          mimeType: 'image/svg+xml',
          width: primaryMedia.width,
          height: primaryMedia.height,
          position: 1,
          isPrimary: primaryMedia.isPrimary === true,
          objectUrl: primaryMedia.src,
        }
      : null,
  };
};

const mapMockListingToPublicDetail = (listing: ListingCardData): PublicListingDetail => ({
  ...mapMockListingToPublicSummary(listing),
  contactName: listing.sellerUsername,
  contactPhone: null,
  contactEmail: `${listing.sellerUsername}@adottaungatto.it`,
  media: listing.media.map((media, index) => ({
    id: media.id,
    mimeType: 'image/svg+xml',
    width: media.width,
    height: media.height,
    position: index + 1,
    isPrimary: media.isPrimary === true,
    objectUrl: media.src,
  })),
});

export const fetchMyListings = async (): Promise<MyListing[]> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(webSessionCookieName)?.value;
  if (!token) {
    return [];
  }

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/listings/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch listings with status ${response.status}.`);
  }

  const payload = asRecord(await response.json());
  const rawListings = Array.isArray(payload.listings) ? payload.listings : [];
  return rawListings
    .map((item) => parseListing(item))
    .filter((item): item is MyListing => item !== null);
};

export const fetchMyListingById = async (listingId: string): Promise<MyListing | null> => {
  const listings = await fetchMyListings();
  return listings.find((listing) => listing.id === listingId) ?? null;
};

export const fetchPublicListings = async (
  options: { limit?: number; offset?: number } = {},
): Promise<PublicListingSummary[]> => {
  const limit = Number.isFinite(options.limit) ? Math.trunc(options.limit ?? 24) : 24;
  const offset = Number.isFinite(options.offset) ? Math.trunc(options.offset ?? 0) : 0;

  const query = new URLSearchParams({
    limit: String(limit > 0 ? limit : 24),
    offset: String(offset >= 0 ? offset : 0),
  });

  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/v1/listings/public?${query.toString()}`,
      {
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      if (shouldFallbackToMock(response.status)) {
        return mockListings
          .slice(offset, offset + limit)
          .map((listing) => mapMockListingToPublicSummary(listing));
      }

      throw new Error(`Failed to fetch public listings with status ${response.status}.`);
    }

    const payload = asRecord(await response.json());
    const rawListings = Array.isArray(payload.listings) ? payload.listings : [];

    return rawListings
      .map((item) => parsePublicSummary(item))
      .filter((item): item is PublicListingSummary => item !== null);
  } catch {
    if (shouldFallbackToMock(null)) {
      return mockListings
        .slice(offset, offset + limit)
        .map((listing) => mapMockListingToPublicSummary(listing));
    }

    throw new Error('Failed to fetch public listings.');
  }
};

export const fetchPublicListingById = async (
  listingId: string,
): Promise<PublicListingDetail | null> => {
  const normalizedId = listingId.trim();
  const isNumericId = /^[1-9]\d*$/.test(normalizedId);

  if (!isNumericId) {
    const mockListing = findMockListingBySlug(normalizedId);
    return mockListing ? mapMockListingToPublicDetail(mockListing) : null;
  }

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/listings/public/${normalizedId}`, {
      cache: 'no-store',
    });

    if (response.status === 404) {
      if (shouldFallbackToMock(response.status)) {
        const mockListing = findMockListingBySlug(normalizedId);
        return mockListing ? mapMockListingToPublicDetail(mockListing) : null;
      }

      return null;
    }

    if (!response.ok) {
      if (shouldFallbackToMock(response.status)) {
        const mockListing = findMockListingBySlug(normalizedId);
        return mockListing ? mapMockListingToPublicDetail(mockListing) : null;
      }

      throw new Error(`Failed to fetch public listing with status ${response.status}.`);
    }

    const payload = asRecord(await response.json());
    return parsePublicDetail(payload.listing);
  } catch {
    if (shouldFallbackToMock(null)) {
      const mockListing = findMockListingBySlug(normalizedId);
      return mockListing ? mapMockListingToPublicDetail(mockListing) : null;
    }

    throw new Error('Failed to fetch public listing.');
  }
};
