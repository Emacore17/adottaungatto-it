import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

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

type GeographySnapshot = {
  source: {
    dataset: 'istat-elenco-comuni';
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

const ISTAT_COMUNI_XLSX_URL =
  'https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx';

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

const resolveSnapshotOutputPath = (): string => {
  const appRelative = resolve(process.cwd(), 'data/geography/istat-current.json');
  if (existsSync(resolve(process.cwd(), 'scripts'))) {
    return appRelative;
  }

  return resolve(process.cwd(), 'apps/api/data/geography/istat-current.json');
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
    ["Codice dell'Unità territoriale sovracomunale"],
    'province code',
  );
  const provinceNameKey = findColumnKey(
    keys,
    ["Denominazione dell'Unità territoriale sovracomunale"],
    'province name',
  );
  const provinceSiglaKey = findColumnKey(keys, ['Sigla automobilistica'], 'province sigla');
  const comuneCodeKey = findColumnKey(keys, ['Codice Comune formato numerico'], 'comune code');
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
    });
  }

  const regions = [...regionByCode.values()].sort((a, b) => a.istatCode.localeCompare(b.istatCode));
  const provinces = [...provinceByCode.values()].sort((a, b) =>
    a.istatCode.localeCompare(b.istatCode),
  );
  const comuni = [...comuneByCode.values()].sort((a, b) => a.istatCode.localeCompare(b.istatCode));

  const snapshot: GeographySnapshot = {
    source: {
      dataset: 'istat-elenco-comuni',
      url: ISTAT_COMUNI_XLSX_URL,
      sheetName,
      referenceDate: parseReferenceDate(sheetName),
      syncedAt: new Date().toISOString(),
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
  if (snapshot.source.referenceDate) {
    console.log(`[geo:sync] ISTAT reference date: ${snapshot.source.referenceDate}`);
  }
};

run().catch((error: Error) => {
  console.error(`[geo:sync] ${error.message}`);
  process.exit(1);
});
