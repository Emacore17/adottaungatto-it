import 'reflect-metadata';
import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';
import { createSearchIndexAdminClient } from './search-index-admin';
import { SearchIndexCleanupWorkerService } from './search-index-cleanup-worker.service';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const env = loadWorkerEnv();
const adminClient = createSearchIndexAdminClient(env.OPENSEARCH_URL);
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
const lockService = new WorkerDistributedLockService(pool);
const service = new SearchIndexCleanupWorkerService(adminClient, lockService);

service
  .runCleanupCycle()
  .then(async (summary) => {
    console.log(
      `[search:cleanup] active=${summary.activeIndices.join(',') || 'none'} retained_inactive=${summary.retainedInactiveIndices.join(',') || 'none'} deleted=${summary.deletedIndices.join(',') || 'none'}`,
    );
    await pool.end();
  })
  .catch(async (error: Error) => {
    console.error(`[search:cleanup] ${error.message}`);
    await pool.end();
    process.exit(1);
  });
