import { loadWorkerEnv } from '@adottaungatto/config';
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { MessagingEmailDeliveryService } from './messaging-email-delivery.service';
import { MessagingNotificationOutboxRepository } from './messaging-notification-outbox.repository';
import { MessagingNotificationWorkerService } from './messaging-notification-worker.service';
import { PromotionsLifecycleRepository } from './promotions-lifecycle.repository';
import { PromotionsLifecycleWorkerService } from './promotions-lifecycle-worker.service';
import { RetentionCleanupRepository } from './retention-cleanup.repository';
import { RetentionCleanupWorkerService } from './retention-cleanup-worker.service';
import {
  SEARCH_INDEX_ADMIN_CLIENT,
  createSearchIndexAdminClient,
} from './search-index-admin';
import { SearchIndexCleanupWorkerService } from './search-index-cleanup-worker.service';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SEARCH_INDEX_ADMIN_CLIENT,
      useFactory: () => createSearchIndexAdminClient(loadWorkerEnv().OPENSEARCH_URL),
    },
    MessagingNotificationOutboxRepository,
    MessagingEmailDeliveryService,
    MessagingNotificationWorkerService,
    PromotionsLifecycleRepository,
    PromotionsLifecycleWorkerService,
    RetentionCleanupRepository,
    RetentionCleanupWorkerService,
    SearchIndexCleanupWorkerService,
    WorkerDistributedLockService,
  ],
})
export class WorkerModule {}
