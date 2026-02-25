import type { ListingRecord, ListingStatus } from '../../listings/models/listing.model';

export const moderationActionValues = ['approve', 'reject', 'suspend', 'restore'] as const;
export type ModerationAction = (typeof moderationActionValues)[number];

export interface ModerationQueueItem extends ListingRecord {
  ownerEmail: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  mediaCount: number;
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
  listing: ListingRecord;
  auditLog: AdminAuditLogRecord;
}
