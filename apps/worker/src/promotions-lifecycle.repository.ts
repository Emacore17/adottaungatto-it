import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { WORKER_DATABASE_POOL } from './database/database.constants';

type PromotionTransitionRow = {
  listingId: string;
};

type SearchIndexDocumentRow = {
  id: string;
  title: string;
  description: string;
  listingType: string;
  priceAmount: string | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  status: string;
  regionId: string;
  provinceId: string;
  comuneId: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  comuneCentroidLat: string | null;
  comuneCentroidLng: string | null;
  isSponsored: boolean;
  promotionWeight: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SearchIndexDocumentRecord = {
  id: string;
  title: string;
  description: string;
  listingType: string;
  priceAmount: number | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  status: string;
  regionId: string;
  provinceId: string;
  comuneId: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  location: { lat: number; lon: number } | null;
  isSponsored: boolean;
  promotionWeight: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PromotionTransitionResult = {
  transitionedPromotions: number;
  transitionedListingIds: string[];
};

const activePromotionJoinSql = `
  LEFT JOIN LATERAL (
    SELECT
      TRUE AS "isSponsored",
      p.promotion_weight::text AS "promotionWeight"
    FROM listing_promotions lp
    INNER JOIN plans p
      ON p.id = lp.plan_id
    WHERE lp.listing_id = l.id
      AND lp.status = 'active'
      AND lp.starts_at <= NOW()
      AND lp.ends_at > NOW()
      AND p.is_active = TRUE
    ORDER BY p.promotion_weight DESC, lp.ends_at DESC, lp.id DESC
    LIMIT 1
  ) active_promotion ON TRUE
`;

const normalizeTimestamp = (value: string | null, fallbackValue: string | null): string | null => {
  if (value === null) {
    return fallbackValue;
  }

  const normalizedValue = value.includes('T') ? value : value.replace(' ', 'T');
  const parsedDate = new Date(normalizedValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString();
  }

  return fallbackValue;
};

const mapTransitionRows = (rows: PromotionTransitionRow[]): PromotionTransitionResult => ({
  transitionedPromotions: rows.length,
  transitionedListingIds: Array.from(new Set(rows.map((row) => row.listingId))),
});

@Injectable()
export class PromotionsLifecycleRepository {
  constructor(
    @Inject(WORKER_DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async activateDuePromotions(batchSize: number): Promise<PromotionTransitionResult> {
    const result = await this.pool.query<PromotionTransitionRow>(
      `
        WITH due AS (
          SELECT
            lp.id,
            lp.listing_id,
            lp.starts_at,
            lp.ends_at
          FROM listing_promotions lp
          WHERE lp.status = 'scheduled'
            AND lp.cancelled_at IS NULL
            AND lp.starts_at <= NOW()
            AND lp.ends_at > NOW()
          ORDER BY lp.starts_at ASC, lp.id ASC
          LIMIT $1::integer
          FOR UPDATE SKIP LOCKED
        ),
        updated AS (
          UPDATE listing_promotions lp
          SET
            status = 'active',
            activated_at = COALESCE(lp.activated_at, NOW())
          FROM due
          WHERE lp.id = due.id
          RETURNING
            lp.id,
            lp.listing_id,
            lp.starts_at,
            lp.ends_at,
            lp.activated_at
        ),
        events AS (
          INSERT INTO promotion_events (
            listing_promotion_id,
            event_type,
            actor_user_id,
            event_at,
            payload
          )
          SELECT
            updated.id,
            'activated',
            NULL,
            COALESCE(updated.activated_at, NOW()),
            jsonb_build_object(
              'status', 'active',
              'activatedAt', updated.activated_at,
              'startsAt', updated.starts_at,
              'endsAt', updated.ends_at,
              'source', 'worker:lifecycle'
            )
          FROM updated
          WHERE NOT EXISTS (
            SELECT 1
            FROM promotion_events event
            WHERE event.listing_promotion_id = updated.id
              AND event.event_type = 'activated'
          )
          RETURNING id
        )
        SELECT
          updated.listing_id::text AS "listingId"
        FROM updated
        ORDER BY updated.id ASC;
      `,
      [batchSize],
    );

    return mapTransitionRows(result.rows);
  }

  async expireDuePromotions(batchSize: number): Promise<PromotionTransitionResult> {
    const result = await this.pool.query<PromotionTransitionRow>(
      `
        WITH due AS (
          SELECT
            lp.id,
            lp.listing_id,
            lp.ends_at
          FROM listing_promotions lp
          WHERE lp.status IN ('scheduled', 'active')
            AND lp.cancelled_at IS NULL
            AND lp.ends_at <= NOW()
          ORDER BY lp.ends_at ASC, lp.id ASC
          LIMIT $1::integer
          FOR UPDATE SKIP LOCKED
        ),
        updated AS (
          UPDATE listing_promotions lp
          SET
            status = 'expired',
            expired_at = COALESCE(lp.expired_at, NOW())
          FROM due
          WHERE lp.id = due.id
          RETURNING
            lp.id,
            lp.listing_id,
            lp.ends_at,
            lp.expired_at
        ),
        events AS (
          INSERT INTO promotion_events (
            listing_promotion_id,
            event_type,
            actor_user_id,
            event_at,
            payload
          )
          SELECT
            updated.id,
            'expired',
            NULL,
            COALESCE(updated.expired_at, NOW()),
            jsonb_build_object(
              'status', 'expired',
              'expiredAt', updated.expired_at,
              'endsAt', updated.ends_at,
              'source', 'worker:lifecycle'
            )
          FROM updated
          WHERE NOT EXISTS (
            SELECT 1
            FROM promotion_events event
            WHERE event.listing_promotion_id = updated.id
              AND event.event_type = 'expired'
          )
          RETURNING id
        )
        SELECT
          updated.listing_id::text AS "listingId"
        FROM updated
        ORDER BY updated.id ASC;
      `,
      [batchSize],
    );

    return mapTransitionRows(result.rows);
  }

  async listPublishedSearchIndexDocumentsByListingIds(
    listingIds: string[],
  ): Promise<SearchIndexDocumentRecord[]> {
    if (listingIds.length === 0) {
      return [];
    }

    const result = await this.pool.query<SearchIndexDocumentRow>(
      `
        SELECT
          l.id::text AS "id",
          l.title AS "title",
          l.description AS "description",
          l.listing_type AS "listingType",
          l.price_amount::text AS "priceAmount",
          l.currency AS "currency",
          l.age_text AS "ageText",
          l.sex AS "sex",
          l.breed AS "breed",
          l.status::text AS "status",
          l.region_id::text AS "regionId",
          l.province_id::text AS "provinceId",
          l.comune_id::text AS "comuneId",
          r.name AS "regionName",
          p.name AS "provinceName",
          p.sigla AS "provinceSigla",
          c.name AS "comuneName",
          c.centroid_lat::text AS "comuneCentroidLat",
          c.centroid_lng::text AS "comuneCentroidLng",
          COALESCE(active_promotion."isSponsored", FALSE) AS "isSponsored",
          COALESCE(active_promotion."promotionWeight", '1.000') AS "promotionWeight",
          l.published_at::text AS "publishedAt",
          l.created_at::text AS "createdAt",
          l.updated_at::text AS "updatedAt"
        FROM listings l
        INNER JOIN regions r
          ON r.id = l.region_id
        INNER JOIN provinces p
          ON p.id = l.province_id
        INNER JOIN comuni c
          ON c.id = l.comune_id
        ${activePromotionJoinSql}
        WHERE l.id = ANY($1::bigint[])
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        ORDER BY l.id ASC;
      `,
      [listingIds],
    );

    return result.rows.map((row) => this.mapSearchDocumentRow(row));
  }

  private mapSearchDocumentRow(row: SearchIndexDocumentRow): SearchIndexDocumentRecord {
    const lat = row.comuneCentroidLat ? Number.parseFloat(row.comuneCentroidLat) : Number.NaN;
    const lon = row.comuneCentroidLng ? Number.parseFloat(row.comuneCentroidLng) : Number.NaN;
    const promotionWeight = Number.parseFloat(row.promotionWeight);

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      listingType: row.listingType,
      priceAmount: row.priceAmount === null ? null : Number.parseFloat(row.priceAmount),
      currency: row.currency,
      ageText: row.ageText,
      sex: row.sex,
      breed: row.breed,
      status: row.status,
      regionId: row.regionId,
      provinceId: row.provinceId,
      comuneId: row.comuneId,
      regionName: row.regionName,
      provinceName: row.provinceName,
      provinceSigla: row.provinceSigla,
      comuneName: row.comuneName,
      location:
        Number.isFinite(lat) && Number.isFinite(lon)
          ? {
              lat,
              lon,
            }
          : null,
      isSponsored: row.isSponsored,
      promotionWeight: Number.isFinite(promotionWeight) ? promotionWeight : 1,
      publishedAt: normalizeTimestamp(row.publishedAt, null),
      createdAt:
        normalizeTimestamp(row.createdAt, new Date().toISOString()) ?? new Date().toISOString(),
      updatedAt:
        normalizeTimestamp(row.updatedAt, new Date().toISOString()) ?? new Date().toISOString(),
    };
  }
}
