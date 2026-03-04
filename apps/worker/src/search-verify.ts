import { loadWorkerEnv } from '@adottaungatto/config';
import { SEARCH_INDEX_READ_ALIAS, SEARCH_INDEX_WRITE_ALIAS } from '@adottaungatto/types';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';
import { createSearchIndexAdminClient } from './search-index-admin';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const env = loadWorkerEnv();
const adminClient = createSearchIndexAdminClient(env.OPENSEARCH_URL);

type ListingIdRow = {
  id: string;
};

const listPublishedListingIds = async (pool: Pool): Promise<string[]> => {
  const result = await pool.query<ListingIdRow>(
    `
      SELECT l.id::text AS "id"
      FROM listings l
      WHERE l.status = 'published'
        AND l.deleted_at IS NULL
      ORDER BY l.id ASC;
    `,
  );

  return result.rows.map((row) => row.id);
};

const run = async () => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  try {
    const readTargets = await adminClient.listAliasTargets(SEARCH_INDEX_READ_ALIAS);
    const writeTargets = await adminClient.listAliasTargets(SEARCH_INDEX_WRITE_ALIAS);
    adminClient.assertAliasTargetsAreConsistent(readTargets, writeTargets);

    const activeIndexName = readTargets[0] ?? writeTargets[0];
    if (!activeIndexName) {
      throw new Error('Search aliases are not initialized.');
    }

    const [databaseListingIds, indexedListingIds, indexedCount] = await Promise.all([
      listPublishedListingIds(pool),
      adminClient.listDocumentIds(SEARCH_INDEX_READ_ALIAS, 500),
      adminClient.countDocuments(SEARCH_INDEX_READ_ALIAS),
    ]);

    const databaseIdSet = new Set(databaseListingIds);
    const indexedIdSet = new Set(indexedListingIds);

    const missingInIndex = databaseListingIds.filter((listingId) => !indexedIdSet.has(listingId));
    const extraInIndex = indexedListingIds.filter((listingId) => !databaseIdSet.has(listingId));

    console.log(
      `[search:verify] activeIndex=${activeIndexName} db=${databaseListingIds.length} index=${indexedCount} indexed_ids=${indexedListingIds.length} missing=${missingInIndex.length} extra=${extraInIndex.length}`,
    );

    if (
      indexedCount !== databaseListingIds.length ||
      missingInIndex.length > 0 ||
      extraInIndex.length > 0
    ) {
      throw new Error(
        `Search drift detected. missing=[${missingInIndex.slice(0, 10).join(', ')}] extra=[${extraInIndex
          .slice(0, 10)
          .join(', ')}]`,
      );
    }
  } finally {
    await pool.end();
  }
};

run().catch((error: Error) => {
  console.error(`[search:verify] ${error.message}`);
  process.exit(1);
});
