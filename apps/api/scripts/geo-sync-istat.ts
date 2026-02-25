import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import AdmZip from 'adm-zip';
import proj4 from 'proj4';
import * as shapefile from 'shapefile';
import * as XLSX from 'xlsx';

type GeoPoint = {
  lat: number;
  lng: number;
};

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

type GeographySnapshot = {
  source: {
    dataset: 'istat-elenco-comuni';
    url: string;
    sheetName: string;
    referenceDate: string | null;
    syncedAt: string;
  };
  centroids: {
    source: {
      dataset: 'istat-confini-generalizzati';
      url: string;
      boundaryYear: number;
      syncedAt: string;
    };
    coverage: {
      regions: number;
      provinces: number;
      comuni: number;
      comuniExactMatches: number;
      comuniLegacyMatches: number;
      comuniMissing: number;
    };
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

type GeometryLike = {
  type: string;
  coordinates: unknown;
};

type ZipEntryPaths = {
  shp: string;
  dbf: string;
  shx: string;
};

const ISTAT_COMUNI_XLSX_URL =
  'https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx';
const ISTAT_BOUNDARIES_BASE_URL =
  'https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati';
const MIN_BOUNDARY_YEAR = 2020;
const BOUNDARY_FALLBACK_YEARS = 4;
const UTM32N_WGS84_PROJ4 = '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs';

const normalizeText = (value: string): string => {
  return value
    .normalize('NFC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeHeader = (header: string): string => {
  return normalizeText(header).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
};

const normalizeCode = (value: unknown, length: number, fieldName: string): string => {
  const text = normalizeText(String(value ?? ''));
  if (!/^\d+$/.test(text)) {
    throw new Error(`Invalid ${fieldName}: "${text}".`);
  }

  const padded = text.padStart(length, '0');
  if (padded.length !== length) {
    throw new Error(`Invalid ${fieldName}: expected ${length} digits, got "${padded}".`);
  }

  return padded;
};

const normalizeCoordinate = (value: number): number => {
  return Number(value.toFixed(6));
};

const parseLegacyCode = (value: unknown, length: number): string | null => {
  const text = normalizeText(String(value ?? ''));
  if (text.length === 0) {
    return null;
  }

  if (!/^\d+$/.test(text)) {
    throw new Error(`Invalid legacy code value "${text}".`);
  }

  const padded = text.padStart(length, '0');
  if (padded.length !== length) {
    throw new Error(`Invalid legacy code value "${text}".`);
  }

  return padded;
};

const findColumnKey = (keys: string[], patterns: string[], label: string): string => {
  const normalizedPatterns = patterns.map((pattern) => normalizeHeader(pattern));
  const entry = keys.find((key) => {
    const normalizedKey = normalizeHeader(key);
    return normalizedPatterns.some((pattern) => normalizedKey.includes(pattern));
  });

  if (!entry) {
    throw new Error(`Unable to locate ISTAT column for ${label}.`);
  }

  return entry;
};

const parseReferenceDate = (sheetName: string): string | null => {
  const match = sheetName.match(/(\d{2})_(\d{2})_(\d{4})/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

const resolveReferenceYear = (referenceDate: string | null): number => {
  if (!referenceDate) {
    return new Date().getUTCFullYear();
  }

  const match = referenceDate.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (!match) {
    return new Date().getUTCFullYear();
  }

  return Number.parseInt(match[1], 10);
};

const resolveSnapshotOutputPath = (): string => {
  const appRelative = resolve(process.cwd(), 'data/geography/istat-current.json');
  if (existsSync(resolve(process.cwd(), 'scripts'))) {
    return appRelative;
  }

  return resolve(process.cwd(), 'apps/api/data/geography/istat-current.json');
};

const buildBoundariesZipUrl = (year: number): string => {
  const yy = String(year).slice(2);
  return `${ISTAT_BOUNDARIES_BASE_URL}/${year}/Limiti010120${yy}_g.zip`;
};

const downloadBoundariesZip = async (
  referenceYear: number,
): Promise<{
  year: number;
  url: string;
  buffer: Buffer;
}> => {
  const minYear = Math.max(referenceYear - BOUNDARY_FALLBACK_YEARS, MIN_BOUNDARY_YEAR);

  for (let year = referenceYear; year >= minYear; year -= 1) {
    const url = buildBoundariesZipUrl(year);
    console.log(`[geo:sync] Downloading ISTAT boundaries from ${url}...`);
    const response = await fetch(url);
    if (response.ok) {
      return {
        year,
        url,
        buffer: Buffer.from(await response.arrayBuffer()),
      };
    }

    if (response.status === 404) {
      console.log(`[geo:sync] Boundaries ${year} unavailable (404), trying previous year...`);
      continue;
    }

    throw new Error(
      `[geo:sync] Boundaries download failed for ${year} with status ${response.status}.`,
    );
  }

  throw new Error(
    `[geo:sync] No ISTAT boundaries zip found between ${referenceYear} and ${minYear}.`,
  );
};

const resolveComuniShapefileEntries = (zip: AdmZip, boundaryYear: number): ZipEntryPaths => {
  const yy = String(boundaryYear).slice(2);
  const suffixes = {
    shp: `Com010120${yy}_g_WGS84.shp`,
    dbf: `Com010120${yy}_g_WGS84.dbf`,
    shx: `Com010120${yy}_g_WGS84.shx`,
  };

  const entries = zip.getEntries();
  const resolveSuffix = (suffix: string, label: string): string => {
    const match = entries.find((entry: { entryName: string }) => entry.entryName.endsWith(suffix));
    if (!match) {
      throw new Error(`[geo:sync] Missing ${label} in boundaries zip for year ${boundaryYear}.`);
    }

    return match.entryName;
  };

  return {
    shp: resolveSuffix(suffixes.shp, 'comuni shp'),
    dbf: resolveSuffix(suffixes.dbf, 'comuni dbf'),
    shx: resolveSuffix(suffixes.shx, 'comuni shx'),
  };
};

const writeShapefileEntriesToTempDir = async (
  zip: AdmZip,
  entryPaths: ZipEntryPaths,
): Promise<{
  tempDir: string;
  shpPath: string;
  dbfPath: string;
}> => {
  const tempDir = await mkdtemp(join(tmpdir(), 'adottaungatto-geo-boundaries-'));

  const writeEntry = async (entryPath: string): Promise<string> => {
    const entry = zip.getEntry(entryPath);
    if (!entry) {
      throw new Error(`[geo:sync] Zip entry not found: ${entryPath}.`);
    }

    const filePath = join(tempDir, basename(entryPath));
    const data = entry.getData();
    await writeFile(filePath, data);
    return filePath;
  };

  const shpPath = await writeEntry(entryPaths.shp);
  const dbfPath = await writeEntry(entryPaths.dbf);
  await writeEntry(entryPaths.shx);

  return {
    tempDir,
    shpPath,
    dbfPath,
  };
};

const computeRingAreaAndCentroid = (
  ring: number[][],
): {
  area: number;
  centroidLng: number;
  centroidLat: number;
} | null => {
  if (ring.length < 4) {
    return null;
  }

  let twiceArea = 0;
  let centroidLngAccumulator = 0;
  let centroidLatAccumulator = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    if (!current || !next) {
      continue;
    }

    const currentLng = current[0];
    const currentLat = current[1];
    const nextLng = next[0];
    const nextLat = next[1];

    if (
      typeof currentLng !== 'number' ||
      typeof currentLat !== 'number' ||
      typeof nextLng !== 'number' ||
      typeof nextLat !== 'number'
    ) {
      continue;
    }

    const cross = currentLng * nextLat - nextLng * currentLat;
    twiceArea += cross;
    centroidLngAccumulator += (currentLng + nextLng) * cross;
    centroidLatAccumulator += (currentLat + nextLat) * cross;
  }

  const area = twiceArea / 2;
  if (Math.abs(area) < 1e-12) {
    return null;
  }

  return {
    area,
    centroidLng: centroidLngAccumulator / (6 * area),
    centroidLat: centroidLatAccumulator / (6 * area),
  };
};

const isPolygonGeometry = (
  geometry: GeometryLike,
): geometry is GeometryLike & {
  type: 'Polygon';
  coordinates: number[][][];
} => {
  return geometry.type === 'Polygon' && Array.isArray(geometry.coordinates);
};

const isMultiPolygonGeometry = (
  geometry: GeometryLike,
): geometry is GeometryLike & {
  type: 'MultiPolygon';
  coordinates: number[][][][];
} => {
  return geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates);
};

const computeGeometryCentroid = (geometry: GeometryLike | null): GeoPoint | null => {
  if (!geometry) {
    return null;
  }

  const polygons: number[][][][] = isPolygonGeometry(geometry)
    ? [geometry.coordinates]
    : isMultiPolygonGeometry(geometry)
      ? geometry.coordinates
      : [];

  if (polygons.length === 0) {
    return null;
  }

  let areaSum = 0;
  let weightedLng = 0;
  let weightedLat = 0;

  for (const polygon of polygons) {
    const outerRing = polygon[0];
    if (!outerRing) {
      continue;
    }

    const areaAndCentroid = computeRingAreaAndCentroid(outerRing);
    if (!areaAndCentroid) {
      continue;
    }

    const weight = Math.abs(areaAndCentroid.area);
    areaSum += weight;
    weightedLng += areaAndCentroid.centroidLng * weight;
    weightedLat += areaAndCentroid.centroidLat * weight;
  }

  if (areaSum <= 0) {
    return null;
  }

  const projectedLng = weightedLng / areaSum;
  const projectedLat = weightedLat / areaSum;
  const [lng, lat] = proj4(UTM32N_WGS84_PROJ4, 'WGS84', [projectedLng, projectedLat]);
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return {
    lat: normalizeCoordinate(lat),
    lng: normalizeCoordinate(lng),
  };
};

const loadBoundaryComuniCentroids = async (
  zipBuffer: Buffer,
  boundaryYear: number,
): Promise<Map<string, GeoPoint>> => {
  const zip = new AdmZip(zipBuffer);
  const entryPaths = resolveComuniShapefileEntries(zip, boundaryYear);
  const { tempDir, shpPath, dbfPath } = await writeShapefileEntriesToTempDir(zip, entryPaths);
  const centroids = new Map<string, GeoPoint>();

  try {
    const source = await shapefile.open(shpPath, dbfPath);

    while (true) {
      const row = await source.read();
      if (row.done) {
        break;
      }

      const feature = row.value as {
        properties?: Record<string, unknown>;
        geometry?: GeometryLike | null;
      };
      const properties = feature.properties ?? {};
      const legacyCode = normalizeCode(properties.PRO_COM_T, 6, 'boundary comune code');
      const centroid = computeGeometryCentroid(feature.geometry ?? null);
      if (!centroid) {
        continue;
      }

      centroids.set(legacyCode, centroid);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  return centroids;
};

const updateAccumulator = (
  map: Map<string, { latSum: number; lngSum: number; count: number }>,
  key: string,
  centroid: GeoPoint,
): void => {
  const current = map.get(key) ?? { latSum: 0, lngSum: 0, count: 0 };
  current.latSum += centroid.lat;
  current.lngSum += centroid.lng;
  current.count += 1;
  map.set(key, current);
};

const getAverageFromAccumulator = (
  map: Map<string, { latSum: number; lngSum: number; count: number }>,
  key: string,
): GeoPoint | null => {
  const value = map.get(key);
  if (!value || value.count === 0) {
    return null;
  }

  return {
    lat: normalizeCoordinate(value.latSum / value.count),
    lng: normalizeCoordinate(value.lngSum / value.count),
  };
};

const enrichCentroids = (
  regions: RegionSeedRow[],
  provinces: ProvinceSeedRow[],
  comuni: ComuneSeedRow[],
  comuniBoundariesCentroids: Map<string, GeoPoint>,
): {
  coverage: GeographySnapshot['centroids']['coverage'];
} => {
  const provinceAccumulator = new Map<string, { latSum: number; lngSum: number; count: number }>();
  const regionAccumulator = new Map<string, { latSum: number; lngSum: number; count: number }>();

  let comuniExactMatches = 0;
  let comuniLegacyMatches = 0;

  for (const comune of comuni) {
    const direct = comuniBoundariesCentroids.get(comune.istatCode);
    const legacy =
      !direct && comune.legacyIstatCode107
        ? comuniBoundariesCentroids.get(comune.legacyIstatCode107)
        : undefined;
    const centroid = direct ?? legacy ?? null;

    if (!centroid) {
      comune.centroidLat = null;
      comune.centroidLng = null;
      continue;
    }

    if (direct) {
      comuniExactMatches += 1;
    } else {
      comuniLegacyMatches += 1;
    }

    comune.centroidLat = centroid.lat;
    comune.centroidLng = centroid.lng;
    updateAccumulator(provinceAccumulator, comune.provinceIstatCode, centroid);
    updateAccumulator(regionAccumulator, comune.regionIstatCode, centroid);
  }

  for (const province of provinces) {
    const centroid = getAverageFromAccumulator(provinceAccumulator, province.istatCode);
    province.centroidLat = centroid?.lat ?? null;
    province.centroidLng = centroid?.lng ?? null;
  }

  for (const region of regions) {
    const centroid = getAverageFromAccumulator(regionAccumulator, region.istatCode);
    region.centroidLat = centroid?.lat ?? null;
    region.centroidLng = centroid?.lng ?? null;
  }

  return {
    coverage: {
      regions: regions.filter(
        (region) => region.centroidLat !== null && region.centroidLng !== null,
      ).length,
      provinces: provinces.filter(
        (province) => province.centroidLat !== null && province.centroidLng !== null,
      ).length,
      comuni: comuni.filter((comune) => comune.centroidLat !== null && comune.centroidLng !== null)
        .length,
      comuniExactMatches,
      comuniLegacyMatches,
      comuniMissing: comuni.length - (comuniExactMatches + comuniLegacyMatches),
    },
  };
};

const run = async () => {
  console.log(`[geo:sync] Downloading ISTAT workbook from ${ISTAT_COMUNI_XLSX_URL}...`);
  const response = await fetch(ISTAT_COMUNI_XLSX_URL);
  if (!response.ok) {
    throw new Error(`[geo:sync] Download failed with status ${response.status}.`);
  }

  const workbookBuffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('[geo:sync] Workbook is missing sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`[geo:sync] Sheet "${sheetName}" not found.`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: '',
  });
  if (rows.length === 0) {
    throw new Error('[geo:sync] Workbook sheet has no rows.');
  }

  const keys = Object.keys(rows[0] ?? {});
  const regionCodeKey = findColumnKey(keys, ['Codice Regione'], 'region code');
  const regionNameKey = findColumnKey(keys, ['Denominazione Regione'], 'region name');
  const provinceCodeKey = findColumnKey(
    keys,
    ["Codice dell'Unita territoriale sovracomunale"],
    'province code',
  );
  const provinceNameKey = findColumnKey(
    keys,
    ["Denominazione dell'Unita territoriale sovracomunale"],
    'province name',
  );
  const provinceSiglaKey = findColumnKey(keys, ['Sigla automobilistica'], 'province sigla');
  const comuneCodeKey = findColumnKey(keys, ['Codice Comune formato numerico'], 'comune code');
  const comuneLegacyCode107Key = findColumnKey(
    keys,
    ['Codice Comune numerico con 107 Province (dal 2017 al 2025)'],
    'comune legacy 107 code',
  );
  const comuneNameKey = findColumnKey(keys, ['Denominazione in italiano'], 'comune name');
  const comuneCodeCatastaleKey = findColumnKey(keys, ['Codice Catastale del Comune'], 'catasto');

  const regionByCode = new Map<string, RegionSeedRow>();
  const provinceByCode = new Map<string, ProvinceSeedRow>();
  const comuneByCode = new Map<string, ComuneSeedRow>();

  for (const row of rows) {
    const rawComuneCode = normalizeText(String(row[comuneCodeKey] ?? ''));
    if (!/^\d+$/.test(rawComuneCode)) {
      continue;
    }

    const regionCode = normalizeCode(row[regionCodeKey], 2, 'region code');
    const provinceCode = normalizeCode(row[provinceCodeKey], 3, 'province code');
    const comuneCode = normalizeCode(row[comuneCodeKey], 6, 'comune code');
    const comuneLegacyCode107 = parseLegacyCode(row[comuneLegacyCode107Key], 6);
    const regionName = normalizeText(String(row[regionNameKey] ?? ''));
    const provinceName = normalizeText(String(row[provinceNameKey] ?? ''));
    const comuneName = normalizeText(String(row[comuneNameKey] ?? ''));
    const provinceSigla = normalizeText(String(row[provinceSiglaKey] ?? '')).toUpperCase();
    const codeCatastaleRaw = normalizeText(String(row[comuneCodeCatastaleKey] ?? ''));
    const codeCatastale = codeCatastaleRaw.length > 0 ? codeCatastaleRaw : null;

    if (!/^[A-Z]{2}$/.test(provinceSigla)) {
      throw new Error(
        `Invalid province sigla "${provinceSigla}" for province ${provinceCode} (${provinceName}).`,
      );
    }

    const existingRegion = regionByCode.get(regionCode);
    if (!existingRegion) {
      regionByCode.set(regionCode, {
        istatCode: regionCode,
        name: regionName,
        centroidLat: null,
        centroidLng: null,
      });
    } else if (existingRegion.name !== regionName) {
      throw new Error(
        `Region consistency error for ${regionCode}: "${existingRegion.name}" != "${regionName}".`,
      );
    }

    const existingProvince = provinceByCode.get(provinceCode);
    if (!existingProvince) {
      provinceByCode.set(provinceCode, {
        istatCode: provinceCode,
        regionIstatCode: regionCode,
        name: provinceName,
        sigla: provinceSigla,
        centroidLat: null,
        centroidLng: null,
      });
    } else {
      if (existingProvince.regionIstatCode !== regionCode) {
        throw new Error(
          `Province consistency error for ${provinceCode}: region mismatch (${existingProvince.regionIstatCode} vs ${regionCode}).`,
        );
      }

      if (existingProvince.name !== provinceName) {
        throw new Error(
          `Province consistency error for ${provinceCode}: "${existingProvince.name}" != "${provinceName}".`,
        );
      }

      if (existingProvince.sigla !== provinceSigla) {
        throw new Error(
          `Province consistency error for ${provinceCode}: sigla mismatch (${existingProvince.sigla} vs ${provinceSigla}).`,
        );
      }
    }

    if (comuneByCode.has(comuneCode)) {
      throw new Error(`Duplicate comune code in ISTAT source: ${comuneCode}.`);
    }

    comuneByCode.set(comuneCode, {
      istatCode: comuneCode,
      regionIstatCode: regionCode,
      provinceIstatCode: provinceCode,
      name: comuneName,
      codeCatastale,
      legacyIstatCode107: comuneLegacyCode107,
      centroidLat: null,
      centroidLng: null,
    });
  }

  const regions = [...regionByCode.values()].sort((a, b) => a.istatCode.localeCompare(b.istatCode));
  const provinces = [...provinceByCode.values()].sort((a, b) =>
    a.istatCode.localeCompare(b.istatCode),
  );
  const comuni = [...comuneByCode.values()].sort((a, b) => a.istatCode.localeCompare(b.istatCode));
  const referenceDate = parseReferenceDate(sheetName);
  const boundaries = await downloadBoundariesZip(resolveReferenceYear(referenceDate));
  const comuniBoundariesCentroids = await loadBoundaryComuniCentroids(
    boundaries.buffer,
    boundaries.year,
  );
  const centroidEnrichment = enrichCentroids(regions, provinces, comuni, comuniBoundariesCentroids);

  const snapshot: GeographySnapshot = {
    source: {
      dataset: 'istat-elenco-comuni',
      url: ISTAT_COMUNI_XLSX_URL,
      sheetName,
      referenceDate,
      syncedAt: new Date().toISOString(),
    },
    centroids: {
      source: {
        dataset: 'istat-confini-generalizzati',
        url: boundaries.url,
        boundaryYear: boundaries.year,
        syncedAt: new Date().toISOString(),
      },
      coverage: centroidEnrichment.coverage,
    },
    stats: {
      regions: regions.length,
      provinces: provinces.length,
      comuni: comuni.length,
    },
    regions,
    provinces,
    comuni,
  };

  const outputPath = resolveSnapshotOutputPath();
  await mkdir(resolve(outputPath, '..'), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log(`[geo:sync] Snapshot written to ${outputPath}`);
  console.log(
    `[geo:sync] Stats: regions=${snapshot.stats.regions}, provinces=${snapshot.stats.provinces}, comuni=${snapshot.stats.comuni}`,
  );
  console.log(
    `[geo:sync] Centroid coverage: regions=${snapshot.centroids.coverage.regions}, provinces=${snapshot.centroids.coverage.provinces}, comuni=${snapshot.centroids.coverage.comuni}, exact=${snapshot.centroids.coverage.comuniExactMatches}, legacy=${snapshot.centroids.coverage.comuniLegacyMatches}, missing=${snapshot.centroids.coverage.comuniMissing}`,
  );
  if (snapshot.source.referenceDate) {
    console.log(`[geo:sync] ISTAT reference date: ${snapshot.source.referenceDate}`);
  }
  console.log(
    `[geo:sync] Boundaries source year: ${snapshot.centroids.source.boundaryYear} (${snapshot.centroids.source.url})`,
  );
};

run().catch((error: Error) => {
  console.error(`[geo:sync] ${error.message}`);
  process.exit(1);
});
