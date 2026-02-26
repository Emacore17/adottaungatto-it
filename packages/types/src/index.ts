export interface HealthResponse {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

export type LocationIntentScope =
  | 'italy'
  | 'region'
  | 'province'
  | 'comune'
  | 'comune_plus_province';

export interface LocationIntent {
  scope: LocationIntentScope;
  regionId: string | null;
  provinceId: string | null;
  comuneId: string | null;
  label: string;
  secondaryLabel: string | null;
}

export type SearchSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

export type SearchFallbackLevel = 'none' | 'nearby' | LocationIntentScope;

export type SearchFallbackReason =
  | 'NO_EXACT_MATCH'
  | 'WIDENED_TO_PARENT_AREA'
  | 'WIDENED_TO_NEARBY_AREA'
  | 'NO_LOCATION_FILTER';

export interface SearchListingsMetadata {
  fallbackApplied: boolean;
  fallbackLevel: SearchFallbackLevel;
  fallbackReason: SearchFallbackReason | null;
  requestedLocationIntent: LocationIntent | null;
  effectiveLocationIntent: LocationIntent | null;
}

export type ListingType = 'adozione' | 'stallo' | 'segnalazione';

export interface ListingMediaAsset {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  isPrimary?: boolean;
}

export interface ListingCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  listingType: ListingType;
  priceAmount: number | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  city: string;
  province: string;
  region: string;
  distanceKm: number | null;
  publishedAt: string;
  isVerifiedSeller: boolean;
  sellerUsername: string;
  media: ListingMediaAsset[];
}

export interface SellerReview {
  id: string;
  sellerUsername: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SellerProfileData {
  username: string;
  displayName: string;
  locationLabel: string;
  verified: boolean;
  ratingAverage: number;
  reviewsCount: number;
  responseRatePct: number;
  responseTimeLabel: string;
  joinedAt: string;
  bio: string;
}

export interface FavoriteListingItem {
  listingId: string;
  addedAt: string;
}

export type MessageParticipantRole = 'me' | 'other';

export interface MessageEntry {
  id: string;
  threadId: string;
  senderRole: MessageParticipantRole;
  body: string;
  sentAt: string;
}

export interface MessageThreadSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  counterpartName: string;
  counterpartVerified: boolean;
  unreadCount: number;
  lastMessagePreview: string;
  updatedAt: string;
}

export type NotificationType = 'message' | 'favorite' | 'moderation' | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
}

export interface AdminKpiCard {
  id: string;
  label: string;
  value: number | string;
  trendLabel: string;
  trendDirection: 'up' | 'down' | 'neutral';
}

export interface AdminTrendPoint {
  id: string;
  label: string;
  value: number;
}

export interface AdminModerationListing {
  id: string;
  listingTitle: string;
  sellerUsername: string;
  sellerVerified: boolean;
  submittedAt: string;
  city: string;
  province: string;
  reasonHint: string;
  media: ListingMediaAsset[];
}
