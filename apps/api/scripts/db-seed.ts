import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { loadApiEnv } from '@adottaungatto/config';
import { CAT_BREEDS } from '@adottaungatto/types';
import { config as loadDotEnv } from 'dotenv';
import { Client, Pool } from 'pg';
import { UserRole } from '../src/auth/roles.enum';
import { parseListingAgeTextToMonths } from '../src/listings/listing-age';
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
  provider: 'dev-header' | 'keycloak';
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

type KeycloakUserLookup = {
  id: string;
  username?: string;
  email?: string;
};

type KeycloakDemoUserDefinition = {
  username: string;
  email: string;
  roles: UserRole[];
};

const demoListingTitlePrefix = '[DEMO M2.11]';
const demoAccountListingTitlePrefix = '[DEMO USER]';

const demoUserDefinitions: SeedUserDefinition[] = [
  {
    provider: 'dev-header',
    providerSubject: 'seed-m2-owner-private',
    email: 'utente.seed.demo@adottaungatto.local',
    roles: [UserRole.USER],
  },
  {
    provider: 'dev-header',
    providerSubject: 'seed-m2-owner-gattile',
    email: 'gattile.seed.demo@adottaungatto.local',
    roles: [UserRole.USER],
  },
  {
    provider: 'dev-header',
    providerSubject: 'seed-m2-owner-associazione',
    email: 'associazione.seed.demo@adottaungatto.local',
    roles: [UserRole.USER],
  },
];

const keycloakDemoUserDefinitions: KeycloakDemoUserDefinition[] = [
  {
    username: 'utente.demo',
    email: 'utente.demo@adottaungatto.local',
    roles: [UserRole.USER],
  },
  {
    username: 'utente2.demo',
    email: 'utente2.demo@adottaungatto.local',
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

const minimumDemoMediaAssets = 8;
const recommendedDemoMediaAssets = 16;

const embeddedFallbackPalettes = [
  { primary: '#f59e0b', secondary: '#ef4444' },
  { primary: '#ec4899', secondary: '#a855f7' },
  { primary: '#8b5cf6', secondary: '#3b82f6' },
  { primary: '#0ea5e9', secondary: '#14b8a6' },
  { primary: '#22c55e', secondary: '#16a34a' },
  { primary: '#84cc16', secondary: '#65a30d' },
  { primary: '#eab308', secondary: '#f97316' },
  { primary: '#f43f5e', secondary: '#be123c' },
  { primary: '#64748b', secondary: '#0f172a' },
  { primary: '#0ea5e9', secondary: '#1d4ed8' },
  { primary: '#a855f7', secondary: '#4338ca' },
  { primary: '#fb7185', secondary: '#f97316' },
  { primary: '#f97316', secondary: '#ea580c' },
  { primary: '#2dd4bf', secondary: '#0f766e' },
  { primary: '#93c5fd', secondary: '#2563eb' },
  { primary: '#bef264', secondary: '#4d7c0f' },
] as const;

const parseHexRgb = (value: string): [number, number, number] => {
  const normalized = value.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color "${value}".`);
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
};

const buildCrc32Table = (): Uint32Array => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
};

const crc32Table = buildCrc32Table();

const crc32 = (payload: Buffer): number => {
  let value = 0xffffffff;

  for (const entry of payload) {
    const tableIndex = (value ^ entry) & 0xff;
    value = (value >>> 8) ^ crc32Table[tableIndex]!;
  }

  return (value ^ 0xffffffff) >>> 0;
};

const buildPngChunk = (type: string, data: Buffer): Buffer => {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
};

const buildPngBytes = (
  width: number,
  height: number,
  primaryHex: string,
  secondaryHex: string,
): Buffer => {
  const [primaryRed, primaryGreen, primaryBlue] = parseHexRgb(primaryHex);
  const [secondaryRed, secondaryGreen, secondaryBlue] = parseHexRgb(secondaryHex);
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const blend = (x + y) / (width + height);
      const red = Math.round(primaryRed * (1 - blend) + secondaryRed * blend);
      const green = Math.round(primaryGreen * (1 - blend) + secondaryGreen * blend);
      const blue = Math.round(primaryBlue * (1 - blend) + secondaryBlue * blend);
      const pixelOffset = rowOffset + 1 + x * 3;
      raw[pixelOffset] = red;
      raw[pixelOffset + 1] = green;
      raw[pixelOffset + 2] = blue;
    }
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const idatData = deflateSync(raw);

  return Buffer.concat([
    header,
    buildPngChunk('IHDR', ihdrData),
    buildPngChunk('IDAT', idatData),
    buildPngChunk('IEND', Buffer.alloc(0)),
  ]);
};

const buildEmbeddedFallbackMediaAssets = (): DemoMediaAsset[] => {
  return embeddedFallbackPalettes.map((palette, index) => {
    const labelIndex = String(index + 1).padStart(2, '0');
    const payload = buildPngBytes(640, 480, palette.primary, palette.secondary);

    return {
      fileName: `fallback-demo-media-${labelIndex}.png`,
      mimeType: 'image/png',
      payload,
      fileSize: payload.length,
      hash: createHash('sha256').update(payload).digest('hex'),
    };
  });
};

const fallbackDemoMediaAssets = buildEmbeddedFallbackMediaAssets();

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
  localAssetCount: number;
  fallbackAssetCount: number;
}> => {
  const sourceDirectory = resolveDemoMediaDirectory();
  if (!sourceDirectory) {
    return {
      assets: fallbackDemoMediaAssets,
      sourceDirectory: null,
      usingFallback: true,
      localAssetCount: 0,
      fallbackAssetCount: fallbackDemoMediaAssets.length,
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
      assets: fallbackDemoMediaAssets,
      sourceDirectory,
      usingFallback: true,
      localAssetCount: 0,
      fallbackAssetCount: fallbackDemoMediaAssets.length,
    };
  }

  const missingRecommendedAssets = Math.max(0, recommendedDemoMediaAssets - assets.length);
  const fallbackTopUpAssets =
    missingRecommendedAssets > 0
      ? fallbackDemoMediaAssets.slice(0, missingRecommendedAssets)
      : [];

  return {
    assets: [...assets, ...fallbackTopUpAssets],
    sourceDirectory,
    usingFallback: fallbackTopUpAssets.length > 0,
    localAssetCount: assets.length,
    fallbackAssetCount: fallbackTopUpAssets.length,
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

const upsertCatBreeds = async (client: Client): Promise<UpsertCounter> => {
  const counter: UpsertCounter = { inserted: 0, updated: 0 };

  for (const [index, breed] of CAT_BREEDS.entries()) {
    const result = await client.query<{
      inserted: boolean;
    }>(
      `
        INSERT INTO cat_breeds (slug, label, sort_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (slug)
        DO UPDATE SET
          label = EXCLUDED.label,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted;
      `,
      [breed.slug, breed.label, index + 1],
    );

    addUpsertResult(counter, result.rows[0]?.inserted === true);
  }

  return counter;
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

const normalizeUrl = (value: string): string => value.replace(/\/$/, '');

const requestKeycloakAdminToken = async (
  keycloakBaseUrl: string,
  username: string,
  password: string,
): Promise<string> => {
  const response = await fetch(`${keycloakBaseUrl}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username,
      password,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Keycloak admin token request failed (${response.status}): ${payload}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
  };
  if (!payload.access_token) {
    throw new Error('Keycloak admin token request did not return an access token.');
  }

  return payload.access_token;
};

const findKeycloakUserByUsername = async (
  keycloakBaseUrl: string,
  realm: string,
  accessToken: string,
  username: string,
): Promise<KeycloakUserLookup | null> => {
  const url = new URL(`${keycloakBaseUrl}/admin/realms/${realm}/users`);
  url.searchParams.set('username', username);
  url.searchParams.set('exact', 'true');
  url.searchParams.set('max', '1');

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `Keycloak user lookup failed (${response.status}) for "${username}": ${payload}`,
    );
  }

  const users = (await response.json()) as KeycloakUserLookup[];
  return users[0] ?? null;
};

const upsertDemoUsers = async (repository: ListingsRepository): Promise<SeedUserRecord[]> => {
  const nowIso = new Date().toISOString();
  const users: SeedUserRecord[] = [];

  for (const definition of demoUserDefinitions) {
    const ownerUserId = await repository.upsertOwnerUser({
      id: `seed-${definition.providerSubject}`,
      provider: definition.provider,
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

const upsertKeycloakDemoUsers = async (
  repository: ListingsRepository,
): Promise<SeedUserRecord[]> => {
  const env = loadApiEnv();
  const keycloakBaseUrl = normalizeUrl(env.KEYCLOAK_URL);
  const adminUsername = process.env.KEYCLOAK_ADMIN ?? 'admin';
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';
  const nowIso = new Date().toISOString();

  let accessToken: string;
  try {
    accessToken = await requestKeycloakAdminToken(keycloakBaseUrl, adminUsername, adminPassword);
  } catch (error) {
    console.warn(
      `[db:seed] Demo account listings skipped: ${
        error instanceof Error ? error.message : 'unable to authenticate with Keycloak'
      }`,
    );
    return [];
  }

  const users: SeedUserRecord[] = [];
  for (const definition of keycloakDemoUserDefinitions) {
    try {
      const keycloakUser = await findKeycloakUserByUsername(
        keycloakBaseUrl,
        env.KEYCLOAK_REALM,
        accessToken,
        definition.username,
      );

      if (!keycloakUser?.id) {
        console.warn(
          `[db:seed] Demo account listings skipped for "${definition.username}": user not found in Keycloak.`,
        );
        continue;
      }

      const ownerUserId = await repository.upsertOwnerUser({
        id: keycloakUser.id,
        provider: 'keycloak',
        providerSubject: keycloakUser.id,
        email: keycloakUser.email ?? definition.email,
        roles: definition.roles,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      users.push({
        provider: 'keycloak',
        providerSubject: keycloakUser.id,
        email: keycloakUser.email ?? definition.email,
        roles: definition.roles,
        ownerUserId,
      });
    } catch (error) {
      console.warn(
        `[db:seed] Demo account listings skipped for "${definition.username}": ${
          error instanceof Error ? error.message : 'unexpected lookup failure'
        }`,
      );
    }
  }

  return users;
};

const listSeedStorageKeys = async (
  client: Client,
  titlePrefix: string,
): Promise<SeedStorageKeyRow[]> => {
  const result = await client.query<SeedStorageKeyRow>(
    `
      SELECT lm.storage_key AS "storageKey"
      FROM listing_media lm
      INNER JOIN listings l ON l.id = lm.listing_id
      WHERE l.title LIKE $1
        AND l.deleted_at IS NULL;
    `,
    [`${titlePrefix}%`],
  );

  return result.rows;
};

const purgeSeedListings = async (client: Client, titlePrefix: string): Promise<number> => {
  const deleted = await client.query(
    `
      DELETE FROM listings
      WHERE title LIKE $1;
    `,
    [`${titlePrefix}%`],
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
    CAT_BREEDS[0]?.label ?? 'Europeo',
    CAT_BREEDS[2]?.label ?? 'Maine Coon',
    CAT_BREEDS[3]?.label ?? 'Siamese',
    CAT_BREEDS[1]?.label ?? 'Persiano',
    CAT_BREEDS[4]?.label ?? 'Ragdoll',
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
      title: `${demoListingTitlePrefix} ${descriptor} a ${location.comuneName} #${listingNumber}`,
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

const buildDemoAccountPublishedListings = (
  locations: DemoLocationRow[],
  users: SeedUserRecord[],
): DemoListingSeed[] => {
  const descriptors = [
    'Micia gia pronta per una nuova casa',
    'Gattino affettuoso e curioso',
    'Coppia inseparabile abituata alla vita in appartamento',
    'Gattone tranquillo e socievole',
    'Gattina giovane abituata alle persone',
    'Micio dolce con buona compatibilita in casa',
  ];
  const ageOptions = ['4 mesi', '7 mesi', '1 anno', '2 anni', '3 anni', '5 anni'];
  const listings: DemoListingSeed[] = [];

  for (const [userIndex, user] of users.entries()) {
    for (let listingIndex = 0; listingIndex < 3; listingIndex += 1) {
      const seedIndex = userIndex * 3 + listingIndex;
      const descriptor = descriptors[seedIndex % descriptors.length] ?? 'Gatto in cerca di casa';
      const location = locations[(seedIndex * 2 + userIndex) % locations.length];
      if (!location) {
        continue;
      }

      listings.push({
        ownerUserId: user.ownerUserId,
        title: `${demoAccountListingTitlePrefix} ${descriptor} a ${location.comuneName} #${String(
          seedIndex + 1,
        ).padStart(2, '0')}`,
        description: `${descriptor} disponibile in ${location.comuneName} (${location.provinceSigla}), ${location.regionName}. Annuncio demo gia approvato, assegnato all account ${user.email} per testare dashboard, messaggi e modifica annunci.`,
        listingType: listingIndex === 1 ? 'stallo' : 'adozione',
        priceAmount: null,
        currency: 'EUR',
        ageText: ageOptions[seedIndex % ageOptions.length] ?? '1 anno',
        sex: seedIndex % 2 === 0 ? 'femmina' : 'maschio',
        breed:
          seedIndex % 3 === 0 ? null : (CAT_BREEDS[seedIndex % CAT_BREEDS.length]?.label ?? null),
        status: 'published',
        publishedAt: toIsoDaysAgo(10 - seedIndex, 11),
        regionId: location.regionId,
        provinceId: location.provinceId,
        comuneId: location.comuneId,
        regionName: location.regionName,
        provinceName: location.provinceName,
        provinceSigla: location.provinceSigla,
        comuneName: location.comuneName,
        contactName: user.email.startsWith('utente2.') ? 'Utente Demo Secondo' : 'Utente Demo',
        contactPhone: `+3934${String(1000000 + seedIndex).padStart(7, '0')}`,
        contactEmail: user.email,
        mediaCount: 2,
      });
    }
  }

  return listings;
};

const greatestCommonDivisor = (left: number, right: number): number => {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a === 0 ? 1 : a;
};

const resolveCoprimeStep = (size: number, preferredStep: number): number => {
  if (size <= 1) {
    return 1;
  }

  for (let step = Math.min(preferredStep, size - 1); step >= 2; step -= 1) {
    if (greatestCommonDivisor(step, size) === 1) {
      return step;
    }
  }

  return 1;
};

const seedDemoListingsAndMedia = async (
  repository: ListingsRepository,
  storageService: MinioStorageService,
  demoListings: DemoListingSeed[],
  demoMediaAssets: DemoMediaAsset[],
  listingCursorOffset = 0,
): Promise<DemoSeedStats> => {
  if (demoMediaAssets.length === 0) {
    throw new Error('No demo media asset available for listing seed.');
  }

  const statusCounts: Record<DemoListingStatus, number> = {
    published: 0,
    pending_review: 0,
    rejected: 0,
    suspended: 0,
  };
  let mediaSeeded = 0;
  const listingStep = resolveCoprimeStep(demoMediaAssets.length, 7);
  const mediaStep = resolveCoprimeStep(demoMediaAssets.length, 5);

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
      ageMonths: parseListingAgeTextToMonths(listing.ageText) ?? 24,
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
      const listingCursor = listingCursorOffset + listingIndex;
      const mediaAssetIndex =
        (listingCursor * listingStep + mediaIndex * mediaStep) % demoMediaAssets.length;
      const demoMediaAsset = demoMediaAssets[mediaAssetIndex];
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
  actorUserId: string,
  planIdsByCode: Map<string, string>,
): Promise<DemoPromotionSeedStats> => {
  const publishedListings = await client.query<PublishedListingIdRow>(
    `
      SELECT id::text AS "id"
      FROM listings
      WHERE title LIKE $1
        AND status = 'published'
        AND deleted_at IS NULL
      ORDER BY COALESCE(published_at, created_at) DESC, id DESC
      LIMIT 3;
    `,
    [`${demoListingTitlePrefix}%`],
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
  if (demoMedia.assets.length < minimumDemoMediaAssets) {
    throw new Error(
      `[db:seed] Demo media assets insufficient (${demoMedia.assets.length}/${minimumDemoMediaAssets}). Add more images in "${demoMedia.sourceDirectory ?? 'embedded fallback'}".`,
    );
  }

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
    `[db:seed] Demo media source: ${demoMedia.sourceDirectory ?? 'embedded fallback'} (assets=${demoMedia.assets.length}, local=${demoMedia.localAssetCount}, fallback=${demoMedia.fallbackAssetCount}).`,
  );
  if (demoMedia.localAssetCount > 0 && demoMedia.fallbackAssetCount > 0) {
    console.log(
      `[db:seed] Demo media pool topped up with embedded fallback assets (${demoMedia.fallbackAssetCount}) to improve visual variety.`,
    );
  }
  if (demoMedia.assets.length < recommendedDemoMediaAssets) {
    console.warn(
      `[db:seed] Demo media assets are below recommended threshold (${demoMedia.assets.length}/${recommendedDemoMediaAssets}). Seed remains valid, but visual variety can be improved by adding more files.`,
    );
  }

  const client = new Client({
    connectionString: env.DATABASE_URL,
  });
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  const repository = new ListingsRepository(pool);
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
    const catBreedsStats = await upsertCatBreeds(client);
    const demoPlansStats = await upsertDemoPlans(client);
    const seedUsers = await upsertDemoUsers(repository);
    const demoAccountUsers = await upsertKeycloakDemoUsers(repository);
    const demoPromotionsActorUserId = seedUsers[0]?.ownerUserId;
    if (!demoPromotionsActorUserId) {
      throw new Error('No demo users available to seed promotions.');
    }

    const staleMediaRows = [
      ...(await listSeedStorageKeys(client, demoListingTitlePrefix)),
      ...(await listSeedStorageKeys(client, demoAccountListingTitlePrefix)),
    ];
    let cleanedObjects = 0;
    for (const staleMedia of staleMediaRows) {
      await storageService.deleteMediaObject(staleMedia.storageKey);
      cleanedObjects += 1;
    }

    const removedListings =
      (await purgeSeedListings(client, demoListingTitlePrefix)) +
      (await purgeSeedListings(client, demoAccountListingTitlePrefix));
    const locations = await resolveDemoLocations(client);
    const demoListings = buildDemoListings(locations, seedUsers);
    const demoSeedStats = await seedDemoListingsAndMedia(
      repository,
      storageService,
      demoListings,
      demoMedia.assets,
      0,
    );
    const demoAccountListings = buildDemoAccountPublishedListings(locations, demoAccountUsers);
    const demoAccountSeedStats =
      demoAccountListings.length > 0
        ? await seedDemoListingsAndMedia(
            repository,
            storageService,
            demoAccountListings,
            demoMedia.assets,
            demoListings.length,
          )
        : {
            listingsSeeded: 0,
            mediaSeeded: 0,
            statusCounts: {
              published: 0,
              pending_review: 0,
              rejected: 0,
              suspended: 0,
            },
            regionsCovered: 0,
            provincesCovered: 0,
            comuniCovered: 0,
          };
    const demoPromotionsStats = await seedDemoPromotions(
      client,
      demoPromotionsActorUserId,
      demoPlansStats.idsByCode,
    );

    console.log(`[db:seed] Demo users upserted: ${seedUsers.length}.`);
    console.log(`[db:seed] Demo account users linked: ${demoAccountUsers.length}.`);
    console.log(
      `[db:seed] Cat breeds upsert: inserted=${catBreedsStats.inserted}, updated=${catBreedsStats.updated}.`,
    );
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
      `[db:seed] Demo account listings seeded: ${demoAccountSeedStats.listingsSeeded}. Demo account media seeded: ${demoAccountSeedStats.mediaSeeded}.`,
    );
    console.log(
      `[db:seed] Demo status distribution: published=${demoSeedStats.statusCounts.published}, pending_review=${demoSeedStats.statusCounts.pending_review}, rejected=${demoSeedStats.statusCounts.rejected}, suspended=${demoSeedStats.statusCounts.suspended}.`,
    );
    console.log(
      `[db:seed] Demo account status distribution: published=${demoAccountSeedStats.statusCounts.published}, pending_review=${demoAccountSeedStats.statusCounts.pending_review}, rejected=${demoAccountSeedStats.statusCounts.rejected}, suspended=${demoAccountSeedStats.statusCounts.suspended}.`,
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
    await pool.end();
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[db:seed] ${error.message}`);
  process.exit(1);
});
