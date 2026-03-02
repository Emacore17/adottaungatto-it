import { loadWorkerEnv } from '@adottaungatto/config';
import type { MessageEmailNotificationPayload } from '@adottaungatto/types';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

type NotificationOutboxRow = {
  id: string;
  payload: unknown;
  attemptCount: string;
  maxAttempts: string;
};

export interface MessageEmailNotificationJob {
  id: string;
  attemptCount: number;
  maxAttempts: number;
  payload: MessageEmailNotificationPayload | null;
  parseError: string | null;
}

@Injectable()
export class MessagingNotificationOutboxRepository implements OnModuleDestroy {
  private readonly env = loadWorkerEnv();
  private readonly pool = new Pool({
    connectionString: this.env.DATABASE_URL,
  });

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async claimDueMessageEmailJobs(
    limit: number,
    processingTimeoutSeconds: number,
  ): Promise<MessageEmailNotificationJob[]> {
    const result = await this.pool.query<NotificationOutboxRow>(
      `
        WITH candidate AS (
          SELECT outbox.id
          FROM notification_outbox outbox
          WHERE outbox.channel = 'email'
            AND outbox.event_type = 'message_received'
            AND outbox.attempt_count < outbox.max_attempts
            AND outbox.available_at <= NOW()
            AND (
              outbox.status = 'pending'::notification_outbox_status
              OR (
                outbox.status = 'processing'::notification_outbox_status
                AND outbox.processing_started_at IS NOT NULL
                AND outbox.processing_started_at <= NOW() - ($2::integer * INTERVAL '1 second')
              )
            )
          ORDER BY outbox.available_at ASC, outbox.id ASC
          LIMIT $1::integer
          FOR UPDATE SKIP LOCKED
        )
        UPDATE notification_outbox outbox
        SET
          status = 'processing'::notification_outbox_status,
          attempt_count = outbox.attempt_count + 1,
          processing_started_at = NOW(),
          updated_at = NOW()
        FROM candidate
        WHERE outbox.id = candidate.id
        RETURNING
          outbox.id::text AS "id",
          outbox.payload AS "payload",
          outbox.attempt_count::text AS "attemptCount",
          outbox.max_attempts::text AS "maxAttempts";
      `,
      [limit, processingTimeoutSeconds],
    );

    return result.rows.map((row) => {
      const parsed = this.parsePayload(row.payload);
      return {
        id: row.id,
        attemptCount: Number.parseInt(row.attemptCount, 10) || 0,
        maxAttempts: Number.parseInt(row.maxAttempts, 10) || 0,
        payload: parsed.payload,
        parseError: parsed.error,
      };
    });
  }

  async markJobSent(jobId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE notification_outbox
        SET
          status = 'sent'::notification_outbox_status,
          sent_at = NOW(),
          processing_started_at = NULL,
          last_error = NULL,
          updated_at = NOW()
        WHERE id = $1::bigint;
      `,
      [jobId],
    );
  }

  async markJobForRetryOrFailure(
    jobId: string,
    nextRetryDelayMs: number,
    errorMessage: string,
  ): Promise<void> {
    await this.pool.query(
      `
        UPDATE notification_outbox
        SET
          status = CASE
            WHEN attempt_count >= max_attempts THEN 'failed'::notification_outbox_status
            ELSE 'pending'::notification_outbox_status
          END,
          available_at = CASE
            WHEN attempt_count >= max_attempts THEN available_at
            ELSE NOW() + ($2::bigint * INTERVAL '1 millisecond')
          END,
          processing_started_at = NULL,
          failed_at = CASE
            WHEN attempt_count >= max_attempts THEN NOW()
            ELSE failed_at
          END,
          last_error = LEFT($3, 4000),
          updated_at = NOW()
        WHERE id = $1::bigint;
      `,
      [jobId, nextRetryDelayMs, errorMessage],
    );
  }

  async markJobFailedPermanently(jobId: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE notification_outbox
        SET
          status = 'failed'::notification_outbox_status,
          processing_started_at = NULL,
          failed_at = NOW(),
          last_error = LEFT($2, 4000),
          updated_at = NOW()
        WHERE id = $1::bigint;
      `,
      [jobId, errorMessage],
    );
  }

  private parsePayload(value: unknown): {
    payload: MessageEmailNotificationPayload | null;
    error: string | null;
  } {
    if (!this.isRecord(value)) {
      return {
        payload: null,
        error: 'Notification payload must be an object.',
      };
    }

    const requiredKeys = [
      'threadId',
      'messageId',
      'listingId',
      'listingTitle',
      'recipientUserId',
      'recipientEmail',
      'senderUserId',
      'senderEmail',
      'messagePreview',
      'messageCreatedAt',
    ] as const;

    for (const key of requiredKeys) {
      if (typeof value[key] !== 'string' || value[key].trim().length === 0) {
        return {
          payload: null,
          error: `Notification payload field "${key}" is required.`,
        };
      }
    }

    return {
      payload: {
        threadId: value.threadId,
        messageId: value.messageId,
        listingId: value.listingId,
        listingTitle: value.listingTitle,
        recipientUserId: value.recipientUserId,
        recipientEmail: value.recipientEmail,
        senderUserId: value.senderUserId,
        senderEmail: value.senderEmail,
        messagePreview: value.messagePreview,
        messageCreatedAt: value.messageCreatedAt,
      },
      error: null,
    };
  }

  private isRecord(value: unknown): value is Record<string, string> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
