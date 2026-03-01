import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Client } from 'pg';
import { UserRole } from '../src/auth/roles.enum';
import { ListingsRepository } from '../src/listings/listings.repository';
import { MinioStorageService } from '../src/listings/minio-storage.service';
import type { ListingStatus } from '../src/listings/models/listing.model';

type RegionSeedRow = {
  istatCode: string;
  name: string;
  centroidLat: number | null;
  centroidLng: number | null;
};

type ProvinceSeedRow = {
  istatCode: string;
  regionIstatCode: string;
  name: string;
  sigla: string;
  centroidLat: number | null;
  centroidLng: number | null;
};

type ComuneSeedRow = {
  istatCode: string;
  regionIstatCode: string;
  provinceIstatCode: string;
  name: string;
  codeCatastale: string | null;
  legacyIstatCode107: string | null;
  centroidLat: number | null;
  centroidLng: number | null;
};

type UpsertCounter = {
  inserted: number;
  updated: number;
};

type GeographySnapshot = {
  source: {
    dataset: string;
    url: string;
    sheetName: string;
    referenceDate: string | null;
    syncedAt: string;
  };
  stats: {
    regions: number;
    provinces: number;
    comuni: number;
  };
  regions: RegionSeedRow[];
  provinces: ProvinceSeedRow[];
  comuni: ComuneSeedRow[];
};

type DemoLocationRow = {
  regionId: string;
  provinceId: string;
  comuneId: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
};

type SeedUserDefinition = {
  providerSubject: string;
  email: string;
  roles: UserRole[];
};

type SeedUserRecord = SeedUserDefinition & {
  ownerUserId: string;
};

type SeedStorageKeyRow = {
  storageKey: string;
};

type DemoListingStatus = Extract<
  ListingStatus,
  'pending_review' | 'published' | 'rejected' | 'suspended'
>;

type DemoListingSeed = {
  ownerUserId: string;
  title: string;
  description: string;
  listingType: string;
  priceAmount: number | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  status: DemoListingStatus;
  publishedAt: string | undefined;
  regionId: string;
  provinceId: string;
  comuneId: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  mediaCount: number;
};

type DemoMediaAsset = {
  fileName: string;
  mimeType: string;
  payload: Buffer;
  fileSize: number;
  hash: string;
};

type DemoSeedStats = {
  listingsSeeded: number;
  mediaSeeded: number;
  statusCounts: Record<DemoListingStatus, number>;
  regionsCovered: number;
  provincesCovered: number;
  comuniCovered: number;
};

type PromotionBoostType = 'boost_24h' | 'boost_7d' | 'boost_30d';

type DemoPlanDefinition = {
  code: string;
  name: string;
  description: string;
  boostType: PromotionBoostType;
  durationHours: number;
  promotionWeight: number;
  metadata: Record<string, unknown>;
};

type SeedPlanRow = {
  id: string;
  code: string;
  inserted: boolean;
};

type DemoPlansUpsertStats = {
  inserted: number;
  updated: number;
  idsByCode: Map<string, string>;
};

type PublishedListingIdRow = {
  id: string;
};

type DemoPromotionSeedStats = {
  promotionsSeeded: number;
  eventsSeeded: number;
  listingIds: string[];
};

const demoUserDefinitions: SeedUserDefinition[] = [
  {
    providerSubject: 'seed-m2-owner-private',
    email: 'utente.seed.demo@adottaungatto.local',
    roles: [UserRole.USER],
  },
  {
    providerSubject: 'seed-m2-owner-gattile',
    email: 'gattile.seed.demo@adottaungatto.local',
    roles: [UserRole.USER],
  },
  {
    providerSubject: 'seed-m2-owner-associazione',
    email: 'associazione.seed.demo@adottaungatto.local',
    roles: [UserRole.USER],
  },
];

const demoPlanDefinitions: DemoPlanDefinition[] = [
  {
    code: 'boost_24h',
    name: 'Boost 24 ore',
    description: 'Spinta visibilita per 24 ore.',
    boostType: 'boost_24h',
    durationHours: 24,
    promotionWeight: 1.12,
    metadata: {
      spotlight: 'search',
      cadence: 'short',
    },
  },
  {
    code: 'boost_7d',
    name: 'Boost 7 giorni',
    description: 'Spinta visibilita per 7 giorni.',
    boostType: 'boost_7d',
    durationHours: 24 * 7,
    promotionWeight: 1.25,
    metadata: {
      spotlight: 'search',
      cadence: 'medium',
    },
  },
  {
    code: 'boost_30d',
    name: 'Boost 30 giorni',
    description: 'Spinta visibilita premium per 30 giorni.',
    boostType: 'boost_30d',
    durationHours: 24 * 30,
    promotionWeight: 1.4,
    metadata: {
      spotlight: 'search',
      cadence: 'long',
    },
  },
];

const demoTargetProvinceSiglas = [
  'TO',
  'MI',
  'BO',
  'FI',
  'RM',
  'NA',
  'BA',
  'PA',
  'CA',
  'GE',
  'VR',
  'TS',
  'PG',
  'AQ',
  'AN',
] as const;

const preferredComuniByProvinceSigla: Partial<
  Record<(typeof demoTargetProvinceSiglas)[number], string[]>
> = {
  TO: ['chieri', 'ivrea', 'moncalieri'],
  MI: ['rho', 'legnano', 'segrate'],
  BO: ['imola', 'castel san pietro terme'],
  FI: ['scandicci', 'sesto fiorentino'],
  RM: ['tivoli', 'frascati'],
  NA: ['pozzuoli', 'portici'],
  BA: ['altamura', 'molfetta'],
  PA: ['bagheria', 'cefalu'],
  CA: ['quartu sant elena', 'capoterra'],
  GE: ['chiavari', 'rapallo'],
  VR: ['legnago', 'peschiera del garda'],
  TS: ['muggia'],
  PG: ['spoleto', 'citta di castello'],
  AQ: ['sulmona', 'avezzano'],
  AN: ['jesi', 'senigallia'],
};

const onePixelPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApMBgX4+7a8AAAAASUVORK5CYII=';

const fallbackDemoMediaAsset: DemoMediaAsset = {
  fileName: 'fallback-demo-media.png',
  mimeType: 'image/png',
  payload: Buffer.from(onePixelPngBase64, 'base64'),
  fileSize: Buffer.from(onePixelPngBase64, 'base64').length,
  hash: createHash('sha256').update(Buffer.from(onePixelPngBase64, 'base64')).digest('hex'),
};

const demoMediaMimeTypeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const resolveSnapshotCandidates = (): string[] => {
  return [
    resolve(process.cwd(), 'data/geography/istat-current.json'),
    resolve(process.cwd(), 'apps/api/data/geography/istat-current.json'),
  ];
};

const resolveDemoMediaDirectoryCandidates = (): string[] => {
  return [
    resolve(process.cwd(), 'da-eliminare'),
    resolve(process.cwd(), '..', '..', 'da-eliminare'),
    resolve(process.cwd(), '..', 'da-eliminare'),
  ];
};

const resolveDemoMediaDirectory = (): string | null => {
  for (const candidate of resolveDemoMediaDirectoryCandidates()) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const loadDemoMediaAssets = async (): Promise<{
  assets: DemoMediaAsset[];
  sourceDirectory: string | null;
  usingFallback: boolean;
}> => {
  const sourceDirectory = resolveDemoMediaDirectory();
  if (!sourceDirectory) {
    return {
      assets: [fallbackDemoMediaAsset],
      sourceDirectory: null,
      usingFallback: true,
    };
  }

  const directoryEntries = await readdir(sourceDirectory, { withFileTypes: true });
  const fileNames = directoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'it'));

  const assets: DemoMediaAsset[] = [];

  for (const fileName of fileNames) {
    const extension = extname(fileName).toLowerCase();
    const mimeType = demoMediaMimeTypeByExtension[extension];
    if (!mimeType) {
      continue;
    }

    const absolutePath = resolve(sourceDirectory, fileName);
    const payload = await readFile(absolutePath);

    assets.push({
      fileName,
      mimeType,
      payload,
      fileSize: payload.length,
      hash: createHash('sha256').update(payload).digest('hex'),
    });
  }

  if (assets.length === 0) {
    return {
      assets: [fallbackDemoMediaAsset],
      sourceDirectory,
      usingFallback: true,
    };
  }

  return {
    assets,
    sourceDirectory,
    usingFallback: false,
  };
};

const isNullableCoordinateValue = (value: unknown): boolean => {
  return (
    value === null || value === undefined || (typeof value === 'number' && Number.isFinite(value))
  );
};

const toNullableCoordinate = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  throw new Error(`Invalid coordinate value "${String(value)}".`);
};

const isRegionSeedRow = (value: unknown): value is RegionSeedRow => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.istatCode === 'string' &&
    typeof entry.name === 'string' &&
    isNullableCoordinateValue(entry.centroidLat) &&
    isNullableCoordinateValue(entry.centroidLng)
  );
};

const isProvinceSeedRow = (value: unknown): value is ProvinceSeedRow => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.istatCode === 'string' &&
    typeof entry.regionIstatCode === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.sigla === 'string' &&
    isNullableCoordinateValue(entry.centroidLat) &&
    isNullableCoordinateValue(entry.centroidLng)
  );
};

const isComuneSeedRow = (value: unknown): value is ComuneSeedRow => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.istatCode === 'string' &&
    typeof entry.regionIstatCode === 'string' &&
    typeof entry.provinceIstatCode === 'string' &&
    typeof entry.name === 'string' &&
    (typeof entry.codeCatastale === 'string' || entry.codeCatastale === null) &&
    (typeof entry.legacyIstatCode107 === 'string' ||
      entry.legacyIstatCode107 === null ||
      entry.legacyIstatCode107 === undefined) &&
    isNullableCoordinateValue(entry.centroidLat) &&
    isNullableCoordinateValue(entry.centroidLng)
  );
};

const loadGeographySnapshot = async (): Promise<{
  snapshot: GeographySnapshot;
  snapshotPath: string;
}> => {
  for (const snapshotPath of resolveSnapshotCandidates()) {
    if (!existsSync(snapshotPath)) {
      continue;
    }

    const raw = await readFile(snapshotPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error(`Invalid geography snapshot format in "${snapshotPath}".`);
    }

    const candidate = parsed as Record<string, unknown>;
    const regions = candidate.regions;
    const provinces = candidate.provinces;
    const comuni = candidate.comuni;
    const source = candidate.source;
    const stats = candidate.stats;

    if (!Array.isArray(regions) || !regions.every(isRegionSeedRow)) {
      throw new Error(`Invalid "regions" payload in "${snapshotPath}".`);
    }

    if (!Array.isArray(provinces) || !provinces.every(isProvinceSeedRow)) {
      throw new Error(`Invalid "provinces" payload in "${snapshotPath}".`);
    }

    if (!Array.isArray(comuni) || !comuni.every(isComuneSeedRow)) {
      throw new Error(`Invalid "comuni" payload in "${snapshotPath}".`);
    }

    if (typeof source !== 'object' || source === null) {
      throw new Error(`Invalid "source" metadata in "${snapshotPath}".`);
    }

    if (typeof stats !== 'object' || stats === null) {
      throw new Error(`Invalid "stats" metadata in "${snapshotPath}".`);
    }

    const typedSource = source as Record<string, unknown>;
    const typedStats = stats as Record<string, unknown>;

    if (
      typeof typedSource.dataset !== 'string' ||
      typeof typedSource.url !== 'string' ||
      typeof typedSource.sheetName !== 'string' ||
      typeof typedSource.syncedAt !== 'string' ||
      (typeof typedSource.referenceDate !== 'string' && typedSource.referenceDate !== null)
    ) {
      throw new Error(`Invalid source metadata values in "${snapshotPath}".`);
    }

    if (
      typeof typedStats.regions !== 'number' ||
      typeof typedStats.provinces !== 'number' ||
      typeof typedStats.comuni !== 'number'
    ) {
      throw new Error(`Invalid stats metadata values in "${snapshotPath}".`);
    }

    return {
      snapshot: {
        source: {
          dataset: typedSource.dataset,
          url: typedSource.url,
          sheetName: typedSource.sheetName,
          referenceDate: (typedSource.referenceDate as string | null) ?? null,
          syncedAt: typedSource.syncedAt,
        },
        stats: {
          regions: typedStats.regions,
          provinces: typedStats.provinces,
          comuni: typedStats.comuni,
        },
        regions: regions.map((region) => ({
          istatCode: region.istatCode,
          name: region.name,
          centroidLat: toNullableCoordinate(region.centroidLat),
          centroidLng: toNullableCoordinate(region.centroidLng),
        })),
        provinces: provinces.map((province) => ({
          istatCode: province.istatCode,
          regionIstatCode: province.regionIstatCode,
          name: province.name,
          sigla: province.sigla,
          centroidLat: toNullableCoordinate(province.centroidLat),
          centroidLng: toNullableCoordinate(province.centroidLng),
        })),
        comuni: comuni.map((comune) => ({
          istatCode: comune.istatCode,
          regionIstatCode: comune.regionIstatCode,
          provinceIstatCode: comune.provinceIstatCode,
          name: comune.name,
          codeCatastale: comune.codeCatastale,
          legacyIstatCode107: comune.legacyIstatCode107 ?? null,
          centroidLat: toNullableCoordinate(comune.centroidLat),
          centroidLng: toNullableCoordinate(comune.centroidLng),
        })),
      },
      snapshotPath,
    };
  }

  throw new Error(
    'Geography snapshot not found. Run `pnpm geo:sync` to download ISTAT data and generate local snapshot.',
  );
};

const addUpsertResult = (counter: UpsertCounter, inserted: boolean): void => {
  if (inserted) {
    counter.inserted += 1;
    return;
  }

  counter.updated += 1;
};

const prepareProvinceSiglaForSnapshot = async (
  client: Client,
  snapshot: GeographySnapshot,
): Promise<number> => {
  const snapshotProvinceCodes = snapshot.provinces.map((province) => province.istatCode);
  const snapshotSiglas = snapshot.provinces.map((province) => province.sigla.toUpperCase());

  const updated = await client.query(
    `
      UPDATE provinces
      SET sigla = LOWER(sigla)
      WHERE NOT (istat_code = ANY($1::text[]))
        AND UPPER(sigla) = ANY($2::text[]);
    `,
    [snapshotProvinceCodes, snapshotSiglas],
  );

  return updated.rowCount ?? 0;
};

const deleteStaleComuni = async (client: Client, snapshot: GeographySnapshot): Promise<number> => {
  const comuniCodes = snapshot.comuni.map((comune) => comune.istatCode);
  const deleted = await client.query(
    `
      DELETE FROM comuni
      WHERE NOT (istat_code = ANY($1::text[]));
    `,
    [comuniCodes],
  );

  return deleted.rowCount ?? 0;
};

const deleteStaleProvincesAndRegions = async (
  client: Client,
  snapshot: GeographySnapshot,
): Promise<{ regions: number; provinces: number }> => {
  const regionCodes = snapshot.regions.map((region) => region.istatCode);
  const provinceCodes = snapshot.provinces.map((province) => province.istatCode);

  const deletedProvinces = await client.query(
    `
      DELETE FROM provinces
      WHERE NOT (istat_code = ANY($1::text[]));
    `,
    [provinceCodes],
  );

  const deletedRegions = await client.query(
    `
      DELETE FROM regions
      WHERE NOT (istat_code = ANY($1::text[]));
    `,
    [regionCodes],
  );

  return {
    regions: deletedRegions.rowCount ?? 0,
    provinces: deletedProvinces.rowCount ?? 0,
  };
};

const upsertRegions = async (
  client: Client,
  regions: RegionSeedRow[],
): Promise<{ idsByCode: Map<string, number>; counter: UpsertCounter }> => {
  const idsByCode = new Map<string, number>();
  const counter: UpsertCounter = { inserted: 0, updated: 0 };

  for (const region of regions) {
    const result = await client.query<{
      id: string;
      inserted: boolean;
    }>(
      `
        INSERT INTO regions (istat_code, name, centroid_lat, centroid_lng)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (istat_code)
        DO UPDATE SET
          name = EXCLUDED.name,
          centroid_lat = EXCLUDED.centroid_lat,
          centroid_lng = EXCLUDED.centroid_lng,
          updated_at = NOW()
        RETURNING id::text AS id, (xmax = 0) AS inserted;
      `,
      [region.istatCode, region.name, region.centroidLat, region.centroidLng],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Failed to upsert region ${region.istatCode}.`);
    }

    idsByCode.set(region.istatCode, Number.parseInt(row.id, 10));
    addUpsertResult(counter, row.inserted);
  }

  return {
    idsByCode,
    counter,
  };
};

const upsertProvinces = async (
  client: Client,
  provinces: ProvinceSeedRow[],
  regionIdsByCode: Map<string, number>,
): Promise<{ idsByCode: Map<string, number>; counter: UpsertCounter }> => {
  const idsByCode = new Map<string, number>();
  const counter: UpsertCounter = { inserted: 0, updated: 0 };

  for (const province of provinces) {
    const regionId = regionIdsByCode.get(province.regionIstatCode);
    if (!regionId) {
      throw new Error(
        `Cannot upsert province ${province.istatCode}: missing region ${province.regionIstatCode}.`,
      );
    }

    const result = await client.query<{
      id: string;
      inserted: boolean;
    }>(
      `
        INSERT INTO provinces (region_id, istat_code, name, sigla, centroid_lat, centroid_lng)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (istat_code)
        DO UPDATE SET
          region_id = EXCLUDED.region_id,
          name = EXCLUDED.name,
          sigla = EXCLUDED.sigla,
          centroid_lat = EXCLUDED.centroid_lat,
          centroid_lng = EXCLUDED.centroid_lng,
          updated_at = NOW()
        RETURNING id::text AS id, (xmax = 0) AS inserted;
      `,
      [
        regionId,
        province.istatCode,
        province.name,
        province.sigla,
        province.centroidLat,
        province.centroidLng,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Failed to upsert province ${province.istatCode}.`);
    }

    idsByCode.set(province.istatCode, Number.parseInt(row.id, 10));
    addUpsertResult(counter, row.inserted);
  }

  return {
    idsByCode,
    counter,
  };
};

const upsertComuni = async (
  client: Client,
  comuni: ComuneSeedRow[],
  regionIdsByCode: Map<string, number>,
  provinceIdsByCode: Map<string, number>,
): Promise<UpsertCounter> => {
  const counter: UpsertCounter = { inserted: 0, updated: 0 };

  for (const comune of comuni) {
    const regionId = regionIdsByCode.get(comune.regionIstatCode);
    if (!regionId) {
      throw new Error(`Cannot upsert comune ${comune.istatCode}: missing region.`);
    }

    const provinceId = provinceIdsByCode.get(comune.provinceIstatCode);
    if (!provinceId) {
      throw new Error(`Cannot upsert comune ${comune.istatCode}: missing province.`);
    }

    const result = await client.query<{
      inserted: boolean;
    }>(
      `
        INSERT INTO comuni (
          region_id,
          province_id,
          istat_code,
          name,
          code_catastale,
          centroid_lat,
          centroid_lng,
          geom
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          CASE
            WHEN $6::numeric IS NOT NULL AND $7::numeric IS NOT NULL
              THEN ST_SetSRID(ST_MakePoint($7::float8, $6::float8), 4326)
            ELSE NULL
          END
        )
        ON CONFLICT (istat_code)
        DO UPDATE SET
          region_id = EXCLUDED.region_id,
          province_id = EXCLUDED.province_id,
          name = EXCLUDED.name,
          code_catastale = EXCLUDED.code_catastale,
          centroid_lat = EXCLUDED.centroid_lat,
          centroid_lng = EXCLUDED.centroid_lng,
          geom = EXCLUDED.geom,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted;
      `,
      [
        regionId,
        provinceId,
        comune.istatCode,
        comune.name,
        comune.codeCatastale,
        comune.centroidLat,
        comune.centroidLng,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Failed to upsert comune ${comune.istatCode}.`);
    }

    addUpsertResult(counter, row.inserted);
  }

  return counter;
};

const normalizeName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const resolveDemoLocations = async (client: Client): Promise<DemoLocationRow[]> => {
  const locations: DemoLocationRow[] = [];

  for (const provinceSigla of demoTargetProvinceSiglas) {
    const preferredComuni = (preferredComuniByProvinceSigla[provinceSigla] ?? []).map((value) =>
      normalizeName(value),
    );

    const result = await client.query<DemoLocationRow>(
      `
        SELECT
          r.id::text AS "regionId",
          p.id::text AS "provinceId",
          c.id::text AS "comuneId",
          r.name AS "regionName",
          p.name AS "provinceName",
          p.sigla AS "provinceSigla",
          c.name AS "comuneName"
        FROM comuni c
        INNER JOIN provinces p ON p.id = c.province_id
        INNER JOIN regions r ON r.id = c.region_id
        WHERE p.sigla = $1
        ORDER BY
          CASE
            WHEN LOWER(
              REGEXP_REPLACE(
                TRANSLATE(c.name, 'ÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝàáâãäåèéêëìíîïòóôõöùúûüýÿ', 'AAAAAAEEEEIIIIOOOOOUUUUYaaaaaaeeeeiiiiooooouuuuyy'),
                '[^a-zA-Z0-9 ]',
                ' ',
                'g'
              )
            ) = ANY($2::text[])
              THEN 0
            ELSE 1
          END,
          CASE WHEN LOWER(c.name) = LOWER(p.name) THEN 1 ELSE 0 END,
          LENGTH(c.name) ASC,
          c.name ASC
        LIMIT 1;
      `,
      [provinceSigla, preferredComuni],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Unable to resolve a demo location for province sigla "${provinceSigla}".`);
    }

    locations.push(row);
  }

  if (locations.length < 12) {
    throw new Error(`Insufficient demo locations resolved (${locations.length}).`);
  }

  return locations;
};

const upsertDemoUsers = async (repository: ListingsRepository): Promise<SeedUserRecord[]> => {
  const nowIso = new Date().toISOString();
  const users: SeedUserRecord[] = [];

  for (const definition of demoUserDefinitions) {
    const ownerUserId = await repository.upsertOwnerUser({
      id: `seed-${definition.providerSubject}`,
      provider: 'dev-header',
      providerSubject: definition.providerSubject,
      email: definition.email,
      roles: definition.roles,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    users.push({
      ...definition,
      ownerUserId,
    });
  }

  return users;
};

const listSeedStorageKeys = async (
  client: Client,
  ownerUserIds: string[],
): Promise<SeedStorageKeyRow[]> => {
  if (ownerUserIds.length === 0) {
    return [];
  }

  const result = await client.query<SeedStorageKeyRow>(
    `
      SELECT lm.storage_key AS "storageKey"
      FROM listing_media lm
      INNER JOIN listings l ON l.id = lm.listing_id
      WHERE l.owner_user_id = ANY($1::bigint[]);
    `,
    [ownerUserIds],
  );

  return result.rows;
};

const purgeSeedListings = async (client: Client, ownerUserIds: string[]): Promise<number> => {
  if (ownerUserIds.length === 0) {
    return 0;
  }

  const deleted = await client.query(
    `
      DELETE FROM listings
      WHERE owner_user_id = ANY($1::bigint[]);
    `,
    [ownerUserIds],
  );

  return deleted.rowCount ?? 0;
};

const toIsoDaysAgo = (daysAgo: number, hourUtc: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date.toISOString();
};

const buildDemoListings = (
  locations: DemoLocationRow[],
  users: SeedUserRecord[],
): DemoListingSeed[] => {
  const ageOptions = ['3 mesi', '5 mesi', '8 mesi', '1 anno', '2 anni', '4 anni', '6 anni'];
  const breedOptions: Array<string | null> = [
    'Europeo',
    'Maine Coon',
    'Siamese',
    'Soriano',
    'Persiano',
    null,
  ];
  const descriptorOptions = [
    'Gattino curioso',
    'Micia dolce',
    'Fratellini inseparabili',
    'Gatto tranquillo',
    'Gattina socievole',
    'Micio energico',
    'Micia affettuosa',
    'Gattino giocherellone',
  ];

  const listings: DemoListingSeed[] = [];
  const total = 30;

  for (let index = 0; index < total; index += 1) {
    const location = locations[index % locations.length];
    const owner = users[index % users.length];
    const descriptor = descriptorOptions[index % descriptorOptions.length];
    const listingType = index % 4 === 0 ? 'vendita' : 'adozione';
    const status: DemoListingStatus =
      index < 18
        ? 'published'
        : index < 24
          ? 'pending_review'
          : index < 28
            ? 'rejected'
            : 'suspended';
    const mediaCount = index % 3 === 0 ? 2 : 1;
    const listingNumber = String(index + 1).padStart(2, '0');
    const priceAmount = listingType === 'vendita' ? 180 + (index % 6) * 35 : null;
    const publishedAt =
      status === 'published' || status === 'suspended' ? toIsoDaysAgo(36 - index, 14) : undefined;

    listings.push({
      ownerUserId: owner.ownerUserId,
      title: `[DEMO M2.11] ${descriptor} a ${location.comuneName} #${listingNumber}`,
      description: `${descriptor} disponibile in ${location.comuneName} (${location.provinceSigla}), ${location.regionName}. Annuncio seed locale per test ricerca, moderazione e UI pubblica.`,
      listingType,
      priceAmount,
      currency: 'EUR',
      ageText: ageOptions[index % ageOptions.length] ?? '1 anno',
      sex: index % 2 === 0 ? 'femmina' : 'maschio',
      breed: breedOptions[index % breedOptions.length] ?? null,
      status,
      publishedAt,
      regionId: location.regionId,
      provinceId: location.provinceId,
      comuneId: location.comuneId,
      regionName: location.regionName,
      provinceName: location.provinceName,
      provinceSigla: location.provinceSigla,
      comuneName: location.comuneName,
      contactName:
        index % 3 === 0
          ? 'Gattile Demo Centro'
          : index % 3 === 1
            ? 'Privato Demo'
            : 'Associazione Demo',
      contactPhone: `+3902${String(1000000 + index).padStart(7, '0')}`,
      contactEmail: `contatto.demo+${listingNumber}@adottaungatto.local`,
      mediaCount,
    });
  }

  return listings;
};

const seedDemoListingsAndMedia = async (
  repository: ListingsRepository,
  storageService: MinioStorageService,
  demoListings: DemoListingSeed[],
  demoMediaAssets: DemoMediaAsset[],
): Promise<DemoSeedStats> => {
  const statusCounts: Record<DemoListingStatus, number> = {
    published: 0,
    pending_review: 0,
    rejected: 0,
    suspended: 0,
  };
  let mediaSeeded = 0;

  const regions = new Set<string>();
  const provinces = new Set<string>();
  const comuni = new Set<string>();

  for (const [listingIndex, listing] of demoListings.entries()) {
    const createdListing = await repository.createListing(listing.ownerUserId, {
      title: listing.title,
      description: listing.description,
      listingType: listing.listingType,
      priceAmount: listing.priceAmount,
      currency: listing.currency,
      ageText: listing.ageText,
      sex: listing.sex,
      breed: listing.breed,
      status: listing.status,
      regionId: listing.regionId,
      provinceId: listing.provinceId,
      comuneId: listing.comuneId,
      contactName: listing.contactName,
      contactPhone: listing.contactPhone,
      contactEmail: listing.contactEmail,
      publishedAt: listing.publishedAt,
    });

    statusCounts[listing.status] += 1;
    regions.add(listing.regionName);
    provinces.add(`${listing.provinceName} (${listing.provinceSigla})`);
    comuni.add(`${listing.comuneName} (${listing.provinceSigla})`);

    for (let mediaIndex = 0; mediaIndex < listing.mediaCount; mediaIndex += 1) {
      const demoMediaAsset = demoMediaAssets[(listingIndex + mediaIndex) % demoMediaAssets.length];
      if (!demoMediaAsset) {
        throw new Error('No demo media asset available for listing seed.');
      }

      const upload = await storageService.uploadListingMedia({
        listingId: createdListing.id,
        mimeType: demoMediaAsset.mimeType,
        payload: demoMediaAsset.payload,
        originalFileName: demoMediaAsset.fileName,
      });

      try {
        await repository.createListingMedia(createdListing.id, {
          storageKey: upload.storageKey,
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
          width: null,
          height: null,
          hash: demoMediaAsset.hash,
          position: mediaIndex + 1,
          isPrimary: mediaIndex === 0,
        });
      } catch (error) {
        await storageService.deleteMediaObject(upload.storageKey);
        throw error;
      }

      mediaSeeded += 1;
    }
  }

  return {
    listingsSeeded: demoListings.length,
    mediaSeeded,
    statusCounts,
    regionsCovered: regions.size,
    provincesCovered: provinces.size,
    comuniCovered: comuni.size,
  };
};

const upsertDemoPlans = async (client: Client): Promise<DemoPlansUpsertStats> => {
  const idsByCode = new Map<string, string>();
  let inserted = 0;
  let updated = 0;

  for (const plan of demoPlanDefinitions) {
    const result = await client.query<SeedPlanRow>(
      `
        INSERT INTO plans (
          code,
          name,
          description,
          boost_type,
          duration_hours,
          promotion_weight,
          is_active,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::promotion_boost_type,
          $5::integer,
          $6::numeric,
          TRUE,
          $7::jsonb
        )
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          boost_type = EXCLUDED.boost_type,
          duration_hours = EXCLUDED.duration_hours,
          promotion_weight = EXCLUDED.promotion_weight,
          is_active = EXCLUDED.is_active,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS "id", code AS "code", (xmax = 0) AS inserted;
      `,
      [
        plan.code,
        plan.name,
        plan.description,
        plan.boostType,
        plan.durationHours,
        plan.promotionWeight,
        JSON.stringify(plan.metadata),
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Failed to upsert demo promotion plan "${plan.code}".`);
    }

    idsByCode.set(row.code, row.id);
    if (row.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return {
    inserted,
    updated,
    idsByCode,
  };
};

const seedDemoPromotions = async (
  client: Client,
  seedOwnerUserIds: string[],
  actorUserId: string,
  planIdsByCode: Map<string, string>,
): Promise<DemoPromotionSeedStats> => {
  if (seedOwnerUserIds.length === 0) {
    return {
      promotionsSeeded: 0,
      eventsSeeded: 0,
      listingIds: [],
    };
  }

  const publishedListings = await client.query<PublishedListingIdRow>(
    `
      SELECT id::text AS "id"
      FROM listings
      WHERE owner_user_id = ANY($1::bigint[])
        AND status = 'published'
        AND deleted_at IS NULL
      ORDER BY COALESCE(published_at, created_at) DESC, id DESC
      LIMIT 3;
    `,
    [seedOwnerUserIds],
  );

  if (publishedListings.rows.length === 0) {
    return {
      promotionsSeeded: 0,
      eventsSeeded: 0,
      listingIds: [],
    };
  }

  let promotionsSeeded = 0;
  let eventsSeeded = 0;
  const listingIds: string[] = [];
  const now = new Date();

  for (const [index, listing] of publishedListings.rows.entries()) {
    const planDefinition = demoPlanDefinitions[index % demoPlanDefinitions.length];
    if (!planDefinition) {
      continue;
    }

    const planId = planIdsByCode.get(planDefinition.code);
    if (!planId) {
      throw new Error(
        `Missing plan id for code "${planDefinition.code}" while seeding promotions.`,
      );
    }

    const startsAt = new Date(now.getTime() - (index + 1) * 2 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + planDefinition.durationHours * 60 * 60 * 1000);

    const promotionInsertResult = await client.query<{ id: string }>(
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
          'active',
          $4::timestamptz,
          $5::timestamptz,
          $4::timestamptz,
          $6::jsonb
        )
        RETURNING id::text AS "id";
      `,
      [
        listing.id,
        planId,
        actorUserId,
        startsAt.toISOString(),
        endsAt.toISOString(),
        JSON.stringify({
          source: 'db-seed',
          planCode: planDefinition.code,
          seededAt: now.toISOString(),
        }),
      ],
    );

    const promotionRow = promotionInsertResult.rows[0];
    if (!promotionRow) {
      throw new Error(`Failed to create demo promotion for listing "${listing.id}".`);
    }

    await client.query(
      `
        INSERT INTO promotion_events (
          listing_promotion_id,
          event_type,
          actor_user_id,
          event_at,
          payload
        )
        VALUES
          (
            $1::bigint,
            'created',
            $2::bigint,
            NOW(),
            $3::jsonb
          ),
          (
            $1::bigint,
            'activated',
            $2::bigint,
            $4::timestamptz,
            $5::jsonb
          );
      `,
      [
        promotionRow.id,
        actorUserId,
        JSON.stringify({
          source: 'db-seed',
          status: 'active',
        }),
        startsAt.toISOString(),
        JSON.stringify({
          source: 'db-seed',
          activatedAt: startsAt.toISOString(),
        }),
      ],
    );

    promotionsSeeded += 1;
    eventsSeeded += 2;
    listingIds.push(listing.id);
  }

  return {
    promotionsSeeded,
    eventsSeeded,
    listingIds,
  };
};

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();
  const env = loadApiEnv();

  const { snapshot, snapshotPath } = await loadGeographySnapshot();
  const demoMedia = await loadDemoMediaAssets();

  console.log(`[db:seed] Connected target: ${env.DATABASE_URL}`);
  console.log(`[db:seed] Snapshot path: ${snapshotPath}`);
  console.log(
    `[db:seed] Source: ${snapshot.source.dataset} (${snapshot.source.referenceDate ?? 'unknown date'})`,
  );
  console.log(`[db:seed] Sheet: ${snapshot.source.sheetName}`);
  console.log(
    `[db:seed] Dataset loaded: regions=${snapshot.regions.length}, provinces=${snapshot.provinces.length}, comuni=${snapshot.comuni.length}.`,
  );
  const regionCentroids = snapshot.regions.filter(
    (region) => region.centroidLat !== null && region.centroidLng !== null,
  ).length;
  const provinceCentroids = snapshot.provinces.filter(
    (province) => province.centroidLat !== null && province.centroidLng !== null,
  ).length;
  const comuniCentroids = snapshot.comuni.filter(
    (comune) => comune.centroidLat !== null && comune.centroidLng !== null,
  ).length;
  console.log(
    `[db:seed] Snapshot centroids coverage: regions=${regionCentroids}, provinces=${provinceCentroids}, comuni=${comuniCentroids}.`,
  );
  console.log(
    `[db:seed] Demo media source: ${demoMedia.sourceDirectory ?? 'embedded fallback'} (assets=${demoMedia.assets.length}, fallback=${demoMedia.usingFallback ? 'yes' : 'no'}).`,
  );

  const client = new Client({
    connectionString: env.DATABASE_URL,
  });
  const repository = new ListingsRepository();
  const storageService = new MinioStorageService();

  await client.connect();

  try {
    try {
      await client.query('BEGIN');

      const normalizedSiglaCount = await prepareProvinceSiglaForSnapshot(client, snapshot);
      const regionsResult = await upsertRegions(client, snapshot.regions);
      const provincesResult = await upsertProvinces(
        client,
        snapshot.provinces,
        regionsResult.idsByCode,
      );
      const deletedStaleComuni = await deleteStaleComuni(client, snapshot);
      const comuniCounter = await upsertComuni(
        client,
        snapshot.comuni,
        regionsResult.idsByCode,
        provincesResult.idsByCode,
      );
      const pruned = await deleteStaleProvincesAndRegions(client, snapshot);

      await client.query('COMMIT');

      console.log(
        `[db:seed] Normalized stale sigla before upsert: ${normalizedSiglaCount} row(s).`,
      );
      console.log(`[db:seed] Deleted stale comuni before upsert: ${deletedStaleComuni}.`);
      console.log(
        `[db:seed] Pruned stale rows after upsert: regions=${pruned.regions}, provinces=${pruned.provinces}.`,
      );
      console.log(
        `[db:seed] Regions upsert: inserted=${regionsResult.counter.inserted}, updated=${regionsResult.counter.updated}.`,
      );
      console.log(
        `[db:seed] Provinces upsert: inserted=${provincesResult.counter.inserted}, updated=${provincesResult.counter.updated}.`,
      );
      console.log(
        `[db:seed] Comuni upsert: inserted=${comuniCounter.inserted}, updated=${comuniCounter.updated}.`,
      );
      console.log('[db:seed] Geography import completed successfully.');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    await storageService.ensureRequiredBuckets();
    const demoPlansStats = await upsertDemoPlans(client);
    const seedUsers = await upsertDemoUsers(repository);
    const seedOwnerUserIds = seedUsers.map((user) => user.ownerUserId);
    const demoPromotionsActorUserId = seedUsers[0]?.ownerUserId;
    if (!demoPromotionsActorUserId) {
      throw new Error('No demo users available to seed promotions.');
    }

    const staleMediaRows = await listSeedStorageKeys(client, seedOwnerUserIds);
    let cleanedObjects = 0;
    for (const staleMedia of staleMediaRows) {
      await storageService.deleteMediaObject(staleMedia.storageKey);
      cleanedObjects += 1;
    }

    const removedListings = await purgeSeedListings(client, seedOwnerUserIds);
    const locations = await resolveDemoLocations(client);
    const demoListings = buildDemoListings(locations, seedUsers);
    const demoSeedStats = await seedDemoListingsAndMedia(
      repository,
      storageService,
      demoListings,
      demoMedia.assets,
    );
    const demoPromotionsStats = await seedDemoPromotions(
      client,
      seedOwnerUserIds,
      demoPromotionsActorUserId,
      demoPlansStats.idsByCode,
    );

    console.log(`[db:seed] Demo users upserted: ${seedUsers.length}.`);
    console.log(
      `[db:seed] Demo plans upsert: inserted=${demoPlansStats.inserted}, updated=${demoPlansStats.updated}.`,
    );
    console.log(
      `[db:seed] Removed previous demo listings: ${removedListings}. Cleaned media objects: ${cleanedObjects}.`,
    );
    console.log(
      `[db:seed] Demo listings seeded: ${demoSeedStats.listingsSeeded}. Demo media seeded: ${demoSeedStats.mediaSeeded}.`,
    );
    console.log(
      `[db:seed] Demo status distribution: published=${demoSeedStats.statusCounts.published}, pending_review=${demoSeedStats.statusCounts.pending_review}, rejected=${demoSeedStats.statusCounts.rejected}, suspended=${demoSeedStats.statusCounts.suspended}.`,
    );
    console.log(
      `[db:seed] Demo geography coverage: regions=${demoSeedStats.regionsCovered}, provinces=${demoSeedStats.provincesCovered}, comuni=${demoSeedStats.comuniCovered}.`,
    );
    console.log(
      `[db:seed] Demo promotions seeded: promotions=${demoPromotionsStats.promotionsSeeded}, events=${demoPromotionsStats.eventsSeeded}, listingIds=[${demoPromotionsStats.listingIds.join(', ')}].`,
    );
    console.log(
      '[db:seed] M2.11 demo listings/media + M5.1 plans/promotions completed successfully.',
    );
  } finally {
    await repository.onModuleDestroy();
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[db:seed] ${error.message}`);
  process.exit(1);
});
