import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Client } from 'pg';

type ListingSummaryRow = {
  listingsTotal: string;
  mediaTotal: string;
  regionsTotal: string;
  provincesTotal: string;
  comuniTotal: string;
};

type StatusCountRow = {
  status: string;
  count: string;
};

const demoSeedProviderSubjects = [
  'seed-m2-owner-private',
  'seed-m2-owner-gattile',
  'seed-m2-owner-associazione',
] as const;

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();

  const env = loadApiEnv();
  const client = new Client({
    connectionString: env.DATABASE_URL,
  });

  await client.connect();

  try {
    const summaryResult = await client.query<ListingSummaryRow>(
      `
        SELECT
          COUNT(DISTINCT l.id)::text AS "listingsTotal",
          COUNT(lm.id)::text AS "mediaTotal",
          COUNT(DISTINCT l.region_id)::text AS "regionsTotal",
          COUNT(DISTINCT l.province_id)::text AS "provincesTotal",
          COUNT(DISTINCT l.comune_id)::text AS "comuniTotal"
        FROM listings l
        INNER JOIN app_users u
          ON u.id = l.owner_user_id
        LEFT JOIN listing_media lm
          ON lm.listing_id = l.id
        WHERE u.provider = 'dev-header'
          AND u.provider_subject = ANY($1::text[])
          AND l.deleted_at IS NULL;
      `,
      [demoSeedProviderSubjects],
    );

    const statusResult = await client.query<StatusCountRow>(
      `
        SELECT l.status::text AS "status", COUNT(*)::text AS "count"
        FROM listings l
        INNER JOIN app_users u
          ON u.id = l.owner_user_id
        WHERE u.provider = 'dev-header'
          AND u.provider_subject = ANY($1::text[])
          AND l.deleted_at IS NULL
        GROUP BY l.status
        ORDER BY l.status ASC;
      `,
      [demoSeedProviderSubjects],
    );

    const summary = summaryResult.rows[0];
    if (!summary) {
      throw new Error('No summary row returned for demo listings.');
    }

    const listingsTotal = Number.parseInt(summary.listingsTotal, 10);
    const mediaTotal = Number.parseInt(summary.mediaTotal, 10);
    const regionsTotal = Number.parseInt(summary.regionsTotal, 10);
    const provincesTotal = Number.parseInt(summary.provincesTotal, 10);
    const comuniTotal = Number.parseInt(summary.comuniTotal, 10);

    const statusCounts = new Map<string, number>();
    for (const row of statusResult.rows) {
      statusCounts.set(row.status, Number.parseInt(row.count, 10));
    }

    const published = statusCounts.get('published') ?? 0;
    const pendingReview = statusCounts.get('pending_review') ?? 0;
    const rejected = statusCounts.get('rejected') ?? 0;
    const suspended = statusCounts.get('suspended') ?? 0;

    if (listingsTotal < 30) {
      throw new Error(`Expected at least 30 demo listings, found ${listingsTotal}.`);
    }

    if (mediaTotal < listingsTotal) {
      throw new Error(
        `Expected at least one media for each demo listing, found media=${mediaTotal}, listings=${listingsTotal}.`,
      );
    }

    if (published < 10 || pendingReview < 2 || rejected < 1 || suspended < 1) {
      throw new Error(
        `Unexpected status distribution: published=${published}, pending_review=${pendingReview}, rejected=${rejected}, suspended=${suspended}.`,
      );
    }

    if (regionsTotal < 5 || provincesTotal < 10 || comuniTotal < 15) {
      throw new Error(
        `Insufficient geography coverage: regions=${regionsTotal}, provinces=${provincesTotal}, comuni=${comuniTotal}.`,
      );
    }

    console.log(
      JSON.stringify(
        {
          listingsTotal,
          mediaTotal,
          regionsTotal,
          provincesTotal,
          comuniTotal,
          statusCounts: {
            published,
            pending_review: pendingReview,
            rejected,
            suspended,
          },
        },
        null,
        2,
      ),
    );
    console.log('[smoke:seed-listings] OK');
  } finally {
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[smoke:seed-listings] ${error.message}`);
  process.exit(1);
});
