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
