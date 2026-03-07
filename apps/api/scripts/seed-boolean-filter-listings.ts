import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Client, Pool } from 'pg';
import { UserRole } from '../src/auth/roles.enum';
import { parseListingAgeTextToMonths } from '../src/listings/listing-age';
import { ListingsRepository } from '../src/listings/listings.repository';
import { MinioStorageService } from '../src/listings/minio-storage.service';
import { SearchIndexService } from '../src/listings/search-index.service';

type LocationRow = {
  regionId: string;
  provinceId: string;
  comuneId: string;
};

type ExistingSeedMediaRow = {
  storageKey: string;
};

type ExistingSeedListingRow = {
  id: string;
};

const seedTitlePrefix = 'Verifica filtri booleani';
const cleanupTitlePrefixes = [seedTitlePrefix, '[demo filtri booleani]'];
const repositoryRoot = path.resolve(__dirname, '..', '..', '..');

const listingSeeds: Array<{
  title: string;
  description: string;
  listingType: string;
  sex: string;
  imageFileName: string;
  isSterilized: boolean | null;
  isVaccinated: boolean | null;
  hasMicrochip: boolean | null;
  compatibleWithChildren: boolean | null;
  compatibleWithOtherAnimals: boolean | null;
}> = [
  {
    title: `${seedTitlePrefix} | Sterilizzato SI`,
    description: 'Annuncio demo per verificare il filtro Sterilizzato=Si.',
    listingType: 'adozione',
    sex: 'maschio',
    imageFileName: 'da-eliminare/gattino-1.jpg',
    isSterilized: true,
    isVaccinated: null,
    hasMicrochip: null,
    compatibleWithChildren: null,
    compatibleWithOtherAnimals: null,
  },
  {
    title: `${seedTitlePrefix} | Vaccinato SI`,
    description: 'Annuncio demo per verificare il filtro Vaccinato=Si.',
    listingType: 'adozione',
    sex: 'femmina',
    imageFileName: 'da-eliminare/gattino-2.webp',
    isSterilized: null,
    isVaccinated: true,
    hasMicrochip: null,
    compatibleWithChildren: null,
    compatibleWithOtherAnimals: null,
  },
  {
    title: `${seedTitlePrefix} | Microchip SI`,
    description: 'Annuncio demo per verificare il filtro Microchip=Si.',
    listingType: 'stallo',
    sex: 'maschio',
    imageFileName: 'da-eliminare/gattino-3.png',
    isSterilized: null,
    isVaccinated: null,
    hasMicrochip: true,
    compatibleWithChildren: null,
    compatibleWithOtherAnimals: null,
  },
  {
    title: `${seedTitlePrefix} | Compatibile bambini SI`,
    description: 'Annuncio demo per verificare il filtro Compatibile bambini=Si.',
    listingType: 'adozione',
    sex: 'femmina',
    imageFileName: 'da-eliminare/gattino-4.png',
    isSterilized: null,
    isVaccinated: null,
    hasMicrochip: null,
    compatibleWithChildren: true,
    compatibleWithOtherAnimals: null,
  },
  {
    title: `${seedTitlePrefix} | Compatibile altri animali SI`,
    description: 'Annuncio demo per verificare il filtro Compatibile altri animali=Si.',
    listingType: 'stallo',
    sex: 'maschio',
    imageFileName: 'da-eliminare/gattino-5.jpeg',
    isSterilized: null,
    isVaccinated: null,
    hasMicrochip: null,
    compatibleWithChildren: null,
    compatibleWithOtherAnimals: true,
  },
];

const resolveMimeType = (fileName: string): string => {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  if (extension === '.png') {
    return 'image/png';
  }

  if (extension === '.webp') {
    return 'image/webp';
  }

  throw new Error(`Unsupported image extension for "${fileName}".`);
};

const resolveLocation = async (client: Client): Promise<LocationRow> => {
  const result = await client.query<LocationRow>(
    `
      SELECT
        r.id::text AS "regionId",
        p.id::text AS "provinceId",
        c.id::text AS "comuneId"
      FROM comuni c
      JOIN provinces p ON p.id = c.province_id
      JOIN regions r ON r.id = c.region_id
      ORDER BY c.id ASC
      LIMIT 1;
    `,
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('No geography rows found. Run `pnpm --filter @adottaungatto/api db:seed` first.');
  }

  return row;
};

const listExistingSeedMedia = async (client: Client): Promise<ExistingSeedMediaRow[]> => {
  const whereClause = cleanupTitlePrefixes
    .map((_, index) => `l.title LIKE $${index + 1}`)
    .join(' OR ');
  const result = await client.query<ExistingSeedMediaRow>(
    `
      SELECT lm.storage_key AS "storageKey"
      FROM listing_media lm
      JOIN listings l ON l.id = lm.listing_id
      WHERE ${whereClause}
    `,
    cleanupTitlePrefixes.map((prefix) => `${prefix}%`),
  );

  return result.rows;
};

const deleteExistingSeedListings = async (
  client: Client,
): Promise<{ deletedCount: number; deletedIds: string[] }> => {
  const whereClause = cleanupTitlePrefixes
    .map((_, index) => `title LIKE $${index + 1}`)
    .join(' OR ');
  const result = await client.query<ExistingSeedListingRow>(
    `
      DELETE FROM listings
      WHERE ${whereClause}
      RETURNING id::text AS "id";
    `,
    cleanupTitlePrefixes.map((prefix) => `${prefix}%`),
  );

  return {
    deletedCount: result.rowCount ?? 0,
    deletedIds: result.rows.map((row) => row.id),
  };
};

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();

  const env = loadApiEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = new Client({ connectionString: env.DATABASE_URL });
  const repository = new ListingsRepository(pool);
  const storageService = new MinioStorageService();
  const searchIndexService = new SearchIndexService(repository);

  let canSyncSearchIndex = true;
  const syncSearchIndexSafe = async (
    operation: () => Promise<void>,
    context: string,
  ): Promise<void> => {
    if (!canSyncSearchIndex) {
      return;
    }

    try {
      await operation();
    } catch (error) {
      canSyncSearchIndex = false;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[seed:boolean-filters] OpenSearch sync skipped after failure (${context}): ${message}`,
      );
    }
  };

  await client.connect();
  await storageService.ensureRequiredBuckets();

  try {
    const oldMedia = await listExistingSeedMedia(client);
    const deletedListings = await deleteExistingSeedListings(client);
    for (const media of oldMedia) {
      await storageService.deleteMediaObject(media.storageKey);
    }
    for (const deletedListingId of deletedListings.deletedIds) {
      await syncSearchIndexSafe(
        () => searchIndexService.removeListingById(deletedListingId),
        `remove listing ${deletedListingId}`,
      );
    }

    const location = await resolveLocation(client);
    const ownerUserId = await repository.upsertOwnerUser({
      id: 'demo-boolean-filters-owner',
      provider: 'dev-header',
      providerSubject: 'demo-boolean-filters-owner',
      email: 'demo.boolean.filters@example.test',
      roles: [UserRole.USER],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const created: Array<{ id: string; title: string; image: string }> = [];

    for (const listingSeed of listingSeeds) {
      const imagePath = path.resolve(repositoryRoot, listingSeed.imageFileName);
      const payload = await readFile(imagePath);
      const mimeType = resolveMimeType(listingSeed.imageFileName);

      const listing = await repository.createListing(ownerUserId, {
        title: listingSeed.title,
        description: listingSeed.description,
        listingType: listingSeed.listingType,
        priceAmount: null,
        currency: 'EUR',
        ageText: '2 anni',
        ageMonths: parseListingAgeTextToMonths('2 anni') ?? 24,
        sex: listingSeed.sex,
        breed: 'Europeo',
        isSterilized: listingSeed.isSterilized,
        isVaccinated: listingSeed.isVaccinated,
        hasMicrochip: listingSeed.hasMicrochip,
        compatibleWithChildren: listingSeed.compatibleWithChildren,
        compatibleWithOtherAnimals: listingSeed.compatibleWithOtherAnimals,
        status: 'published',
        regionId: location.regionId,
        provinceId: location.provinceId,
        comuneId: location.comuneId,
        contactName: 'Demo Filtri Booleani',
        contactPhone: '+393400000000',
        contactEmail: 'demo.boolean.filters@example.test',
        publishedAt: new Date().toISOString(),
      });

      const upload = await storageService.uploadListingMedia({
        listingId: listing.id,
        mimeType,
        payload,
        originalFileName: path.basename(listingSeed.imageFileName),
      });

      try {
        await repository.createListingMedia(listing.id, {
          storageKey: upload.storageKey,
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
          width: null,
          height: null,
          hash: null,
          position: 1,
          isPrimary: true,
        });
      } catch (error) {
        await storageService.deleteMediaObject(upload.storageKey);
        throw error;
      }

      created.push({
        id: listing.id,
        title: listing.title,
        image: listingSeed.imageFileName,
      });

      await syncSearchIndexSafe(
        () => searchIndexService.indexPublishedListingById(listing.id),
        `index listing ${listing.id}`,
      );
    }

    console.log(
      JSON.stringify(
        {
          deletedPreviousSeedListings: deletedListings.deletedCount,
          createdListings: created,
        },
        null,
        2,
      ),
    );
    console.log('[seed:boolean-filters] OK');
  } finally {
    await pool.end();
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[seed:boolean-filters] ${error.message}`);
  process.exit(1);
});
