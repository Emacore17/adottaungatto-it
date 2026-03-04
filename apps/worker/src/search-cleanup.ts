import 'reflect-metadata';
import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { createSearchIndexAdminClient } from './search-index-admin';
import { SearchIndexCleanupWorkerService } from './search-index-cleanup-worker.service';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const env = loadWorkerEnv();
const adminClient = createSearchIndexAdminClient(env.OPENSEARCH_URL);
const service = new SearchIndexCleanupWorkerService(adminClient);

service
  .runCleanupCycle()
  .then((summary) => {
    console.log(
      `[search:cleanup] active=${summary.activeIndices.join(',') || 'none'} retained_inactive=${summary.retainedInactiveIndices.join(',') || 'none'} deleted=${summary.deletedIndices.join(',') || 'none'}`,
    );
  })
  .catch((error: Error) => {
    console.error(`[search:cleanup] ${error.message}`);
    process.exit(1);
  });
