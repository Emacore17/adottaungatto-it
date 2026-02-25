import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Client } from 'pg';
import { UserRole } from '../src/auth/roles.enum';
import { ListingsRepository } from '../src/listings/listings.repository';

type LocationRow = {
  regionId: string;
  provinceId: string;
  comuneId: string;
};

type ListingMediaRow = {
  id: string;
  storageKey: string;
  position: number;
  isPrimary: boolean;
};

type CountRow = {
  count: string;
};

type PgError = Error & {
  code?: string;
};

const UNIQUE_VIOLATION = '23505';

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

const expectUniqueViolation = async (operation: () => Promise<unknown>): Promise<boolean> => {
  try {
    await operation();
    return false;
  } catch (error) {
    return (error as PgError).code === UNIQUE_VIOLATION;
  }
};

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();

  const env = loadApiEnv();
  const client = new Client({
    connectionString: env.DATABASE_URL,
  });
  const repository = new ListingsRepository();

  await client.connect();

  let listingId: string | null = null;

  try {
    const location = await resolveLocation(client);
    const nowSuffix = Date.now().toString();
    const ownerUserId = await repository.upsertOwnerUser({
      id: 'listing-smoke-media',
      provider: 'dev-header',
      providerSubject: 'listing-smoke-media',
      email: 'listing-smoke-media@example.test',
      roles: [UserRole.USER],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const listing = await repository.createListing(ownerUserId, {
      title: '[smoke] Listing media schema',
      description: 'Verifica schema listing_media M2.2',
      listingType: 'adozione',
      priceAmount: null,
      currency: 'EUR',
      ageText: '2 anni',
      sex: 'femmina',
      breed: 'Europeo',
      status: 'pending_review',
      regionId: location.regionId,
      provinceId: location.provinceId,
      comuneId: location.comuneId,
      contactName: 'Tester Media',
      contactPhone: '+3900000000',
      contactEmail: 'tester.media@example.test',
    });

    listingId = listing.id;

    await client.query(
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
        VALUES
          ($1::bigint, $2, 'image/jpeg', 128000, 1200, 800, NULL, 1, TRUE),
          ($1::bigint, $3, 'image/jpeg', 256000, 1600, 900, NULL, 2, FALSE),
          ($1::bigint, $4, 'image/png', 64000, 900, 900, NULL, 3, FALSE);
      `,
      [
        listing.id,
        `listings/${listing.id}/${nowSuffix}-1.jpg`,
        `listings/${listing.id}/${nowSuffix}-2.jpg`,
        `listings/${listing.id}/${nowSuffix}-3.png`,
      ],
    );

    const orderedRows = await client.query<ListingMediaRow>(
      `
        SELECT
          id::text AS "id",
          storage_key AS "storageKey",
          position,
          is_primary AS "isPrimary"
        FROM listing_media
        WHERE listing_id = $1::bigint
        ORDER BY position ASC;
      `,
      [listing.id],
    );

    const positions = orderedRows.rows.map((row) => row.position);
    const isOrdered = positions.join(',') === '1,2,3';
    if (!isOrdered) {
      throw new Error(`Unexpected listing_media order: ${positions.join(',')}`);
    }

    const duplicatePositionRejected = await expectUniqueViolation(async () => {
      await client.query(
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
          VALUES ($1::bigint, $2, 'image/jpeg', 1200, 100, 100, NULL, 2, FALSE);
        `,
        [listing.id, `listings/${listing.id}/${nowSuffix}-duplicate-position.jpg`],
      );
    });

    if (!duplicatePositionRejected) {
      throw new Error('Expected unique violation for duplicate media position was not raised.');
    }

    const secondPrimaryRejected = await expectUniqueViolation(async () => {
      await client.query(
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
          VALUES ($1::bigint, $2, 'image/jpeg', 1300, 100, 100, NULL, 4, TRUE);
        `,
        [listing.id, `listings/${listing.id}/${nowSuffix}-duplicate-primary.jpg`],
      );
    });

    if (!secondPrimaryRejected) {
      throw new Error('Expected unique violation for duplicate primary media was not raised.');
    }

    await client.query('DELETE FROM listings WHERE id = $1::bigint', [listing.id]);

    const mediaCountAfterDelete = await client.query<CountRow>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM listing_media
        WHERE listing_id = $1::bigint;
      `,
      [listing.id],
    );

    const remainingMedia = Number.parseInt(mediaCountAfterDelete.rows[0]?.count ?? '0', 10);
    if (remainingMedia !== 0) {
      throw new Error(
        `Expected ON DELETE CASCADE on listing_media, found ${remainingMedia} row(s).`,
      );
    }

    listingId = null;

    console.log(
      JSON.stringify(
        {
          mediaRowsInserted: orderedRows.rows.length,
          orderedPositions: positions,
          duplicatePositionRejected,
          secondPrimaryRejected,
          cascadeDeleteRemainingRows: remainingMedia,
        },
        null,
        2,
      ),
    );
    console.log('[smoke:listings-media] OK');
  } finally {
    if (listingId) {
      await client.query('DELETE FROM listings WHERE id = $1::bigint', [listingId]);
    }

    await repository.onModuleDestroy();
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[smoke:listings-media] ${error.message}`);
  process.exit(1);
});
