export const promotionBoostTypeValues = ['boost_24h', 'boost_7d', 'boost_30d'] as const;
export type PromotionBoostType = (typeof promotionBoostTypeValues)[number];

export const promotionStatusValues = ['scheduled', 'active', 'expired', 'cancelled'] as const;
export type PromotionStatus = (typeof promotionStatusValues)[number];

export const promotionEventTypeValues = ['created', 'activated', 'expired', 'cancelled'] as const;
export type PromotionEventType = (typeof promotionEventTypeValues)[number];

export interface PlanRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  boostType: PromotionBoostType;
  durationHours: number;
  promotionWeight: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListingPromotionRecord {
  id: string;
  listingId: string;
  planId: string;
  createdByUserId: string | null;
  status: PromotionStatus;
  startsAt: string;
  endsAt: string;
  activatedAt: string | null;
  expiredAt: string | null;
  cancelledAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionEventRecord {
  id: string;
  listingPromotionId: string;
  eventType: PromotionEventType;
  actorUserId: string | null;
  eventAt: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ListingPromotionWithPlan extends ListingPromotionRecord {
  plan: PlanRecord;
}

export interface AssignListingPromotionInput {
  listingId: string;
  planCode: string;
  startsAt?: string;
  metadata?: Record<string, unknown>;
}
