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

  await client.connect();

  try {
    const location = await resolveLocation(client);
    const user = {
      id: 'listing-smoke-repo',
      provider: 'dev-header' as const,
      providerSubject: 'listing-smoke-repo',
      email: 'listing-smoke-repo@example.test',
      roles: [UserRole.USER],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ownerUserId = await repository.upsertOwnerUser(user);
    const created = await repository.createListing(ownerUserId, {
      title: '[smoke] CRUD repository',
      description: 'Verifica repository listings M2.1',
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
      contactName: 'Tester',
      contactPhone: '+3900000000',
      contactEmail: 'tester@example.test',
    });
    const listedBefore = await repository.listMine(ownerUserId);
    const updated = await repository.updateMine(ownerUserId, created.id, {
      title: '[smoke] CRUD repository aggiornato',
      status: 'published',
    });
    const archived = await repository.softDeleteMine(ownerUserId, created.id);
    const listedAfter = await repository.listMine(ownerUserId);

    console.log(
      JSON.stringify(
        {
          createdId: created.id,
          createdStatus: created.status,
          listedBeforeCount: listedBefore.length,
          updatedStatus: updated?.status ?? null,
          updatedTitle: updated?.title ?? null,
          archivedStatus: archived?.status ?? null,
          archivedDeletedAt: archived?.deletedAt ?? null,
          listedAfterCount: listedAfter.length,
        },
        null,
        2,
      ),
    );
    console.log('[smoke:listings] OK');
  } finally {
    await repository.onModuleDestroy();
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[smoke:listings] ${error.message}`);
  process.exit(1);
});
