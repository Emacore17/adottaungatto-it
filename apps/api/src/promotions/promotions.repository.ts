import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { ListingStatus } from '../listings/models/listing.model';
import type {
  ListingPromotionRecord,
  ListingPromotionWithPlan,
  PlanRecord,
  PromotionBoostType,
  PromotionEventRecord,
  PromotionEventType,
  PromotionStatus,
} from './models/promotion.model';

type OwnerRow = {
  userId: string;
};

type ListingForPromotionRow = {
  id: string;
  status: ListingStatus;
};

type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  boostType: PromotionBoostType;
  durationHours: number;
  promotionWeight: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type ListingPromotionRow = {
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
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type PromotionEventRow = {
  id: string;
  listingPromotionId: string;
  eventType: PromotionEventType;
  actorUserId: string | null;
  eventAt: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type ListingPromotionWithPlanRow = ListingPromotionRow & {
  planCode: string;
  planName: string;
  planDescription: string | null;
  planBoostType: PromotionBoostType;
  planDurationHours: number;
  planPromotionWeight: string;
  planIsActive: boolean;
  planMetadata: Record<string, unknown> | null;
  planCreatedAt: string;
  planUpdatedAt: string;
};

type CreateListingPromotionInput = {
  listingId: string;
  planId: string;
  createdByUserId: string;
  status: PromotionStatus;
  startsAt: string;
  endsAt: string;
  metadata: Record<string, unknown>;
  activatedAt: string | null;
};

const parseJsonRecord = (value: Record<string, unknown> | null): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

@Injectable()
export class PromotionsRepository implements OnModuleDestroy {
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
      throw new Error('Failed to upsert promotions actor.');
    }

    return row.userId;
  }

  async listPlans(onlyActive: boolean): Promise<PlanRecord[]> {
    const result = await this.pool.query<PlanRow>(
      `
        SELECT
          id::text AS "id",
          code AS "code",
          name AS "name",
          description AS "description",
          boost_type::text AS "boostType",
          duration_hours AS "durationHours",
          promotion_weight::text AS "promotionWeight",
          is_active AS "isActive",
          metadata AS "metadata",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt"
        FROM plans
        WHERE ($1::boolean = FALSE OR is_active = TRUE)
        ORDER BY duration_hours ASC, id ASC;
      `,
      [onlyActive],
    );

    return result.rows.map((row) => this.mapPlanRow(row));
  }

  async findPlanByCode(code: string): Promise<PlanRecord | null> {
    const result = await this.pool.query<PlanRow>(
      `
        SELECT
          id::text AS "id",
          code AS "code",
          name AS "name",
          description AS "description",
          boost_type::text AS "boostType",
          duration_hours AS "durationHours",
          promotion_weight::text AS "promotionWeight",
          is_active AS "isActive",
          metadata AS "metadata",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt"
        FROM plans
        WHERE code = $1
          AND is_active = TRUE
        LIMIT 1;
      `,
      [code],
    );

    const row = result.rows[0];
    return row ? this.mapPlanRow(row) : null;
  }

  async findListingForPromotion(listingId: string): Promise<ListingForPromotionRow | null> {
    const result = await this.pool.query<ListingForPromotionRow>(
      `
        SELECT
          id::text AS "id",
          status::text AS "status"
        FROM listings
        WHERE id = $1::bigint
          AND deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId],
    );

    return result.rows[0] ?? null;
  }

  async createListingPromotion(
    input: CreateListingPromotionInput,
  ): Promise<{ promotion: ListingPromotionRecord; events: PromotionEventRecord[] }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const promotionResult = await client.query<ListingPromotionRow>(
        `
          INSERT INTO listing_promotions (
            listing_id,
            plan_id,
            created_by_user_id,
            status,
            starts_at,
            ends_at,
            activated_at,
            metadata
          )
          VALUES (
            $1::bigint,
            $2::bigint,
            $3::bigint,
            $4::promotion_status,
            $5::timestamptz,
            $6::timestamptz,
            $7::timestamptz,
            $8::jsonb
          )
          RETURNING
            id::text AS "id",
            listing_id::text AS "listingId",
            plan_id::text AS "planId",
            created_by_user_id::text AS "createdByUserId",
            status::text AS "status",
            starts_at::text AS "startsAt",
            ends_at::text AS "endsAt",
            activated_at::text AS "activatedAt",
            expired_at::text AS "expiredAt",
            cancelled_at::text AS "cancelledAt",
            metadata AS "metadata",
            created_at::text AS "createdAt",
            updated_at::text AS "updatedAt";
        `,
        [
          input.listingId,
          input.planId,
          input.createdByUserId,
          input.status,
          input.startsAt,
          input.endsAt,
          input.activatedAt,
          JSON.stringify(input.metadata),
        ],
      );

      const promotionRow = promotionResult.rows[0];
      if (!promotionRow) {
        throw new Error('Failed to create listing promotion.');
      }

      const createdEventResult = await client.query<PromotionEventRow>(
        `
          INSERT INTO promotion_events (
            listing_promotion_id,
            event_type,
            actor_user_id,
            event_at,
            payload
          )
          VALUES (
            $1::bigint,
            'created',
            $2::bigint,
            NOW(),
            $3::jsonb
          )
          RETURNING
            id::text AS "id",
            listing_promotion_id::text AS "listingPromotionId",
            event_type::text AS "eventType",
            actor_user_id::text AS "actorUserId",
            event_at::text AS "eventAt",
            payload AS "payload",
            created_at::text AS "createdAt";
        `,
        [
          promotionRow.id,
          input.createdByUserId,
          JSON.stringify({
            status: input.status,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            planId: input.planId,
          }),
        ],
      );

      const events: PromotionEventRecord[] = [];
      const createdEventRow = createdEventResult.rows[0];
      if (!createdEventRow) {
        throw new Error('Failed to create promotion event "created".');
      }
      events.push(this.mapEventRow(createdEventRow));

      if (input.status === 'active') {
        const activatedEventResult = await client.query<PromotionEventRow>(
          `
            INSERT INTO promotion_events (
              listing_promotion_id,
              event_type,
              actor_user_id,
              event_at,
              payload
            )
            VALUES (
              $1::bigint,
              'activated',
              $2::bigint,
              COALESCE($3::timestamptz, NOW()),
              $4::jsonb
            )
            RETURNING
              id::text AS "id",
              listing_promotion_id::text AS "listingPromotionId",
              event_type::text AS "eventType",
              actor_user_id::text AS "actorUserId",
              event_at::text AS "eventAt",
              payload AS "payload",
              created_at::text AS "createdAt";
          `,
          [
            promotionRow.id,
            input.createdByUserId,
            input.activatedAt,
            JSON.stringify({
              status: input.status,
              activatedAt: input.activatedAt,
            }),
          ],
        );

        const activatedEventRow = activatedEventResult.rows[0];
        if (!activatedEventRow) {
          throw new Error('Failed to create promotion event "activated".');
        }
        events.push(this.mapEventRow(activatedEventRow));
      }

      await client.query('COMMIT');

      return {
        promotion: this.mapListingPromotionRow(promotionRow),
        events,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listPromotionsByListingId(listingId: string): Promise<ListingPromotionWithPlan[]> {
    const result = await this.pool.query<ListingPromotionWithPlanRow>(
      `
        SELECT
          lp.id::text AS "id",
          lp.listing_id::text AS "listingId",
          lp.plan_id::text AS "planId",
          lp.created_by_user_id::text AS "createdByUserId",
          lp.status::text AS "status",
          lp.starts_at::text AS "startsAt",
          lp.ends_at::text AS "endsAt",
          lp.activated_at::text AS "activatedAt",
          lp.expired_at::text AS "expiredAt",
          lp.cancelled_at::text AS "cancelledAt",
          lp.metadata AS "metadata",
          lp.created_at::text AS "createdAt",
          lp.updated_at::text AS "updatedAt",
          p.code AS "planCode",
          p.name AS "planName",
          p.description AS "planDescription",
          p.boost_type::text AS "planBoostType",
          p.duration_hours AS "planDurationHours",
          p.promotion_weight::text AS "planPromotionWeight",
          p.is_active AS "planIsActive",
          p.metadata AS "planMetadata",
          p.created_at::text AS "planCreatedAt",
          p.updated_at::text AS "planUpdatedAt"
        FROM listing_promotions lp
        INNER JOIN plans p
          ON p.id = lp.plan_id
        WHERE lp.listing_id = $1::bigint
        ORDER BY lp.created_at DESC, lp.id DESC;
      `,
      [listingId],
    );

    return result.rows.map((row) => ({
      ...this.mapListingPromotionRow(row),
      plan: {
        id: row.planId,
        code: row.planCode,
        name: row.planName,
        description: row.planDescription,
        boostType: row.planBoostType,
        durationHours: row.planDurationHours,
        promotionWeight: row.planPromotionWeight,
        isActive: row.planIsActive,
        metadata: parseJsonRecord(row.planMetadata),
        createdAt: row.planCreatedAt,
        updatedAt: row.planUpdatedAt,
      },
    }));
  }

  private mapPlanRow(row: PlanRow): PlanRecord {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      boostType: row.boostType,
      durationHours: row.durationHours,
      promotionWeight: row.promotionWeight,
      isActive: row.isActive,
      metadata: parseJsonRecord(row.metadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapListingPromotionRow(row: ListingPromotionRow): ListingPromotionRecord {
    return {
      id: row.id,
      listingId: row.listingId,
      planId: row.planId,
      createdByUserId: row.createdByUserId,
      status: row.status,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      activatedAt: row.activatedAt,
      expiredAt: row.expiredAt,
      cancelledAt: row.cancelledAt,
      metadata: parseJsonRecord(row.metadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapEventRow(row: PromotionEventRow): PromotionEventRecord {
    return {
      id: row.id,
      listingPromotionId: row.listingPromotionId,
      eventType: row.eventType,
      actorUserId: row.actorUserId,
      eventAt: row.eventAt,
      payload: parseJsonRecord(row.payload),
      createdAt: row.createdAt,
    };
  }
}
