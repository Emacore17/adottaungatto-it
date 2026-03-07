import 'reflect-metadata';
import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';
import { UserIdentityReconciliationRepository } from './user-identity-reconciliation.repository';
import { UserIdentityReconciliationWorkerService } from './user-identity-reconciliation-worker.service';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const env = loadWorkerEnv();
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
const repository = new UserIdentityReconciliationRepository(pool);
const lockService = new WorkerDistributedLockService(pool);
const service = new UserIdentityReconciliationWorkerService(repository, lockService);

service
  .runReconciliationCycle()
  .then(async (summary) => {
    console.log(
      `[users:reconcile-identities] scanned=${summary.scannedUsers} reconciled=${summary.reconciledUsers} missing=${summary.missingUsers} failed=${summary.failedUsers} email_updates=${summary.updatedEmails} linked_upserts=${summary.upsertedLinkedIdentities} linked_removed=${summary.removedLinkedIdentities}`,
    );
    await pool.end();
  })
  .catch(async (error: Error) => {
    console.error(`[users:reconcile-identities] ${error.message}`);
    await pool.end();
    process.exit(1);
  });
