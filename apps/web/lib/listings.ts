import { loadWebEnv } from '@adottaungatto/config';
import type {
  ListingCardData,
  LocationIntentScope,
  SearchListingsMetadata,
  SearchSort,
} from '@adottaungatto/types';
import { cookies } from 'next/headers';
import { findMockListingBySlug, mockListings } from '../mocks/listings';
import { webSessionCookieName } from './auth';
import { isMockModeEnabled, shouldFallbackToMock } from './mock-mode';

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

export interface PublicListingsSearchOptions {
  q?: string | null;
  locationScope?: LocationIntentScope | null;
  regionId?: string | null;
  provinceId?: string | null;
  comuneId?: string | null;
  locationLabel?: string | null;
  locationSecondaryLabel?: string | null;
  listingType?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  ageText?: string | null;
  sex?: string | null;
  breed?: string | null;
  sort?: SearchSort;
  limit?: number;
  offset?: number;
}

export interface PublicListingsSearchResult {
  items: PublicListingSummary[];
  metadata: SearchListingsMetadata | null;
}

const searchSortValues = new Set<SearchSort>(['relevance', 'newest', 'price_asc', 'price_desc']);

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseSearchMetadata = (value: unknown): SearchListingsMetadata | null => {
  const record = asRecord(value);
  if (typeof record.fallbackApplied !== 'boolean') {
    return null;
  }

  return record as unknown as SearchListingsMetadata;
};

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

const inferMimeTypeFromMediaUrl = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith('.png')) {
    return 'image/png';
  }

  if (normalized.endsWith('.webp')) {
    return 'image/webp';
  }

  if (normalized.endsWith('.svg')) {
    return 'image/svg+xml';
  }

  return 'image/jpeg';
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
          mimeType: inferMimeTypeFromMediaUrl(primaryMedia.src),
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
    mimeType: inferMimeTypeFromMediaUrl(media.src),
    width: media.width,
    height: media.height,
    position: index + 1,
    isPrimary: media.isPrimary === true,
    objectUrl: media.src,
  })),
});

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeOptionalNonNegativeNumber = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
};

const appendOptionalQueryParam = (
  query: URLSearchParams,
  key: string,
  value: string | null | undefined,
) => {
  const normalizedValue = normalizeOptionalString(value);
  if (normalizedValue) {
    query.set(key, normalizedValue);
  }
};

const byNewest = (a: ListingCardData, b: ListingCardData) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

const byPriceAsc = (a: ListingCardData, b: ListingCardData) => {
  if (a.priceAmount === null && b.priceAmount === null) {
    return byNewest(a, b);
  }

  if (a.priceAmount === null) {
    return 1;
  }

  if (b.priceAmount === null) {
    return -1;
  }

  if (a.priceAmount !== b.priceAmount) {
    return a.priceAmount - b.priceAmount;
  }

  return byNewest(a, b);
};

const byPriceDesc = (a: ListingCardData, b: ListingCardData) => {
  if (a.priceAmount === null && b.priceAmount === null) {
    return byNewest(a, b);
  }

  if (a.priceAmount === null) {
    return 1;
  }

  if (b.priceAmount === null) {
    return -1;
  }

  if (a.priceAmount !== b.priceAmount) {
    return b.priceAmount - a.priceAmount;
  }

  return byNewest(a, b);
};

const relevanceRank = (listing: ListingCardData, queryText: string | null) => {
  if (!queryText) {
    return 3;
  }

  const title = listing.title.toLowerCase();
  const description = listing.description.toLowerCase();

  if (title === queryText) {
    return 0;
  }

  if (title.startsWith(queryText)) {
    return 1;
  }

  if (title.includes(queryText)) {
    return 2;
  }

  if (description.includes(queryText)) {
    return 3;
  }

  return 4;
};

const searchMockPublicListings = (
  options: PublicListingsSearchOptions,
  limit: number,
  offset: number,
): PublicListingSummary[] => {
  const queryText = normalizeOptionalString(options.q)?.toLowerCase() ?? null;
  const listingType = normalizeOptionalString(options.listingType)?.toLowerCase() ?? null;
  const sex = normalizeOptionalString(options.sex)?.toLowerCase() ?? null;
  const breed = normalizeOptionalString(options.breed)?.toLowerCase() ?? null;
  const ageText = normalizeOptionalString(options.ageText)?.toLowerCase() ?? null;
  const priceMin = normalizeOptionalNonNegativeNumber(options.priceMin);
  const priceMax = normalizeOptionalNonNegativeNumber(options.priceMax);
  const sort = searchSortValues.has(options.sort ?? 'relevance')
    ? (options.sort ?? 'relevance')
    : 'relevance';

  const filtered = mockListings.filter((listing) => {
    const searchableText = `${listing.title} ${listing.description}`.toLowerCase();
    if (queryText && !searchableText.includes(queryText)) {
      return false;
    }

    if (listingType && listing.listingType.toLowerCase() !== listingType) {
      return false;
    }

    if (sex && listing.sex.toLowerCase() !== sex) {
      return false;
    }

    if (
      breed &&
      !String(listing.breed ?? '')
        .toLowerCase()
        .includes(breed)
    ) {
      return false;
    }

    if (ageText && !listing.ageText.toLowerCase().includes(ageText)) {
      return false;
    }

    if (priceMin !== null) {
      if (listing.priceAmount === null || listing.priceAmount < priceMin) {
        return false;
      }
    }

    if (priceMax !== null) {
      if (listing.priceAmount === null || listing.priceAmount > priceMax) {
        return false;
      }
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (sort === 'newest') {
      return byNewest(a, b);
    }

    if (sort === 'price_asc') {
      return byPriceAsc(a, b);
    }

    if (sort === 'price_desc') {
      return byPriceDesc(a, b);
    }

    const rankDelta = relevanceRank(a, queryText) - relevanceRank(b, queryText);
    if (rankDelta !== 0) {
      return rankDelta;
    }

    return byNewest(a, b);
  });

  return filtered
    .slice(offset, offset + limit)
    .map((listing) => mapMockListingToPublicSummary(listing));
};

const nonWordSearchRegex = /[^a-z0-9\s]/g;
const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(nonWordSearchRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getPublicListingTimestamp = (listing: PublicListingSummary): number => {
  const timestamp = new Date(listing.publishedAt ?? listing.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const byPublicNewest = (a: PublicListingSummary, b: PublicListingSummary) =>
  getPublicListingTimestamp(b) - getPublicListingTimestamp(a);

const byPublicPriceAsc = (a: PublicListingSummary, b: PublicListingSummary) => {
  const aPrice = parseNullableNumber(a.priceAmount);
  const bPrice = parseNullableNumber(b.priceAmount);

  if (aPrice === null && bPrice === null) {
    return byPublicNewest(a, b);
  }

  if (aPrice === null) {
    return 1;
  }

  if (bPrice === null) {
    return -1;
  }

  if (aPrice !== bPrice) {
    return aPrice - bPrice;
  }

  return byPublicNewest(a, b);
};

const byPublicPriceDesc = (a: PublicListingSummary, b: PublicListingSummary) => {
  const aPrice = parseNullableNumber(a.priceAmount);
  const bPrice = parseNullableNumber(b.priceAmount);

  if (aPrice === null && bPrice === null) {
    return byPublicNewest(a, b);
  }

  if (aPrice === null) {
    return 1;
  }

  if (bPrice === null) {
    return -1;
  }

  if (aPrice !== bPrice) {
    return bPrice - aPrice;
  }

  return byPublicNewest(a, b);
};

const publicRelevanceRank = (listing: PublicListingSummary, queryText: string | null) => {
  if (!queryText) {
    return 3;
  }

  const title = normalizeSearchText(listing.title);
  const description = normalizeSearchText(listing.description);
  const location = normalizeSearchText(
    `${listing.comuneName} ${listing.provinceName} ${listing.provinceSigla} ${listing.regionName}`,
  );

  if (title === queryText) {
    return 0;
  }

  if (title.startsWith(queryText)) {
    return 1;
  }

  if (title.includes(queryText) || location.includes(queryText)) {
    return 2;
  }

  if (description.includes(queryText)) {
    return 3;
  }

  return 4;
};

const searchPublicListingsFromPublicEndpoint = async (
  options: PublicListingsSearchOptions,
  limit: number,
  offset: number,
): Promise<PublicListingSummary[]> => {
  const queryText = normalizeSearchText(options.q);
  const listingType = normalizeSearchText(options.listingType);
  const sex = normalizeSearchText(options.sex);
  const breed = normalizeSearchText(options.breed);
  const ageText = normalizeSearchText(options.ageText);
  const locationLabel = normalizeSearchText(options.locationLabel);
  const locationTokens = locationLabel.length > 0 ? locationLabel.split(' ') : [];
  const priceMin = normalizeOptionalNonNegativeNumber(options.priceMin);
  const priceMax = normalizeOptionalNonNegativeNumber(options.priceMax);
  const sort = searchSortValues.has(options.sort ?? 'relevance')
    ? (options.sort ?? 'relevance')
    : 'relevance';

  const candidateLimit = Math.min(Math.max(offset + limit, 24), 100);
  const candidates = await fetchPublicListings({ limit: candidateLimit, offset: 0 });

  const filtered = candidates.filter((listing) => {
    const searchableText = normalizeSearchText(
      `${listing.title} ${listing.description} ${listing.comuneName} ${listing.provinceName} ${listing.provinceSigla} ${listing.regionName}`,
    );

    if (queryText && !searchableText.includes(queryText)) {
      return false;
    }

    if (listingType && normalizeSearchText(listing.listingType) !== listingType) {
      return false;
    }

    if (sex && normalizeSearchText(listing.sex) !== sex) {
      return false;
    }

    if (breed && !normalizeSearchText(listing.breed ?? '').includes(breed)) {
      return false;
    }

    if (ageText && !normalizeSearchText(listing.ageText).includes(ageText)) {
      return false;
    }

    if (locationTokens.length > 0) {
      const locationHaystack = normalizeSearchText(
        `${listing.comuneName} ${listing.provinceName} ${listing.provinceSigla} ${listing.regionName}`,
      );
      if (!locationTokens.every((token) => locationHaystack.includes(token))) {
        return false;
      }
    }

    const listingPrice = parseNullableNumber(listing.priceAmount);
    if (priceMin !== null) {
      if (listingPrice === null || listingPrice < priceMin) {
        return false;
      }
    }

    if (priceMax !== null) {
      if (listingPrice === null || listingPrice > priceMax) {
        return false;
      }
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (sort === 'newest') {
      return byPublicNewest(a, b);
    }

    if (sort === 'price_asc') {
      return byPublicPriceAsc(a, b);
    }

    if (sort === 'price_desc') {
      return byPublicPriceDesc(a, b);
    }

    const rankDelta =
      publicRelevanceRank(a, queryText || null) - publicRelevanceRank(b, queryText || null);
    if (rankDelta !== 0) {
      return rankDelta;
    }

    return byPublicNewest(a, b);
  });

  return filtered.slice(offset, offset + limit);
};

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

export const searchPublicListingsWithMetadata = async (
  options: PublicListingsSearchOptions = {},
): Promise<PublicListingsSearchResult> => {
  const requestedLimit = Number.isFinite(options.limit) ? Math.trunc(options.limit ?? 24) : 24;
  const requestedOffset = Number.isFinite(options.offset) ? Math.trunc(options.offset ?? 0) : 0;
  const limit = requestedLimit > 0 ? Math.min(requestedLimit, 100) : 24;
  const offset = requestedOffset >= 0 ? requestedOffset : 0;

  const normalizedSort = searchSortValues.has(options.sort ?? 'relevance')
    ? (options.sort ?? 'relevance')
    : 'relevance';

  const priceMin = normalizeOptionalNonNegativeNumber(options.priceMin);
  const priceMax = normalizeOptionalNonNegativeNumber(options.priceMax);
  const [effectivePriceMin, effectivePriceMax] =
    priceMin !== null && priceMax !== null && priceMin > priceMax
      ? [priceMax, priceMin]
      : [priceMin, priceMax];

  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort: normalizedSort,
  });

  appendOptionalQueryParam(query, 'q', options.q);
  appendOptionalQueryParam(query, 'locationScope', options.locationScope);
  appendOptionalQueryParam(query, 'regionId', options.regionId);
  appendOptionalQueryParam(query, 'provinceId', options.provinceId);
  appendOptionalQueryParam(query, 'comuneId', options.comuneId);
  appendOptionalQueryParam(query, 'locationLabel', options.locationLabel);
  appendOptionalQueryParam(query, 'locationSecondaryLabel', options.locationSecondaryLabel);
  appendOptionalQueryParam(query, 'listingType', options.listingType);
  appendOptionalQueryParam(query, 'ageText', options.ageText);
  appendOptionalQueryParam(query, 'sex', options.sex);
  appendOptionalQueryParam(query, 'breed', options.breed);

  if (effectivePriceMin !== null) {
    query.set('priceMin', String(effectivePriceMin));
  }

  if (effectivePriceMax !== null) {
    query.set('priceMax', String(effectivePriceMax));
  }

  const fallbackOptions: PublicListingsSearchOptions = {
    ...options,
    sort: normalizedSort,
    priceMin: effectivePriceMin,
    priceMax: effectivePriceMax,
  };

  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/v1/listings/search?${query.toString()}`,
      {
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      if (shouldFallbackToMock(response.status)) {
        if (isMockModeEnabled) {
          const publicFallback = await searchPublicListingsFromPublicEndpoint(
            fallbackOptions,
            limit,
            offset,
          ).catch(() => []);
          if (publicFallback.length > 0) {
            return { items: publicFallback, metadata: null };
          }
        }

        return {
          items: searchMockPublicListings(fallbackOptions, limit, offset),
          metadata: null,
        };
      }

      throw new Error(`Failed to search listings with status ${response.status}.`);
    }

    const payload = asRecord(await response.json());
    const parsedMetadata = parseSearchMetadata(payload.metadata);
    const rawListings = Array.isArray(payload.items) ? payload.items : [];
    const parsedListings = rawListings
      .map((item) => parsePublicSummary(item))
      .filter((item): item is PublicListingSummary => item !== null);

    if (parsedListings.length > 0 || !isMockModeEnabled) {
      return { items: parsedListings, metadata: parsedMetadata };
    }

    const publicFallback = await searchPublicListingsFromPublicEndpoint(
      fallbackOptions,
      limit,
      offset,
    ).catch(() => []);
    if (publicFallback.length > 0) {
      return { items: publicFallback, metadata: parsedMetadata };
    }

    return {
      items: searchMockPublicListings(fallbackOptions, limit, offset),
      metadata: parsedMetadata,
    };
  } catch {
    if (shouldFallbackToMock(null)) {
      if (isMockModeEnabled) {
        const publicFallback = await searchPublicListingsFromPublicEndpoint(
          fallbackOptions,
          limit,
          offset,
        ).catch(() => []);
        if (publicFallback.length > 0) {
          return { items: publicFallback, metadata: null };
        }
      }

      return {
        items: searchMockPublicListings(fallbackOptions, limit, offset),
        metadata: null,
      };
    }

    throw new Error('Failed to search listings.');
  }
};

export const searchPublicListings = async (
  options: PublicListingsSearchOptions = {},
): Promise<PublicListingSummary[]> => {
  const result = await searchPublicListingsWithMetadata(options);
  return result.items;
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
