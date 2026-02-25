import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';

loadDotEnv({ path: '.env.local' });
loadDotEnv();
const env = loadWorkerEnv();

const INDEX_NAME = 'listings_v1';
const baseUrl = env.OPENSEARCH_URL.replace(/\/+$/, '');

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
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const SEARCH_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      title: { type: 'text' },
      description: { type: 'text' },
      listingType: { type: 'keyword' },
      priceAmount: { type: 'double' },
      currency: { type: 'keyword' },
      ageText: { type: 'text' },
      sex: { type: 'keyword' },
      breed: { type: 'keyword' },
      status: { type: 'keyword' },
      regionId: { type: 'keyword' },
      provinceId: { type: 'keyword' },
      comuneId: { type: 'keyword' },
      regionName: { type: 'keyword' },
      provinceName: { type: 'keyword' },
      provinceSigla: { type: 'keyword' },
      comuneName: { type: 'keyword' },
      location: { type: 'geo_point' },
      publishedAt: { type: 'date' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
} as const;

const requestOpenSearch = async (
  path: string,
  options: {
    method?: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD';
    body?: unknown;
    parseJson?: boolean;
  } = {},
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (options.parseJson === false) {
    return {
      status: response.status,
      body: null,
    };
  }

  const text = await response.text();
  if (!text) {
    return {
      status: response.status,
      body: null,
    };
  }

  try {
    return {
      status: response.status,
      body: JSON.parse(text),
    };
  } catch {
    return {
      status: response.status,
      body: text,
    };
  }
};

const ensureIndexExists = async () => {
  const head = await requestOpenSearch(`/${INDEX_NAME}`, {
    method: 'HEAD',
    parseJson: false,
  });

  if (head.status >= 200 && head.status < 300) {
    return;
  }

  if (head.status !== 404) {
    throw new Error(`OpenSearch index check failed (${head.status}).`);
  }

  const created = await requestOpenSearch(`/${INDEX_NAME}`, {
    method: 'PUT',
    body: SEARCH_INDEX_MAPPING,
  });

  if (created.status < 200 || created.status >= 300) {
    throw new Error(
      `OpenSearch index creation failed (${created.status}): ${JSON.stringify(created.body)}`,
    );
  }
};

const clearIndexDocuments = async () => {
  const response = await requestOpenSearch(`/${INDEX_NAME}/_delete_by_query?refresh=true`, {
    method: 'POST',
    body: {
      query: {
        match_all: {},
      },
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `OpenSearch delete-by-query failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }
};

const toSearchDocument = (row: SearchIndexDocumentRow): SearchIndexDocumentRecord => {
  const lat = row.comuneCentroidLat ? Number.parseFloat(row.comuneCentroidLat) : Number.NaN;
  const lon = row.comuneCentroidLng ? Number.parseFloat(row.comuneCentroidLng) : Number.NaN;
  const normalizeTimestamp = (
    value: string | null,
    fallbackValue: string | null,
  ): string | null => {
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
  offset: number,
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
      WHERE l.status = 'published'
        AND l.deleted_at IS NULL
      ORDER BY COALESCE(l.published_at, l.created_at) DESC, l.id DESC
      LIMIT $1::integer
      OFFSET $2::integer;
    `,
    [limit, offset],
  );

  return result.rows.map((row) => toSearchDocument(row));
};

const indexDocument = async (document: SearchIndexDocumentRecord) => {
  const response = await requestOpenSearch(`/${INDEX_NAME}/_doc/${document.id}`, {
    method: 'PUT',
    body: document,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `OpenSearch index failed (${response.status}) for listing ${document.id}: ${JSON.stringify(
        response.body,
      )}`,
    );
  }
};

const run = async () => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  try {
    console.log(`[search:reindex] OpenSearch endpoint: ${env.OPENSEARCH_URL}`);
    await ensureIndexExists();
    await clearIndexDocuments();

    const batchSize = 200;
    let offset = 0;
    let indexed = 0;

    while (true) {
      const documents = await listPublishedDocuments(pool, batchSize, offset);
      if (documents.length === 0) {
        break;
      }

      for (const document of documents) {
        await indexDocument(document);
      }

      indexed += documents.length;
      offset += documents.length;
    }

    await requestOpenSearch(`/${INDEX_NAME}/_refresh`, {
      method: 'POST',
      parseJson: false,
    });

    console.log(`[search:reindex] done index=${INDEX_NAME} indexed=${indexed}`);
  } finally {
    await pool.end();
  }
};

run().catch((error: Error) => {
  console.error(`[search:reindex] ${error.message}`);
  process.exit(1);
});
