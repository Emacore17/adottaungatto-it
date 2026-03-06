import 'reflect-metadata';
import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';
import { RetentionCleanupRepository } from './retention-cleanup.repository';
import { RetentionCleanupWorkerService } from './retention-cleanup-worker.service';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const env = loadWorkerEnv();
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
const repository = new RetentionCleanupRepository(pool);
const lockService = new WorkerDistributedLockService(pool);
const service = new RetentionCleanupWorkerService(repository, lockService);

service
  .runCleanupCycle()
  .then(async (summary) => {
    console.log(
      `[cleanup:retention] analytics=${summary.analyticsEvents} audit=${summary.adminAuditLogs} outbox_sent=${summary.notificationOutboxSent} outbox_failed=${summary.notificationOutboxFailed} deleted_threads=${summary.deletedMessageThreads} contact_requests=${summary.listingContactRequests} promotion_events=${summary.promotionEvents} inactive_archived_threads=${summary.inactiveArchivedMessageThreads} total=${summary.totalDeleted}`,
    );
    await pool.end();
  })
  .catch(async (error: Error) => {
    console.error(`[cleanup:retention] ${error.message}`);
    await pool.end();
    process.exit(1);
  });
