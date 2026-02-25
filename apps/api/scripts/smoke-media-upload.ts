import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Client } from 'pg';
import { UserRole } from '../src/auth/roles.enum';
import { ListingsRepository } from '../src/listings/listings.repository';
import { MinioStorageService } from '../src/listings/minio-storage.service';

type LocationRow = {
  regionId: string;
  provinceId: string;
  comuneId: string;
};

const onePixelPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApMBgX4+7a8AAAAASUVORK5CYII=';

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
    throw new Error('No geography rows found. Run `pnpm db:seed` first.');
  }

  return row;
};

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();

  const env = loadApiEnv();
  const client = new Client({
    connectionString: env.DATABASE_URL,
  });
  const repository = new ListingsRepository();
  const storageService = new MinioStorageService();

  await client.connect();

  let listingId: string | null = null;
  let storageKey: string | null = null;

  try {
    const location = await resolveLocation(client);
    await storageService.ensureRequiredBuckets();

    const ownerUserId = await repository.upsertOwnerUser({
      id: 'listing-smoke-upload',
      provider: 'dev-header',
      providerSubject: 'listing-smoke-upload',
      email: 'listing-smoke-upload@example.test',
      roles: [UserRole.USER],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const listing = await repository.createListing(ownerUserId, {
      title: '[smoke] Media upload',
      description: 'Verifica upload MinIO + reference DB',
      listingType: 'adozione',
      priceAmount: null,
      currency: 'EUR',
      ageText: '2 anni',
      sex: 'maschio',
      breed: 'Europeo',
      status: 'pending_review',
      regionId: location.regionId,
      provinceId: location.provinceId,
      comuneId: location.comuneId,
      contactName: 'Tester Upload',
      contactPhone: '+3900000000',
      contactEmail: 'tester.upload@example.test',
    });
    listingId = listing.id;

    const payload = Buffer.from(onePixelPngBase64, 'base64');
    const upload = await storageService.uploadListingMedia({
      listingId: listing.id,
      mimeType: 'image/png',
      payload,
      originalFileName: 'smoke.png',
    });
    storageKey = upload.storageKey;

    const createdMedia = await repository.createListingMedia(listing.id, {
      storageKey: upload.storageKey,
      mimeType: upload.mimeType,
      fileSize: upload.fileSize,
      width: 1,
      height: 1,
      hash: null,
      position: 1,
      isPrimary: true,
    });

    const mediaRows = await repository.listMediaByListingId(listing.id);
    const objectExists = await storageService.objectExists(upload.storageKey);

    if (!objectExists) {
      throw new Error(`Uploaded media object not found in MinIO (${upload.storageKey}).`);
    }

    if (mediaRows.length !== 1) {
      throw new Error(`Expected 1 DB row in listing_media, found ${mediaRows.length}.`);
    }

    if (mediaRows[0]?.storageKey !== upload.storageKey) {
      throw new Error('DB listing_media storage key does not match uploaded object key.');
    }

    console.log(
      JSON.stringify(
        {
          listingId: listing.id,
          mediaId: createdMedia.id,
          storageKey: upload.storageKey,
          objectUrl: upload.objectUrl,
          dbRowsForListing: mediaRows.length,
          objectExists,
        },
        null,
        2,
      ),
    );
    console.log('[smoke:media-upload] OK');
  } finally {
    if (listingId) {
      await client.query('DELETE FROM listings WHERE id = $1::bigint', [listingId]);
    }

    if (storageKey) {
      await storageService.deleteMediaObject(storageKey);
    }

    await repository.onModuleDestroy();
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[smoke:media-upload] ${error.message}`);
  process.exit(1);
});
