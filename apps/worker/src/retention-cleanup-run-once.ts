import 'reflect-metadata';
import { config as loadDotEnv } from 'dotenv';
import { RetentionCleanupRepository } from './retention-cleanup.repository';
import { RetentionCleanupWorkerService } from './retention-cleanup-worker.service';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const repository = new RetentionCleanupRepository();
const service = new RetentionCleanupWorkerService(repository);

service
  .runCleanupCycle()
  .then(async (summary) => {
    console.log(
      `[cleanup:retention] analytics=${summary.analyticsEvents} audit=${summary.adminAuditLogs} outbox_sent=${summary.notificationOutboxSent} outbox_failed=${summary.notificationOutboxFailed} deleted_threads=${summary.deletedMessageThreads} total=${summary.totalDeleted}`,
    );
    await repository.onModuleDestroy();
  })
  .catch(async (error: Error) => {
    console.error(`[cleanup:retention] ${error.message}`);
    await repository.onModuleDestroy();
    process.exit(1);
  });
