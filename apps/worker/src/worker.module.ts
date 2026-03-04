import { loadWorkerEnv } from '@adottaungatto/config';
import { Module } from '@nestjs/common';
import { MessagingEmailDeliveryService } from './messaging-email-delivery.service';
import { MessagingNotificationOutboxRepository } from './messaging-notification-outbox.repository';
import { MessagingNotificationWorkerService } from './messaging-notification-worker.service';
import { RetentionCleanupRepository } from './retention-cleanup.repository';
import { RetentionCleanupWorkerService } from './retention-cleanup-worker.service';
import {
  SEARCH_INDEX_ADMIN_CLIENT,
  createSearchIndexAdminClient,
} from './search-index-admin';
import { SearchIndexCleanupWorkerService } from './search-index-cleanup-worker.service';

@Module({
  providers: [
    {
      provide: SEARCH_INDEX_ADMIN_CLIENT,
      useFactory: () => createSearchIndexAdminClient(loadWorkerEnv().OPENSEARCH_URL),
    },
    MessagingNotificationOutboxRepository,
    MessagingEmailDeliveryService,
    MessagingNotificationWorkerService,
    RetentionCleanupRepository,
    RetentionCleanupWorkerService,
    SearchIndexCleanupWorkerService,
  ],
})
export class WorkerModule {}
