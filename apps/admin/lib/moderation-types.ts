export const listingStatusValues = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'suspended',
  'archived',
] as const;

export type ListingStatus = (typeof listingStatusValues)[number];

export const moderationActionValues = ['approve', 'reject', 'suspend', 'restore'] as const;
export type ModerationAction = (typeof moderationActionValues)[number];

export interface ModerationQueueItem {
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
  ownerEmail: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  mediaCount: number;
}

export interface ModerationQueueResponse {
  items: ModerationQueueItem[];
  limit: number;
}

export interface AdminAuditLogRecord {
  id: string;
  actorUserId: string;
  action: ModerationAction;
  targetType: string;
  targetId: string;
  reason: string;
  fromStatus: ListingStatus | null;
  toStatus: ListingStatus | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ModerationActionResult {
  listing: {
    id: string;
    status: ListingStatus;
  };
  auditLog: AdminAuditLogRecord;
}

export const moderationActionLabel: Record<ModerationAction, string> = {
  approve: 'Approva',
  reject: 'Rifiuta',
  suspend: 'Sospendi',
  restore: 'Ripristina',
};

export const listingStatusLabel: Record<ListingStatus, string> = {
  draft: 'Bozza',
  pending_review: 'In revisione',
  published: 'Pubblicato',
  rejected: 'Rifiutato',
  suspended: 'Sospeso',
  archived: 'Archiviato',
};
