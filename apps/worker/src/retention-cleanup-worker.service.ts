import { loadWorkerEnv } from '@adottaungatto/config';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { IntervalWorkerTask } from './interval-worker-task';
import { RetentionCleanupRepository } from './retention-cleanup.repository';

export type RetentionCleanupSummary = {
  analyticsEvents: number;
  adminAuditLogs: number;
  notificationOutboxSent: number;
  notificationOutboxFailed: number;
  deletedMessageThreads: number;
  totalDeleted: number;
};

const emptySummary = (): RetentionCleanupSummary => ({
  analyticsEvents: 0,
  adminAuditLogs: 0,
  notificationOutboxSent: 0,
  notificationOutboxFailed: 0,
  deletedMessageThreads: 0,
  totalDeleted: 0,
});

@Injectable()
export class RetentionCleanupWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly env = loadWorkerEnv();
  private readonly logger = new Logger(RetentionCleanupWorkerService.name);
  private cleanupTask: IntervalWorkerTask | null = null;
  private processing = false;

  constructor(private readonly retentionCleanupRepository: RetentionCleanupRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.env.RETENTION_CLEANUP_ENABLED) {
      this.logger.log('Retention cleanup worker is disabled.');
      return;
    }

    await this.runCleanupCycle();
    this.cleanupTask = new IntervalWorkerTask(this.env.RETENTION_CLEANUP_POLL_MS, async () => {
      await this.runCleanupCycle();
    });
    this.cleanupTask.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.cleanupTask?.stop();
    this.cleanupTask = null;
  }

  async runCleanupCycle(): Promise<RetentionCleanupSummary> {
    if (!this.env.RETENTION_CLEANUP_ENABLED || this.processing) {
      return emptySummary();
    }

    this.processing = true;

    try {
      const batchSize = this.env.RETENTION_CLEANUP_DELETE_BATCH_SIZE;
      const summary: RetentionCleanupSummary = {
        analyticsEvents:
          this.env.RETENTION_ANALYTICS_EVENTS_DAYS > 0
            ? await this.retentionCleanupRepository.purgeAnalyticsEvents(
                this.env.RETENTION_ANALYTICS_EVENTS_DAYS,
                batchSize,
              )
            : 0,
        adminAuditLogs:
          this.env.RETENTION_ADMIN_AUDIT_LOGS_DAYS > 0
            ? await this.retentionCleanupRepository.purgeAdminAuditLogs(
                this.env.RETENTION_ADMIN_AUDIT_LOGS_DAYS,
                batchSize,
              )
            : 0,
        notificationOutboxSent:
          this.env.RETENTION_NOTIFICATION_OUTBOX_SENT_DAYS > 0
            ? await this.retentionCleanupRepository.purgeNotificationOutboxSent(
                this.env.RETENTION_NOTIFICATION_OUTBOX_SENT_DAYS,
                batchSize,
              )
            : 0,
        notificationOutboxFailed:
          this.env.RETENTION_NOTIFICATION_OUTBOX_FAILED_DAYS > 0
            ? await this.retentionCleanupRepository.purgeNotificationOutboxFailed(
                this.env.RETENTION_NOTIFICATION_OUTBOX_FAILED_DAYS,
                batchSize,
              )
            : 0,
        deletedMessageThreads:
          this.env.RETENTION_MESSAGE_THREADS_DELETED_DAYS > 0
            ? await this.retentionCleanupRepository.purgeDeletedMessageThreads(
                this.env.RETENTION_MESSAGE_THREADS_DELETED_DAYS,
                batchSize,
              )
            : 0,
        totalDeleted: 0,
      };

      summary.totalDeleted =
        summary.analyticsEvents +
        summary.adminAuditLogs +
        summary.notificationOutboxSent +
        summary.notificationOutboxFailed +
        summary.deletedMessageThreads;

      if (summary.totalDeleted > 0) {
        this.logger.log(
          `Retention cleanup deleted analytics=${summary.analyticsEvents} audit=${summary.adminAuditLogs} outbox_sent=${summary.notificationOutboxSent} outbox_failed=${summary.notificationOutboxFailed} deleted_threads=${summary.deletedMessageThreads} total=${summary.totalDeleted}.`,
        );
      }

      return summary;
    } finally {
      this.processing = false;
    }
  }
}
