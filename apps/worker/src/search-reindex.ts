import { loadWorkerEnv } from '@adottaungatto/config';
import { SEARCH_INDEX_LEGACY_NAME } from '@adottaungatto/types';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';
import { createSearchIndexAdminClient } from './search-index-admin';

loadDotEnv({ path: '.env.local' });
loadDotEnv();
const env = loadWorkerEnv();

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

type SearchIndexDocumentRecord = {
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

const adminClient = createSearchIndexAdminClient(env.OPENSEARCH_URL);

const toSearchDocument = (row: SearchIndexDocumentRow): SearchIndexDocumentRecord => {
  const lat = row.comuneCentroidLat ? Number.parseFloat(row.comuneCentroidLat) : Number.NaN;
  const lon = row.comuneCentroidLng ? Number.parseFloat(row.comuneCentroidLng) : Number.NaN;
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
};

const listPublishedDocuments = async (
  pool: Pool,
  limit: number,
  lastListingId: string | null,
): Promise<SearchIndexDocumentRecord[]> => {
  const result = await pool.query<SearchIndexDocumentRow>(
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
      WHERE l.status = 'published'
        AND l.deleted_at IS NULL
        AND ($2::bigint IS NULL OR l.id > $2::bigint)
      ORDER BY l.id ASC
      LIMIT $1::integer
      ;
    `,
    [limit, lastListingId],
  );

  return result.rows.map((row) => toSearchDocument(row));
};

const run = async () => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  try {
    console.log(`[search:reindex] OpenSearch endpoint: ${env.OPENSEARCH_URL}`);
    const { readTargets, writeTargets } = await adminClient.ensureAliasesReady({
      log: (message) => {
        console.log(`[search:reindex] ${message}`);
      },
      warn: (message) => {
        console.log(`[search:reindex] ${message}`);
      },
    });
    const currentIndexName = readTargets[0] ?? writeTargets[0] ?? SEARCH_INDEX_LEGACY_NAME;
    const nextIndexName = await adminClient.createVersionedIndex();

    console.log(`[search:reindex] activeIndex=${currentIndexName} nextIndex=${nextIndexName}`);

    const batchSize = 200;
    let lastListingId: string | null = null;
    let indexed = 0;

    try {
      while (true) {
        const documents = await listPublishedDocuments(pool, batchSize, lastListingId);
        if (documents.length === 0) {
          break;
        }

        await adminClient.bulkIndexDocuments(nextIndexName, documents);
        indexed += documents.length;
        lastListingId = documents[documents.length - 1]?.id ?? lastListingId;
      }

      await adminClient.refreshIndex(nextIndexName);
      await adminClient.swapAliases(nextIndexName, readTargets, writeTargets);

      console.log(
        `[search:reindex] done activeIndex=${nextIndexName} indexed=${indexed} aliases=listings_read,listings_write`,
      );
    } catch (error) {
      try {
        await adminClient.deleteIndexIfExists(nextIndexName);
      } catch {
        console.warn(`[search:reindex] cleanup failed for index ${nextIndexName}`);
      }
      throw error;
    }
  } finally {
    await pool.end();
  }
};

run().catch((error: Error) => {
  console.error(`[search:reindex] ${error.message}`);
  process.exit(1);
});
