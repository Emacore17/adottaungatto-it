import type {
  LocationIntent,
  SearchListingsMetadata,
  SearchFallbackLevel as SharedSearchFallbackLevel,
  SearchFallbackReason as SharedSearchFallbackReason,
  SearchSort as SharedSearchSort,
} from '@adottaungatto/types';

export const listingStatusValues = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'suspended',
  'archived',
] as const;

export type ListingStatus = (typeof listingStatusValues)[number];

export interface ListingRecord {
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

export interface CreateListingInput {
  title: string;
  description: string;
  listingType: string;
  priceAmount: number | null;
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
  publishedAt?: string;
  archivedAt?: string;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  listingType?: string;
  priceAmount?: number | null;
  currency?: string;
  ageText?: string;
  sex?: string;
  breed?: string | null;
  status?: ListingStatus;
  regionId?: string;
  provinceId?: string;
  comuneId?: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
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

export interface ContactListingInput {
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  message: string;
  source: string;
}

export interface ContactListingContext {
  senderIp: string | null;
  userAgent: string | null;
}

export interface ContactListingResult {
  requestId: string;
  listingId: string;
  createdAt: string;
  confirmationMessage: string;
}

export const searchSortValues = ['relevance', 'newest', 'price_asc', 'price_desc'] as const;

export type SearchSort = SharedSearchSort;

export type SearchFallbackLevel = SharedSearchFallbackLevel;

export type SearchFallbackReason = SharedSearchFallbackReason;

export interface SearchListingsPage {
  items: PublicListingSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  metadata: SearchListingsMetadata;
}
