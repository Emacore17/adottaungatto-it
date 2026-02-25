import { loadApiEnv } from '@adottaungatto/config';
import type { LocationIntent } from '@adottaungatto/types';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import type { CreateListingMediaInput, ListingMediaRecord } from './models/listing-media.model';
import type {
  ContactListingInput,
  CreateListingInput,
  ListingRecord,
  ListingStatus,
  PublicListingMedia,
  PublicListingSummary,
  UpdateListingInput,
} from './models/listing.model';

type PublicListingMediaRecord = Omit<PublicListingMedia, 'objectUrl'> & {
  storageKey: string;
};

export interface PublicListingSummaryRecord extends Omit<PublicListingSummary, 'primaryMedia'> {
  primaryMedia: PublicListingMediaRecord | null;
  comuneCentroidLat: number | null;
  comuneCentroidLng: number | null;
}

export interface PublicListingDetailRecord extends PublicListingSummaryRecord {
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  media: PublicListingMediaRecord[];
}

export interface PublishedListingContactRecord {
  id: string;
  title: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

type OwnerRow = {
  ownerUserId: string;
};

type ListingRow = {
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
};

type ListingMediaRow = {
  id: string;
  listingId: string;
  storageKey: string;
  mimeType: string;
  fileSize: string;
  width: number | null;
  height: number | null;
  hash: string | null;
  position: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

type NextPositionRow = {
  nextPosition: string;
};

type ListingMediaIdRow = {
  id: string;
};

type PublishedListingRow = {
  id: string;
  title: string;
  description: string;
  listingType: string;
  priceAmount: string | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  publishedAt: string | null;
  createdAt: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  comuneCentroidLat: string | null;
  comuneCentroidLng: string | null;
  mediaCount: string;
  primaryMediaId: string | null;
  primaryMediaStorageKey: string | null;
  primaryMediaMimeType: string | null;
  primaryMediaWidth: number | null;
  primaryMediaHeight: number | null;
  primaryMediaPosition: number | null;
  primaryMediaIsPrimary: boolean | null;
};

type SearchPublishedListingRow = PublishedListingRow & {
  totalCount: string;
};

type PublishedListingContactRow = {
  id: string;
  title: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
};

type CountRow = {
  totalCount: string;
};

type ListingContactRequestRow = {
  id: string;
  listingId: string;
  createdAt: string;
};

export interface SearchPublishedResultRecord {
  items: PublicListingSummaryRecord[];
  total: number;
}

export type CreateListingContactRequestInput = ContactListingInput & {
  messageHash: string;
  senderIp: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
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

export interface SearchIndexDocumentRecord {
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
}

export interface FallbackProvinceContext {
  id: string;
  name: string;
  sigla: string;
  regionId: string;
  regionName: string;
}

export interface FallbackComuneContext {
  id: string;
  name: string;
  provinceId: string;
  provinceName: string;
  provinceSigla: string;
  regionId: string;
  regionName: string;
}

type FallbackProvinceContextRow = {
  id: string;
  name: string;
  sigla: string;
  regionId: string;
  regionName: string;
};

type FallbackComuneContextRow = {
  id: string;
  name: string;
  provinceId: string;
  provinceName: string;
  provinceSigla: string;
  regionId: string;
  regionName: string;
};

type LocationCentroidRow = {
  centroidLat: string | null;
  centroidLng: string | null;
};

export interface LocationCentroid {
  lat: number;
  lon: number;
}

@Injectable()
export class ListingsRepository implements OnModuleDestroy {
  private readonly sponsoredPromotionCap = 1.2;

  private readonly activePromotionJoinSql = `
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

  private readonly env = loadApiEnv();
  private readonly pool = new Pool({
    connectionString: this.env.DATABASE_URL,
  });

  private readonly listingSelectSql = `
    SELECT
      id::text AS "id",
      owner_user_id::text AS "ownerUserId",
      title,
      description,
      listing_type AS "listingType",
      price_amount::text AS "priceAmount",
      currency,
      age_text AS "ageText",
      sex,
      breed,
      status::text AS "status",
      region_id::text AS "regionId",
      province_id::text AS "provinceId",
      comune_id::text AS "comuneId",
      contact_name AS "contactName",
      contact_phone AS "contactPhone",
      contact_email AS "contactEmail",
      published_at::text AS "publishedAt",
      archived_at::text AS "archivedAt",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt",
      deleted_at::text AS "deletedAt"
    FROM listings
  `;

  private readonly listingMediaSelectSql = `
    SELECT
      id::text AS "id",
      listing_id::text AS "listingId",
      storage_key AS "storageKey",
      mime_type AS "mimeType",
      file_size::text AS "fileSize",
      width,
      height,
      hash,
      position,
      is_primary AS "isPrimary",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM listing_media
  `;

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async upsertOwnerUser(user: RequestUser): Promise<string> {
    const result = await this.pool.query<OwnerRow>(
      `
        INSERT INTO app_users (provider, provider_subject, email, roles)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (provider, provider_subject)
        DO UPDATE SET
          email = EXCLUDED.email,
          roles = EXCLUDED.roles,
          updated_at = NOW()
        RETURNING id::text AS "ownerUserId";
      `,
      [user.provider, user.providerSubject, user.email, JSON.stringify(user.roles)],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to upsert listing owner user.');
    }

    return row.ownerUserId;
  }

  async createListing(ownerUserId: string, input: CreateListingInput): Promise<ListingRecord> {
    const result = await this.pool.query<ListingRow>(
      `
        INSERT INTO listings (
          owner_user_id,
          title,
          description,
          listing_type,
          price_amount,
          currency,
          age_text,
          sex,
          breed,
          status,
          region_id,
          province_id,
          comune_id,
          contact_name,
          contact_phone,
          contact_email,
          published_at,
          archived_at
        )
        VALUES (
          $1::bigint,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::listing_status,
          $11::bigint,
          $12::bigint,
          $13::bigint,
          $14,
          $15,
          $16,
          $17::timestamptz,
          $18::timestamptz
        )
        RETURNING
          id::text AS "id",
          owner_user_id::text AS "ownerUserId",
          title,
          description,
          listing_type AS "listingType",
          price_amount::text AS "priceAmount",
          currency,
          age_text AS "ageText",
          sex,
          breed,
          status::text AS "status",
          region_id::text AS "regionId",
          province_id::text AS "provinceId",
          comune_id::text AS "comuneId",
          contact_name AS "contactName",
          contact_phone AS "contactPhone",
          contact_email AS "contactEmail",
          published_at::text AS "publishedAt",
          archived_at::text AS "archivedAt",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt",
          deleted_at::text AS "deletedAt";
      `,
      [
        ownerUserId,
        input.title,
        input.description,
        input.listingType,
        input.priceAmount,
        input.currency,
        input.ageText,
        input.sex,
        input.breed,
        input.status,
        input.regionId,
        input.provinceId,
        input.comuneId,
        input.contactName,
        input.contactPhone,
        input.contactEmail,
        input.publishedAt ?? null,
        input.archivedAt ?? null,
      ],
    );

    const createdRow = result.rows[0];
    if (!createdRow) {
      throw new Error('Failed to create listing.');
    }

    return this.mapListingRow(createdRow);
  }

  async listMine(ownerUserId: string): Promise<ListingRecord[]> {
    const result = await this.pool.query<ListingRow>(
      `
        ${this.listingSelectSql}
        WHERE owner_user_id = $1::bigint
          AND deleted_at IS NULL
        ORDER BY created_at DESC;
      `,
      [ownerUserId],
    );

    return result.rows.map((row) => this.mapListingRow(row));
  }

  async findMineById(ownerUserId: string, listingId: string): Promise<ListingRecord | null> {
    const result = await this.pool.query<ListingRow>(
      `
        ${this.listingSelectSql}
        WHERE id = $1::bigint
          AND owner_user_id = $2::bigint
          AND deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId, ownerUserId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingRow(row);
  }

  async listPublished(limit: number, offset: number): Promise<PublicListingSummaryRecord[]> {
    const result = await this.pool.query<PublishedListingRow>(
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
          l.contact_name AS "contactName",
          l.contact_phone AS "contactPhone",
          l.contact_email AS "contactEmail",
          l.published_at::text AS "publishedAt",
          l.created_at::text AS "createdAt",
          r.name AS "regionName",
          p.name AS "provinceName",
          p.sigla AS "provinceSigla",
          c.name AS "comuneName",
          c.centroid_lat::text AS "comuneCentroidLat",
          c.centroid_lng::text AS "comuneCentroidLng",
          COALESCE(media_stats."mediaCount", '0') AS "mediaCount",
          media_preview.id::text AS "primaryMediaId",
          media_preview.storage_key AS "primaryMediaStorageKey",
          media_preview.mime_type AS "primaryMediaMimeType",
          media_preview.width AS "primaryMediaWidth",
          media_preview.height AS "primaryMediaHeight",
          media_preview.position AS "primaryMediaPosition",
          media_preview.is_primary AS "primaryMediaIsPrimary"
        FROM listings l
        INNER JOIN regions r
          ON r.id = l.region_id
        INNER JOIN provinces p
          ON p.id = l.province_id
        INNER JOIN comuni c
          ON c.id = l.comune_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::text AS "mediaCount"
          FROM listing_media lm
          WHERE lm.listing_id = l.id
        ) media_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            lm.id,
            lm.storage_key,
            lm.mime_type,
            lm.width,
            lm.height,
            lm.position,
            lm.is_primary
          FROM listing_media lm
          WHERE lm.listing_id = l.id
          ORDER BY lm.is_primary DESC, lm.position ASC, lm.created_at ASC
          LIMIT 1
        ) media_preview ON TRUE
        WHERE l.status = 'published'
          AND l.deleted_at IS NULL
        ORDER BY COALESCE(l.published_at, l.created_at) DESC, l.id DESC
        LIMIT $1::integer
        OFFSET $2::integer;
      `,
      [limit, offset],
    );

    return result.rows.map((row) => this.mapPublishedListingRow(row));
  }

  async listPublishedByIds(listingIds: string[]): Promise<PublicListingSummaryRecord[]> {
    if (listingIds.length === 0) {
      return [];
    }

    const result = await this.pool.query<PublishedListingRow>(
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
          l.contact_name AS "contactName",
          l.contact_phone AS "contactPhone",
          l.contact_email AS "contactEmail",
          l.published_at::text AS "publishedAt",
          l.created_at::text AS "createdAt",
          r.name AS "regionName",
          p.name AS "provinceName",
          p.sigla AS "provinceSigla",
          c.name AS "comuneName",
          c.centroid_lat::text AS "comuneCentroidLat",
          c.centroid_lng::text AS "comuneCentroidLng",
          COALESCE(media_stats."mediaCount", '0') AS "mediaCount",
          media_preview.id::text AS "primaryMediaId",
          media_preview.storage_key AS "primaryMediaStorageKey",
          media_preview.mime_type AS "primaryMediaMimeType",
          media_preview.width AS "primaryMediaWidth",
          media_preview.height AS "primaryMediaHeight",
          media_preview.position AS "primaryMediaPosition",
          media_preview.is_primary AS "primaryMediaIsPrimary"
        FROM listings l
        INNER JOIN regions r
          ON r.id = l.region_id
        INNER JOIN provinces p
          ON p.id = l.province_id
        INNER JOIN comuni c
          ON c.id = l.comune_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::text AS "mediaCount"
          FROM listing_media lm
          WHERE lm.listing_id = l.id
        ) media_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            lm.id,
            lm.storage_key,
            lm.mime_type,
            lm.width,
            lm.height,
            lm.position,
            lm.is_primary
          FROM listing_media lm
          WHERE lm.listing_id = l.id
          ORDER BY lm.is_primary DESC, lm.position ASC, lm.created_at ASC
          LIMIT 1
        ) media_preview ON TRUE
        WHERE l.id = ANY($1::bigint[])
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        ORDER BY
          array_position($1::bigint[], l.id),
          COALESCE(l.published_at, l.created_at) DESC,
          l.id DESC;
      `,
      [listingIds],
    );

    return result.rows.map((row) => this.mapPublishedListingRow(row));
  }

  async findFallbackProvinceContextById(
    provinceId: string,
  ): Promise<FallbackProvinceContext | null> {
    const result = await this.pool.query<FallbackProvinceContextRow>(
      `
        SELECT
          p.id::text AS "id",
          p.name AS "name",
          p.sigla AS "sigla",
          p.region_id::text AS "regionId",
          r.name AS "regionName"
        FROM provinces p
        INNER JOIN regions r
          ON r.id = p.region_id
        WHERE p.id = $1::bigint
        LIMIT 1;
      `,
      [provinceId],
    );

    return result.rows[0] ?? null;
  }

  async findFallbackComuneContextById(comuneId: string): Promise<FallbackComuneContext | null> {
    const result = await this.pool.query<FallbackComuneContextRow>(
      `
        SELECT
          c.id::text AS "id",
          c.name AS "name",
          p.id::text AS "provinceId",
          p.name AS "provinceName",
          p.sigla AS "provinceSigla",
          r.id::text AS "regionId",
          r.name AS "regionName"
        FROM comuni c
        INNER JOIN provinces p
          ON p.id = c.province_id
        INNER JOIN regions r
          ON r.id = c.region_id
        WHERE c.id = $1::bigint
        LIMIT 1;
      `,
      [comuneId],
    );

    return result.rows[0] ?? null;
  }

  async listNearbyFallbackProvinces(
    provinceId: string,
    limit: number,
  ): Promise<FallbackProvinceContext[]> {
    const result = await this.pool.query<FallbackProvinceContextRow>(
      `
        WITH base AS (
          SELECT
            centroid_lat::float8 AS base_lat,
            centroid_lng::float8 AS base_lng
          FROM provinces
          WHERE id = $1::bigint
        ),
        ranked AS (
          SELECT
            p.id::text AS "id",
            p.name AS "name",
            p.sigla AS "sigla",
            p.region_id::text AS "regionId",
            r.name AS "regionName",
            CASE
              WHEN base.base_lat IS NOT NULL
                AND base.base_lng IS NOT NULL
                AND p.centroid_lat IS NOT NULL
                AND p.centroid_lng IS NOT NULL
              THEN ST_DistanceSphere(
                ST_SetSRID(ST_MakePoint(base.base_lng, base.base_lat), 4326),
                ST_SetSRID(ST_MakePoint(p.centroid_lng::float8, p.centroid_lat::float8), 4326)
              )
              ELSE NULL
            END AS distance_meters
          FROM provinces p
          INNER JOIN regions r
            ON r.id = p.region_id
          CROSS JOIN base
          WHERE p.id <> $1::bigint
        )
        SELECT
          "id",
          "name",
          "sigla",
          "regionId",
          "regionName"
        FROM ranked
        ORDER BY
          CASE WHEN distance_meters IS NULL THEN 1 ELSE 0 END ASC,
          distance_meters ASC NULLS LAST,
          "name" ASC
        LIMIT $2::integer;
      `,
      [provinceId, limit],
    );

    return result.rows;
  }

  async resolveLocationCentroid(
    locationIntent: LocationIntent | null,
  ): Promise<LocationCentroid | null> {
    if (!locationIntent || locationIntent.scope === 'italy') {
      return null;
    }

    if (locationIntent.scope === 'comune' && locationIntent.comuneId) {
      return this.resolveComuneCentroid(locationIntent.comuneId);
    }

    if (locationIntent.scope === 'comune_plus_province') {
      if (locationIntent.comuneId) {
        const comuneCentroid = await this.resolveComuneCentroid(locationIntent.comuneId);
        if (comuneCentroid) {
          return comuneCentroid;
        }
      }

      if (locationIntent.provinceId) {
        return this.resolveProvinceCentroid(locationIntent.provinceId);
      }

      return null;
    }

    if (locationIntent.scope === 'province' && locationIntent.provinceId) {
      return this.resolveProvinceCentroid(locationIntent.provinceId);
    }

    if (locationIntent.scope === 'region' && locationIntent.regionId) {
      return this.resolveRegionCentroid(locationIntent.regionId);
    }

    return null;
  }

  async searchPublished(query: SearchListingsQueryDto): Promise<SearchPublishedResultRecord> {
    const whereClauses = [`l.status = 'published'`, 'l.deleted_at IS NULL'];
    const values: Array<string | number> = [];
    const addValue = (value: string | number): string => {
      values.push(value);
      return `$${values.length}`;
    };
    const referencePoint = await this.resolveLocationCentroid(query.locationIntent);

    if (query.queryText) {
      const patternPlaceholder = addValue(`%${query.queryText}%`);
      whereClauses.push(
        `(l.title ILIKE ${patternPlaceholder} OR l.description ILIKE ${patternPlaceholder})`,
      );
    }

    const locationIntent = query.locationIntent;
    if (locationIntent) {
      if (locationIntent.scope === 'region' && locationIntent.regionId) {
        const regionPlaceholder = addValue(locationIntent.regionId);
        whereClauses.push(`l.region_id = ${regionPlaceholder}::bigint`);
      }

      if (
        (locationIntent.scope === 'province' || locationIntent.scope === 'comune_plus_province') &&
        locationIntent.provinceId
      ) {
        const provincePlaceholder = addValue(locationIntent.provinceId);
        whereClauses.push(`l.province_id = ${provincePlaceholder}::bigint`);
      }

      if (locationIntent.scope === 'comune' && locationIntent.comuneId) {
        const comunePlaceholder = addValue(locationIntent.comuneId);
        whereClauses.push(`l.comune_id = ${comunePlaceholder}::bigint`);
      }
    }

    if (query.listingType) {
      const listingTypePlaceholder = addValue(query.listingType.toLowerCase());
      whereClauses.push(`LOWER(l.listing_type) = ${listingTypePlaceholder}`);
    }

    if (query.priceMin !== null) {
      const priceMinPlaceholder = addValue(query.priceMin);
      whereClauses.push(`l.price_amount >= ${priceMinPlaceholder}::numeric`);
    }

    if (query.priceMax !== null) {
      const priceMaxPlaceholder = addValue(query.priceMax);
      whereClauses.push(`l.price_amount <= ${priceMaxPlaceholder}::numeric`);
    }

    if (query.ageText) {
      const agePatternPlaceholder = addValue(`%${query.ageText}%`);
      whereClauses.push(`l.age_text ILIKE ${agePatternPlaceholder}`);
    }

    if (query.sex) {
      const sexPlaceholder = addValue(query.sex.toLowerCase());
      whereClauses.push(`LOWER(l.sex) = ${sexPlaceholder}`);
    }

    if (query.breed) {
      const breedPatternPlaceholder = addValue(`%${query.breed}%`);
      whereClauses.push(`COALESCE(l.breed, '') ILIKE ${breedPatternPlaceholder}`);
    }

    const distanceOrderSql = this.buildDistanceOrderSql(referencePoint, addValue);
    const sponsoredPriorityOrderSql = `
      CASE
        WHEN active_promotion."isSponsored" IS TRUE THEN 1
        ELSE 0
      END
    `;
    const sponsoredScoreOrderSql = `
      CASE
        WHEN active_promotion."isSponsored" IS TRUE
        THEN LEAST(
          COALESCE(active_promotion."promotionWeight"::numeric, 1.000),
          ${this.sponsoredPromotionCap}
        )
        ELSE 1.000
      END
    `;
    let orderBySql = 'COALESCE(l.published_at, l.created_at) DESC, l.id DESC';

    if (query.sort === 'price_asc') {
      orderBySql = `
        l.price_amount ASC NULLS LAST,
        ${distanceOrderSql ? `${distanceOrderSql} ASC NULLS LAST,` : ''}
        COALESCE(l.published_at, l.created_at) DESC,
        l.id DESC
      `;
    } else if (query.sort === 'price_desc') {
      orderBySql = `
        l.price_amount DESC NULLS LAST,
        ${distanceOrderSql ? `${distanceOrderSql} ASC NULLS LAST,` : ''}
        COALESCE(l.published_at, l.created_at) DESC,
        l.id DESC
      `;
    } else if (query.sort === 'relevance' && query.queryText) {
      const normalizedQueryPlaceholder = addValue(query.queryText.toLowerCase());
      orderBySql = `
        CASE
          WHEN LOWER(l.title) = ${normalizedQueryPlaceholder} THEN 0
          WHEN LOWER(l.title) LIKE ${normalizedQueryPlaceholder} || '%' THEN 1
          WHEN LOWER(l.description) LIKE '%' || ${normalizedQueryPlaceholder} || '%' THEN 2
          ELSE 3
        END ASC,
        ${sponsoredPriorityOrderSql} DESC,
        ${sponsoredScoreOrderSql} DESC,
        ${distanceOrderSql ? `${distanceOrderSql} ASC NULLS LAST,` : ''}
        COALESCE(l.published_at, l.created_at) DESC,
        l.id DESC
      `;
    } else if (query.sort === 'relevance' && distanceOrderSql) {
      orderBySql = `
        ${distanceOrderSql} ASC NULLS LAST,
        ${sponsoredPriorityOrderSql} DESC,
        ${sponsoredScoreOrderSql} DESC,
        COALESCE(l.published_at, l.created_at) DESC,
        l.id DESC
      `;
    } else if (query.sort === 'relevance') {
      orderBySql = `
        ${sponsoredPriorityOrderSql} DESC,
        ${sponsoredScoreOrderSql} DESC,
        COALESCE(l.published_at, l.created_at) DESC,
        l.id DESC
      `;
    } else if (query.sort === 'newest' && distanceOrderSql) {
      orderBySql = `
        COALESCE(l.published_at, l.created_at) DESC,
        ${distanceOrderSql} ASC NULLS LAST,
        l.id DESC
      `;
    }

    const limitPlaceholder = addValue(query.limit);
    const offsetPlaceholder = addValue(query.offset);

    const result = await this.pool.query<SearchPublishedListingRow>(
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
          l.contact_name AS "contactName",
          l.contact_phone AS "contactPhone",
          l.contact_email AS "contactEmail",
          l.published_at::text AS "publishedAt",
          l.created_at::text AS "createdAt",
          r.name AS "regionName",
          p.name AS "provinceName",
          p.sigla AS "provinceSigla",
          c.name AS "comuneName",
          c.centroid_lat::text AS "comuneCentroidLat",
          c.centroid_lng::text AS "comuneCentroidLng",
          COALESCE(media_stats."mediaCount", '0') AS "mediaCount",
          media_preview.id::text AS "primaryMediaId",
          media_preview.storage_key AS "primaryMediaStorageKey",
          media_preview.mime_type AS "primaryMediaMimeType",
          media_preview.width AS "primaryMediaWidth",
          media_preview.height AS "primaryMediaHeight",
          media_preview.position AS "primaryMediaPosition",
          media_preview.is_primary AS "primaryMediaIsPrimary",
          COUNT(*) OVER()::text AS "totalCount"
        FROM listings l
        INNER JOIN regions r
          ON r.id = l.region_id
        INNER JOIN provinces p
          ON p.id = l.province_id
        INNER JOIN comuni c
          ON c.id = l.comune_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::text AS "mediaCount"
          FROM listing_media lm
          WHERE lm.listing_id = l.id
        ) media_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            lm.id,
            lm.storage_key,
            lm.mime_type,
            lm.width,
            lm.height,
            lm.position,
            lm.is_primary
          FROM listing_media lm
          WHERE lm.listing_id = l.id
          ORDER BY lm.is_primary DESC, lm.position ASC, lm.created_at ASC
          LIMIT 1
        ) media_preview ON TRUE
        ${this.activePromotionJoinSql}
        WHERE ${whereClauses.join('\n          AND ')}
        ORDER BY ${orderBySql}
        LIMIT ${limitPlaceholder}::integer
        OFFSET ${offsetPlaceholder}::integer;
      `,
      values,
    );

    const items = result.rows.map((row) => this.mapPublishedListingRow(row));
    const total = result.rows[0] ? Number.parseInt(result.rows[0].totalCount, 10) : 0;

    return {
      items,
      total: Number.isFinite(total) ? total : 0,
    };
  }

  async findPublishedById(listingId: string): Promise<PublicListingDetailRecord | null> {
    const result = await this.pool.query<PublishedListingRow>(
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
          l.contact_name AS "contactName",
          l.contact_phone AS "contactPhone",
          l.contact_email AS "contactEmail",
          l.published_at::text AS "publishedAt",
          l.created_at::text AS "createdAt",
          r.name AS "regionName",
          p.name AS "provinceName",
          p.sigla AS "provinceSigla",
          c.name AS "comuneName",
          c.centroid_lat::text AS "comuneCentroidLat",
          c.centroid_lng::text AS "comuneCentroidLng",
          COALESCE(media_stats."mediaCount", '0') AS "mediaCount",
          media_preview.id::text AS "primaryMediaId",
          media_preview.storage_key AS "primaryMediaStorageKey",
          media_preview.mime_type AS "primaryMediaMimeType",
          media_preview.width AS "primaryMediaWidth",
          media_preview.height AS "primaryMediaHeight",
          media_preview.position AS "primaryMediaPosition",
          media_preview.is_primary AS "primaryMediaIsPrimary"
        FROM listings l
        INNER JOIN regions r
          ON r.id = l.region_id
        INNER JOIN provinces p
          ON p.id = l.province_id
        INNER JOIN comuni c
          ON c.id = l.comune_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::text AS "mediaCount"
          FROM listing_media lm
          WHERE lm.listing_id = l.id
        ) media_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            lm.id,
            lm.storage_key,
            lm.mime_type,
            lm.width,
            lm.height,
            lm.position,
            lm.is_primary
          FROM listing_media lm
          WHERE lm.listing_id = l.id
          ORDER BY lm.is_primary DESC, lm.position ASC, lm.created_at ASC
          LIMIT 1
        ) media_preview ON TRUE
        WHERE l.id = $1::bigint
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const mediaRows = await this.listMediaByListingId(row.id);
    const summary = this.mapPublishedListingRow(row);

    return {
      ...summary,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      media: mediaRows.map((media) => ({
        id: media.id,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        position: media.position,
        isPrimary: media.isPrimary,
        storageKey: media.storageKey,
      })),
    };
  }

  async findPublishedContactTarget(
    listingId: string,
  ): Promise<PublishedListingContactRecord | null> {
    const result = await this.pool.query<PublishedListingContactRow>(
      `
        SELECT
          l.id::text AS "id",
          l.title AS "title",
          l.contact_name AS "contactName",
          l.contact_phone AS "contactPhone",
          l.contact_email AS "contactEmail"
        FROM listings l
        WHERE l.id = $1::bigint
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
    };
  }

  async countRecentContactRequestsByIp(
    listingId: string,
    senderIp: string,
    fromIso: string,
  ): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
        SELECT COUNT(*)::text AS "totalCount"
        FROM listing_contact_requests
        WHERE listing_id = $1::bigint
          AND sender_ip = $2
          AND created_at >= $3::timestamptz;
      `,
      [listingId, senderIp, fromIso],
    );

    const count = result.rows[0] ? Number.parseInt(result.rows[0].totalCount, 10) : 0;
    return Number.isFinite(count) ? count : 0;
  }

  async countRecentDuplicateContactRequests(
    listingId: string,
    senderEmail: string,
    messageHash: string,
    fromIso: string,
  ): Promise<number> {
    const result = await this.pool.query<CountRow>(
      `
        SELECT COUNT(*)::text AS "totalCount"
        FROM listing_contact_requests
        WHERE listing_id = $1::bigint
          AND lower(sender_email) = lower($2)
          AND message_hash = $3
          AND created_at >= $4::timestamptz;
      `,
      [listingId, senderEmail, messageHash, fromIso],
    );

    const count = result.rows[0] ? Number.parseInt(result.rows[0].totalCount, 10) : 0;
    return Number.isFinite(count) ? count : 0;
  }

  async createContactRequest(
    listingId: string,
    input: CreateListingContactRequestInput,
  ): Promise<{ id: string; listingId: string; createdAt: string }> {
    const result = await this.pool.query<ListingContactRequestRow>(
      `
        INSERT INTO listing_contact_requests (
          listing_id,
          sender_name,
          sender_email,
          sender_phone,
          message,
          message_hash,
          source,
          sender_ip,
          user_agent,
          metadata
        )
        VALUES (
          $1::bigint,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb
        )
        RETURNING
          id::text AS "id",
          listing_id::text AS "listingId",
          created_at::text AS "createdAt";
      `,
      [
        listingId,
        input.senderName,
        input.senderEmail,
        input.senderPhone,
        input.message,
        input.messageHash,
        input.source,
        input.senderIp,
        input.userAgent,
        JSON.stringify(input.metadata),
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create listing contact request.');
    }

    return {
      id: row.id,
      listingId: row.listingId,
      createdAt: row.createdAt,
    };
  }

  async findPublishedSearchIndexDocumentById(
    listingId: string,
  ): Promise<SearchIndexDocumentRecord | null> {
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
        ${this.activePromotionJoinSql}
        WHERE l.id = $1::bigint
          AND l.status = 'published'
          AND l.deleted_at IS NULL
        LIMIT 1;
      `,
      [listingId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapSearchIndexDocumentRow(row);
  }

  async listPublishedSearchIndexDocuments(
    limit: number,
    offset: number,
  ): Promise<SearchIndexDocumentRecord[]> {
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
        ${this.activePromotionJoinSql}
        WHERE l.status = 'published'
          AND l.deleted_at IS NULL
        ORDER BY COALESCE(l.published_at, l.created_at) DESC, l.id DESC
        LIMIT $1::integer
        OFFSET $2::integer;
      `,
      [limit, offset],
    );

    return result.rows.map((row) => this.mapSearchIndexDocumentRow(row));
  }

  async updateMine(
    ownerUserId: string,
    listingId: string,
    input: UpdateListingInput,
  ): Promise<ListingRecord | null> {
    const setClauses: string[] = [];
    const values: Array<string | number | null> = [];

    const addValue = (
      column: string,
      value: string | number | null,
      castSuffix?: '::bigint' | '::listing_status' | '::numeric' | '::timestamptz',
    ) => {
      values.push(value);
      const placeholder = `$${values.length}${castSuffix ?? ''}`;
      setClauses.push(`${column} = ${placeholder}`);
    };

    if (input.title !== undefined) {
      addValue('title', input.title);
    }
    if (input.description !== undefined) {
      addValue('description', input.description);
    }
    if (input.listingType !== undefined) {
      addValue('listing_type', input.listingType);
    }
    if (input.priceAmount !== undefined) {
      addValue('price_amount', input.priceAmount, '::numeric');
    }
    if (input.currency !== undefined) {
      addValue('currency', input.currency);
    }
    if (input.ageText !== undefined) {
      addValue('age_text', input.ageText);
    }
    if (input.sex !== undefined) {
      addValue('sex', input.sex);
    }
    if (input.breed !== undefined) {
      addValue('breed', input.breed);
    }
    if (input.status !== undefined) {
      addValue('status', input.status, '::listing_status');
    }
    if (input.regionId !== undefined) {
      addValue('region_id', input.regionId, '::bigint');
    }
    if (input.provinceId !== undefined) {
      addValue('province_id', input.provinceId, '::bigint');
    }
    if (input.comuneId !== undefined) {
      addValue('comune_id', input.comuneId, '::bigint');
    }
    if (input.contactName !== undefined) {
      addValue('contact_name', input.contactName);
    }
    if (input.contactPhone !== undefined) {
      addValue('contact_phone', input.contactPhone);
    }
    if (input.contactEmail !== undefined) {
      addValue('contact_email', input.contactEmail);
    }
    if (input.publishedAt !== undefined) {
      addValue('published_at', input.publishedAt, '::timestamptz');
    }
    if (input.archivedAt !== undefined) {
      addValue('archived_at', input.archivedAt, '::timestamptz');
    }

    if (setClauses.length === 0) {
      return this.findMineById(ownerUserId, listingId);
    }

    values.push(listingId);
    const listingIdIndex = values.length;
    values.push(ownerUserId);
    const ownerUserIdIndex = values.length;

    const result = await this.pool.query<ListingRow>(
      `
        UPDATE listings
        SET ${setClauses.join(', ')}
        WHERE id = $${listingIdIndex}::bigint
          AND owner_user_id = $${ownerUserIdIndex}::bigint
          AND deleted_at IS NULL
        RETURNING
          id::text AS "id",
          owner_user_id::text AS "ownerUserId",
          title,
          description,
          listing_type AS "listingType",
          price_amount::text AS "priceAmount",
          currency,
          age_text AS "ageText",
          sex,
          breed,
          status::text AS "status",
          region_id::text AS "regionId",
          province_id::text AS "provinceId",
          comune_id::text AS "comuneId",
          contact_name AS "contactName",
          contact_phone AS "contactPhone",
          contact_email AS "contactEmail",
          published_at::text AS "publishedAt",
          archived_at::text AS "archivedAt",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt",
          deleted_at::text AS "deletedAt";
      `,
      values,
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingRow(row);
  }

  async softDeleteMine(ownerUserId: string, listingId: string): Promise<ListingRecord | null> {
    const result = await this.pool.query<ListingRow>(
      `
        UPDATE listings
        SET
          status = 'archived',
          archived_at = COALESCE(archived_at, NOW()),
          deleted_at = NOW()
        WHERE id = $1::bigint
          AND owner_user_id = $2::bigint
          AND deleted_at IS NULL
        RETURNING
          id::text AS "id",
          owner_user_id::text AS "ownerUserId",
          title,
          description,
          listing_type AS "listingType",
          price_amount::text AS "priceAmount",
          currency,
          age_text AS "ageText",
          sex,
          breed,
          status::text AS "status",
          region_id::text AS "regionId",
          province_id::text AS "provinceId",
          comune_id::text AS "comuneId",
          contact_name AS "contactName",
          contact_phone AS "contactPhone",
          contact_email AS "contactEmail",
          published_at::text AS "publishedAt",
          archived_at::text AS "archivedAt",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt",
          deleted_at::text AS "deletedAt";
      `,
      [listingId, ownerUserId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingRow(row);
  }

  async getNextMediaPosition(listingId: string): Promise<number> {
    const result = await this.pool.query<NextPositionRow>(
      `
        SELECT (COALESCE(MAX(position), 0) + 1)::text AS "nextPosition"
        FROM listing_media
        WHERE listing_id = $1::bigint;
      `,
      [listingId],
    );

    const row = result.rows[0];
    if (!row) {
      return 1;
    }

    return Number.parseInt(row.nextPosition, 10);
  }

  async clearPrimaryMedia(listingId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE listing_media
        SET is_primary = FALSE
        WHERE listing_id = $1::bigint
          AND is_primary = TRUE;
      `,
      [listingId],
    );
  }

  async createListingMedia(
    listingId: string,
    input: CreateListingMediaInput,
  ): Promise<ListingMediaRecord> {
    const result = await this.pool.query<ListingMediaRow>(
      `
        INSERT INTO listing_media (
          listing_id,
          storage_key,
          mime_type,
          file_size,
          width,
          height,
          hash,
          position,
          is_primary
        )
        VALUES (
          $1::bigint,
          $2,
          $3,
          $4::bigint,
          $5::integer,
          $6::integer,
          $7,
          $8::integer,
          $9
        )
        RETURNING
          id::text AS "id",
          listing_id::text AS "listingId",
          storage_key AS "storageKey",
          mime_type AS "mimeType",
          file_size::text AS "fileSize",
          width,
          height,
          hash,
          position,
          is_primary AS "isPrimary",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt";
      `,
      [
        listingId,
        input.storageKey,
        input.mimeType,
        input.fileSize,
        input.width,
        input.height,
        input.hash,
        input.position,
        input.isPrimary,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create listing media.');
    }

    return this.mapListingMediaRow(row);
  }

  async listMediaByListingId(listingId: string): Promise<ListingMediaRecord[]> {
    const result = await this.pool.query<ListingMediaRow>(
      `
        ${this.listingMediaSelectSql}
        WHERE listing_id = $1::bigint
        ORDER BY position ASC, created_at ASC;
      `,
      [listingId],
    );

    return result.rows.map((row) => this.mapListingMediaRow(row));
  }

  async findListingMediaById(
    listingId: string,
    mediaId: string,
  ): Promise<ListingMediaRecord | null> {
    const result = await this.pool.query<ListingMediaRow>(
      `
        ${this.listingMediaSelectSql}
        WHERE listing_id = $1::bigint
          AND id = $2::bigint
        LIMIT 1;
      `,
      [listingId, mediaId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingMediaRow(row);
  }

  async deleteListingMediaById(
    listingId: string,
    mediaId: string,
  ): Promise<ListingMediaRecord | null> {
    const result = await this.pool.query<ListingMediaRow>(
      `
        DELETE FROM listing_media
        WHERE listing_id = $1::bigint
          AND id = $2::bigint
        RETURNING
          id::text AS "id",
          listing_id::text AS "listingId",
          storage_key AS "storageKey",
          mime_type AS "mimeType",
          file_size::text AS "fileSize",
          width,
          height,
          hash,
          position,
          is_primary AS "isPrimary",
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt";
      `,
      [listingId, mediaId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapListingMediaRow(row);
  }

  async reorderListingMediaPositions(
    listingId: string,
    orderedMediaIds: string[],
  ): Promise<ListingMediaRecord[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existingRows = await client.query<ListingMediaIdRow>(
        `
          SELECT id::text AS "id"
          FROM listing_media
          WHERE listing_id = $1::bigint
          ORDER BY position ASC, created_at ASC;
        `,
        [listingId],
      );

      const existingIds = existingRows.rows.map((row) => row.id);
      const providedIds = new Set(orderedMediaIds);
      const sameLength = existingIds.length === orderedMediaIds.length;
      const sameSet = existingIds.every((id) => providedIds.has(id));

      if (!sameLength || !sameSet) {
        throw new Error('Listing media reorder payload mismatch.');
      }

      await client.query(
        `
          UPDATE listing_media
          SET position = position + 1000
          WHERE listing_id = $1::bigint;
        `,
        [listingId],
      );

      for (const [index, mediaId] of orderedMediaIds.entries()) {
        await client.query(
          `
            UPDATE listing_media
            SET position = $1::integer
            WHERE listing_id = $2::bigint
              AND id = $3::bigint;
          `,
          [index + 1, listingId, mediaId],
        );
      }

      const reorderedRows = await client.query<ListingMediaRow>(
        `
          ${this.listingMediaSelectSql}
          WHERE listing_id = $1::bigint
          ORDER BY position ASC, created_at ASC;
        `,
        [listingId],
      );

      await client.query('COMMIT');
      return reorderedRows.rows.map((row) => this.mapListingMediaRow(row));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteListingMediaByStorageKey(storageKey: string): Promise<void> {
    await this.pool.query(
      `
        DELETE FROM listing_media
        WHERE storage_key = $1;
      `,
      [storageKey],
    );
  }

  private buildDistanceOrderSql(
    referencePoint: LocationCentroid | null,
    addValue: (value: string | number) => string,
  ): string | null {
    if (!referencePoint) {
      return null;
    }

    const lonPlaceholder = addValue(referencePoint.lon);
    const latPlaceholder = addValue(referencePoint.lat);

    return `
      CASE
        WHEN c.centroid_lat IS NOT NULL AND c.centroid_lng IS NOT NULL
        THEN ST_DistanceSphere(
          ST_SetSRID(ST_MakePoint(c.centroid_lng::float8, c.centroid_lat::float8), 4326),
          ST_SetSRID(ST_MakePoint(${lonPlaceholder}::float8, ${latPlaceholder}::float8), 4326)
        )
        ELSE NULL
      END
    `;
  }

  private async resolveComuneCentroid(comuneId: string): Promise<LocationCentroid | null> {
    const result = await this.pool.query<LocationCentroidRow>(
      `
        SELECT
          centroid_lat::text AS "centroidLat",
          centroid_lng::text AS "centroidLng"
        FROM comuni
        WHERE id = $1::bigint
        LIMIT 1;
      `,
      [comuneId],
    );

    return this.parseLocationCentroidRow(result.rows[0] ?? null);
  }

  private async resolveProvinceCentroid(provinceId: string): Promise<LocationCentroid | null> {
    const result = await this.pool.query<LocationCentroidRow>(
      `
        SELECT
          centroid_lat::text AS "centroidLat",
          centroid_lng::text AS "centroidLng"
        FROM provinces
        WHERE id = $1::bigint
        LIMIT 1;
      `,
      [provinceId],
    );

    return this.parseLocationCentroidRow(result.rows[0] ?? null);
  }

  private async resolveRegionCentroid(regionId: string): Promise<LocationCentroid | null> {
    const result = await this.pool.query<LocationCentroidRow>(
      `
        SELECT
          centroid_lat::text AS "centroidLat",
          centroid_lng::text AS "centroidLng"
        FROM regions
        WHERE id = $1::bigint
        LIMIT 1;
      `,
      [regionId],
    );

    return this.parseLocationCentroidRow(result.rows[0] ?? null);
  }

  private parseLocationCentroidRow(row: LocationCentroidRow | null): LocationCentroid | null {
    if (!row) {
      return null;
    }

    const lat = row.centroidLat ? Number.parseFloat(row.centroidLat) : Number.NaN;
    const lon = row.centroidLng ? Number.parseFloat(row.centroidLng) : Number.NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    return { lat, lon };
  }

  private mapPublishedListingRow(row: PublishedListingRow): PublicListingSummaryRecord {
    const comuneCentroidLat = row.comuneCentroidLat
      ? Number.parseFloat(row.comuneCentroidLat)
      : Number.NaN;
    const comuneCentroidLng = row.comuneCentroidLng
      ? Number.parseFloat(row.comuneCentroidLng)
      : Number.NaN;

    const primaryMedia =
      row.primaryMediaId && row.primaryMediaStorageKey && row.primaryMediaMimeType
        ? {
            id: row.primaryMediaId,
            mimeType: row.primaryMediaMimeType,
            width: row.primaryMediaWidth,
            height: row.primaryMediaHeight,
            position: row.primaryMediaPosition ?? 1,
            isPrimary: row.primaryMediaIsPrimary ?? false,
            storageKey: row.primaryMediaStorageKey,
          }
        : null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      listingType: row.listingType,
      priceAmount: row.priceAmount,
      currency: row.currency,
      ageText: row.ageText,
      sex: row.sex,
      breed: row.breed,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      regionName: row.regionName,
      provinceName: row.provinceName,
      provinceSigla: row.provinceSigla,
      comuneName: row.comuneName,
      distanceKm: null,
      mediaCount: Number.parseInt(row.mediaCount, 10),
      primaryMedia,
      comuneCentroidLat: Number.isFinite(comuneCentroidLat) ? comuneCentroidLat : null,
      comuneCentroidLng: Number.isFinite(comuneCentroidLng) ? comuneCentroidLng : null,
    };
  }

  private mapListingRow(row: ListingRow): ListingRecord {
    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      title: row.title,
      description: row.description,
      listingType: row.listingType,
      priceAmount: row.priceAmount,
      currency: row.currency,
      ageText: row.ageText,
      sex: row.sex,
      breed: row.breed,
      status: row.status,
      regionId: row.regionId,
      provinceId: row.provinceId,
      comuneId: row.comuneId,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      publishedAt: row.publishedAt,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  private mapListingMediaRow(row: ListingMediaRow): ListingMediaRecord {
    return {
      id: row.id,
      listingId: row.listingId,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      width: row.width,
      height: row.height,
      hash: row.hash,
      position: row.position,
      isPrimary: row.isPrimary,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapSearchIndexDocumentRow(row: SearchIndexDocumentRow): SearchIndexDocumentRecord {
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
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
