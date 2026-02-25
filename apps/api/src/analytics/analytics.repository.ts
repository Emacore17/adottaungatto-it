import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type {
  AnalyticsEventRecord,
  AnalyticsEventType,
  AnalyticsMetrics,
  AnalyticsModerationMetrics,
} from './models/analytics.model';

type OwnerRow = {
  userId: string;
};

type AnalyticsEventRow = {
  id: string;
  eventType: AnalyticsEventType;
  actorUserId: string | null;
  listingId: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AnalyticsKpiAggregateRow = {
  listingViewCount: string;
  searchPerformedCount: string;
  searchFallbackAppliedCount: string;
  contactClickedCount: string;
  contactSentCount: string;
  listingCreatedCount: string;
  listingPublishedCount: string;
};

type ListingIdRow = {
  id: string;
};

type AnalyticsModerationAggregateRow = {
  pendingReviewCount: string;
  approvedCount: string;
  rejectedCount: string;
};

export type CreateAnalyticsEventInput = {
  eventType: AnalyticsEventType;
  actorUserId: string | null;
  listingId: string | null;
  source: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class AnalyticsRepository implements OnModuleDestroy {
  private readonly env = loadApiEnv();
  private readonly pool = new Pool({
    connectionString: this.env.DATABASE_URL,
  });

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async upsertActorUser(user: RequestUser): Promise<string> {
    const result = await this.pool.query<OwnerRow>(
      `
        INSERT INTO app_users (provider, provider_subject, email, roles)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (provider, provider_subject)
        DO UPDATE SET
          email = EXCLUDED.email,
          roles = EXCLUDED.roles,
          updated_at = NOW()
        RETURNING id::text AS "userId";
      `,
      [user.provider, user.providerSubject, user.email, JSON.stringify(user.roles)],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to upsert analytics actor.');
    }

    return row.userId;
  }

  async findPublishedListingId(listingId: string): Promise<string | null> {
    const result = await this.pool.query<ListingIdRow>(
      `
        SELECT id::text AS "id"
        FROM listings
        WHERE id = $1::bigint
          AND status = 'published'
          AND deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId],
    );

    return result.rows[0]?.id ?? null;
  }

  async createEvent(input: CreateAnalyticsEventInput): Promise<AnalyticsEventRecord> {
    const result = await this.pool.query<AnalyticsEventRow>(
      `
        INSERT INTO analytics_events (
          event_type,
          actor_user_id,
          listing_id,
          source,
          metadata
        )
        VALUES (
          $1::analytics_event_type,
          $2::bigint,
          $3::bigint,
          $4,
          $5::jsonb
        )
        RETURNING
          id::text AS "id",
          event_type::text AS "eventType",
          actor_user_id::text AS "actorUserId",
          listing_id::text AS "listingId",
          source AS "source",
          metadata AS "metadata",
          created_at::text AS "createdAt";
      `,
      [
        input.eventType,
        input.actorUserId,
        input.listingId,
        input.source,
        JSON.stringify(input.metadata),
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create analytics event.');
    }

    return this.mapEventRow(row);
  }

  async getKpiAggregate(fromIso: string, toIso: string): Promise<AnalyticsMetrics> {
    const result = await this.pool.query<AnalyticsKpiAggregateRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'listing_view')::text AS "listingViewCount",
          COUNT(*) FILTER (WHERE event_type = 'search_performed')::text AS "searchPerformedCount",
          COUNT(*) FILTER (WHERE event_type = 'search_fallback_applied')::text AS "searchFallbackAppliedCount",
          COUNT(*) FILTER (WHERE event_type = 'contact_clicked')::text AS "contactClickedCount",
          COUNT(*) FILTER (WHERE event_type = 'contact_sent')::text AS "contactSentCount",
          COUNT(*) FILTER (WHERE event_type = 'listing_created')::text AS "listingCreatedCount",
          COUNT(*) FILTER (WHERE event_type = 'listing_published')::text AS "listingPublishedCount"
        FROM analytics_events
        WHERE created_at >= $1::timestamptz
          AND created_at <= $2::timestamptz;
      `,
      [fromIso, toIso],
    );

    const row = result.rows[0];
    if (!row) {
      return {
        listingView: 0,
        searchPerformed: 0,
        searchFallbackApplied: 0,
        contactClicked: 0,
        contactSent: 0,
        listingCreated: 0,
        listingPublished: 0,
      };
    }

    return {
      listingView: Number.parseInt(row.listingViewCount, 10) || 0,
      searchPerformed: Number.parseInt(row.searchPerformedCount, 10) || 0,
      searchFallbackApplied: Number.parseInt(row.searchFallbackAppliedCount, 10) || 0,
      contactClicked: Number.parseInt(row.contactClickedCount, 10) || 0,
      contactSent: Number.parseInt(row.contactSentCount, 10) || 0,
      listingCreated: Number.parseInt(row.listingCreatedCount, 10) || 0,
      listingPublished: Number.parseInt(row.listingPublishedCount, 10) || 0,
    };
  }

  async getModerationAggregate(
    fromIso: string,
    toIso: string,
  ): Promise<AnalyticsModerationMetrics> {
    const result = await this.pool.query<AnalyticsModerationAggregateRow>(
      `
        WITH pending_queue AS (
          SELECT COUNT(*)::text AS "pendingReviewCount"
          FROM listings
          WHERE status = 'pending_review'
            AND deleted_at IS NULL
        ),
        moderation_window AS (
          SELECT
            COUNT(*) FILTER (WHERE action = 'approve')::text AS "approvedCount",
            COUNT(*) FILTER (WHERE action = 'reject')::text AS "rejectedCount"
          FROM admin_audit_logs
          WHERE target_type = 'listing'
            AND created_at >= $1::timestamptz
            AND created_at <= $2::timestamptz
        )
        SELECT
          pending_queue."pendingReviewCount",
          moderation_window."approvedCount",
          moderation_window."rejectedCount"
        FROM pending_queue
        CROSS JOIN moderation_window;
      `,
      [fromIso, toIso],
    );

    const row = result.rows[0];
    if (!row) {
      return {
        pendingReview: 0,
        approved: 0,
        rejected: 0,
      };
    }

    return {
      pendingReview: Number.parseInt(row.pendingReviewCount, 10) || 0,
      approved: Number.parseInt(row.approvedCount, 10) || 0,
      rejected: Number.parseInt(row.rejectedCount, 10) || 0,
    };
  }

  private mapEventRow(row: AnalyticsEventRow): AnalyticsEventRecord {
    return {
      id: row.id,
      eventType: row.eventType,
      actorUserId: row.actorUserId,
      listingId: row.listingId,
      source: row.source,
      metadata: row.metadata ?? {},
      createdAt: row.createdAt,
    };
  }
}
