import 'reflect-metadata';
import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';
import { PromotionsLifecycleRepository } from './promotions-lifecycle.repository';
import { PromotionsLifecycleWorkerService } from './promotions-lifecycle-worker.service';
import { createSearchIndexAdminClient } from './search-index-admin';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const env = loadWorkerEnv();
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
const repository = new PromotionsLifecycleRepository(pool);
const searchIndexAdminClient = createSearchIndexAdminClient(env.OPENSEARCH_URL);
const lockService = new WorkerDistributedLockService(pool);
const service = new PromotionsLifecycleWorkerService(
  repository,
  searchIndexAdminClient,
  lockService,
);

service
  .runLifecycleCycle()
  .then(async (summary) => {
    console.log(
      `[promotions:lifecycle] activated=${summary.activatedPromotions} expired=${summary.expiredPromotions} transitioned=${summary.transitionedPromotions} touched_listings=${summary.touchedListings} reindexed=${summary.reindexedListings} removed_from_index=${summary.removedFromSearchIndex} search_sync_failures=${summary.searchSyncFailures}`,
    );
    await pool.end();
  })
  .catch(async (error: Error) => {
    console.error(`[promotions:lifecycle] ${error.message}`);
    await pool.end();
    process.exit(1);
  });
