import { Module } from '@nestjs/common';
import { MessagingEmailDeliveryService } from './messaging-email-delivery.service';
import { MessagingNotificationOutboxRepository } from './messaging-notification-outbox.repository';
import { MessagingNotificationWorkerService } from './messaging-notification-worker.service';

@Module({
  providers: [
    MessagingNotificationOutboxRepository,
    MessagingEmailDeliveryService,
    MessagingNotificationWorkerService,
  ],
})
export class WorkerModule {}
