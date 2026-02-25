import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Client } from 'pg';

type RegionSeedRow = {
  istatCode: string;
  name: string;
};

type ProvinceSeedRow = {
  istatCode: string;
  regionIstatCode: string;
  name: string;
  sigla: string;
};

type ComuneSeedRow = {
  istatCode: string;
  regionIstatCode: string;
  provinceIstatCode: string;
  name: string;
  codeCatastale: string | null;
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

const resolveSnapshotCandidates = (): string[] => {
  return [
    resolve(process.cwd(), 'data/geography/istat-current.json'),
    resolve(process.cwd(), 'apps/api/data/geography/istat-current.json'),
  ];
};

const isRegionSeedRow = (value: unknown): value is RegionSeedRow => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return typeof entry.istatCode === 'string' && typeof entry.name === 'string';
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
    typeof entry.sigla === 'string'
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
    (typeof entry.codeCatastale === 'string' || entry.codeCatastale === null)
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
        regions,
        provinces,
        comuni,
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
        INSERT INTO regions (istat_code, name)
        VALUES ($1, $2)
        ON CONFLICT (istat_code)
        DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = NOW()
        RETURNING id::text AS id, (xmax = 0) AS inserted;
      `,
      [region.istatCode, region.name],
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
        INSERT INTO provinces (region_id, istat_code, name, sigla)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (istat_code)
        DO UPDATE SET
          region_id = EXCLUDED.region_id,
          name = EXCLUDED.name,
          sigla = EXCLUDED.sigla,
          updated_at = NOW()
        RETURNING id::text AS id, (xmax = 0) AS inserted;
      `,
      [regionId, province.istatCode, province.name, province.sigla],
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
        INSERT INTO comuni (region_id, province_id, istat_code, name, code_catastale)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (istat_code)
        DO UPDATE SET
          region_id = EXCLUDED.region_id,
          province_id = EXCLUDED.province_id,
          name = EXCLUDED.name,
          code_catastale = EXCLUDED.code_catastale,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted;
      `,
      [regionId, provinceId, comune.istatCode, comune.name, comune.codeCatastale],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Failed to upsert comune ${comune.istatCode}.`);
    }

    addUpsertResult(counter, row.inserted);
  }

  return counter;
};

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();
  const env = loadApiEnv();

  const { snapshot, snapshotPath } = await loadGeographySnapshot();

  console.log(`[db:seed] Connected target: ${env.DATABASE_URL}`);
  console.log(`[db:seed] Snapshot path: ${snapshotPath}`);
  console.log(
    `[db:seed] Source: ${snapshot.source.dataset} (${snapshot.source.referenceDate ?? 'unknown date'})`,
  );
  console.log(`[db:seed] Sheet: ${snapshot.source.sheetName}`);
  console.log(
    `[db:seed] Dataset loaded: regions=${snapshot.regions.length}, provinces=${snapshot.provinces.length}, comuni=${snapshot.comuni.length}.`,
  );

  const client = new Client({
    connectionString: env.DATABASE_URL,
  });

  await client.connect();

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

    console.log(`[db:seed] Normalized stale sigla before upsert: ${normalizedSiglaCount} row(s).`);
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
  } finally {
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[db:seed] ${error.message}`);
  process.exit(1);
});
