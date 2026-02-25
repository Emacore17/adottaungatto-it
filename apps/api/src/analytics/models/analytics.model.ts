export const analyticsEventTypeValues = [
  'listing_view',
  'search_performed',
  'search_fallback_applied',
  'contact_clicked',
  'contact_sent',
  'listing_created',
  'listing_published',
] as const;

export type AnalyticsEventType = (typeof analyticsEventTypeValues)[number];

export const publicAnalyticsEventTypeValues = ['contact_clicked', 'contact_sent'] as const;
export type PublicAnalyticsEventType = (typeof publicAnalyticsEventTypeValues)[number];

export interface AnalyticsEventRecord {
  id: string;
  eventType: AnalyticsEventType;
  actorUserId: string | null;
  listingId: string | null;
  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AnalyticsMetrics {
  listingView: number;
  searchPerformed: number;
  searchFallbackApplied: number;
  contactClicked: number;
  contactSent: number;
  listingCreated: number;
  listingPublished: number;
}

export interface AnalyticsModerationMetrics {
  pendingReview: number;
  approved: number;
  rejected: number;
}

export interface AnalyticsFunnelMetrics {
  listingCreated: number;
  listingPublished: number;
  contactClicked: number;
  contactSent: number;
  publishRatePct: number;
  contactFromPublishedRatePct: number;
  contactClickToSendRatePct: number;
}

export interface AnalyticsKpiSnapshot {
  windowDays: number;
  from: string;
  to: string;
  metrics: AnalyticsMetrics;
  moderation: AnalyticsModerationMetrics;
  funnel: AnalyticsFunnelMetrics;
  derived: {
    fallbackRatePct: number;
    contactRatePct: number;
    publishRatePct: number;
  };
}
