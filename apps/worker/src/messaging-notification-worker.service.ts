import { loadWorkerEnv } from '@adottaungatto/config';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { IntervalWorkerTask } from './interval-worker-task';
import type { MessagingEmailDeliveryService } from './messaging-email-delivery.service';
import type {
  MessageEmailNotificationJob,
  MessagingNotificationOutboxRepository,
} from './messaging-notification-outbox.repository';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

const messageNotificationWorkerLockName = 'worker:messaging-notification';

@Injectable()
export class MessagingNotificationWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly env = loadWorkerEnv();
  private readonly logger = new Logger(MessagingNotificationWorkerService.name);
  private pollTask: IntervalWorkerTask | null = null;
  private processing = false;

  constructor(
    private readonly outboxRepository: MessagingNotificationOutboxRepository,
    private readonly emailDeliveryService: MessagingEmailDeliveryService,
    private readonly workerDistributedLockService: WorkerDistributedLockService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.env.MESSAGE_EMAIL_NOTIFICATIONS_ENABLED) {
      this.logger.log('Messaging email notifications are disabled.');
      return;
    }

    try {
      await this.emailDeliveryService.verifyConnection();
    } catch (error) {
      this.logger.warn(`SMTP verification failed (${this.normalizeError(error)}).`);
    }

    await this.processDueJobs();
    this.pollTask = new IntervalWorkerTask(this.env.MESSAGE_NOTIFICATION_WORKER_POLL_MS, async () => {
      await this.processDueJobs();
    });
    this.pollTask.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.pollTask?.stop();
    this.pollTask = null;
  }

  async processDueJobs(): Promise<number> {
    if (!this.env.MESSAGE_EMAIL_NOTIFICATIONS_ENABLED || this.processing) {
      return 0;
    }

    this.processing = true;

    try {
      const execution = await this.workerDistributedLockService.runWithLock(
        messageNotificationWorkerLockName,
        async () => {
          const jobs = await this.outboxRepository.claimDueMessageEmailJobs(
            this.env.MESSAGE_NOTIFICATION_WORKER_BATCH_SIZE,
            this.env.MESSAGE_NOTIFICATION_WORKER_PROCESSING_TIMEOUT_SECONDS,
          );

          for (const job of jobs) {
            await this.processJob(job);
          }

          return jobs.length;
        },
      );

      if (!execution.acquired) {
        return 0;
      }

      return execution.result ?? 0;
    } finally {
      this.processing = false;
    }
  }

  private async processJob(job: MessageEmailNotificationJob): Promise<void> {
    if (!job.payload) {
      await this.outboxRepository.markJobFailedPermanently(
        job.id,
        job.parseError ?? 'Notification payload is invalid.',
      );
      this.logger.error(`Notification job ${job.id} failed permanently due to invalid payload.`);
      return;
    }

    try {
      await this.emailDeliveryService.sendMessageNotification(job.payload);
      await this.outboxRepository.markJobSent(job.id);
      this.logger.log(`Notification job ${job.id} delivered for thread ${job.payload.threadId}.`);
    } catch (error) {
      const normalizedError = this.normalizeError(error);
      await this.outboxRepository.markJobForRetryOrFailure(
        job.id,
        this.calculateRetryDelayMs(job.attemptCount),
        normalizedError,
      );
      this.logger.warn(
        `Notification job ${job.id} delivery failed on attempt ${job.attemptCount}/${job.maxAttempts} (${normalizedError}).`,
      );
    }
  }

  private calculateRetryDelayMs(attemptCount: number): number {
    const exponent = Math.max(0, Math.min(attemptCount - 1, 5));
    return Math.min(30_000 * 2 ** exponent, 30 * 60_000);
  }

  private normalizeError(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Unknown worker error.';
    return message.slice(0, 4_000);
  }
}
