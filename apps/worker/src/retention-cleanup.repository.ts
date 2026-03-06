import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { WORKER_DATABASE_POOL } from './database/database.constants';

type DeletedRow = {
  id: string;
};

@Injectable()
export class RetentionCleanupRepository {
  constructor(
    @Inject(WORKER_DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async purgeAnalyticsEvents(retentionDays: number, batchSize: number): Promise<number> {
    return this.deleteRowsWithCutoff(
      `
        WITH doomed AS (
          SELECT event.id
          FROM analytics_events event
          WHERE event.created_at < NOW() - ($1::integer * INTERVAL '1 day')
          ORDER BY event.created_at ASC, event.id ASC
          LIMIT $2::integer
        )
        DELETE FROM analytics_events event
        USING doomed
        WHERE event.id = doomed.id
        RETURNING event.id::text AS "id";
      `,
      retentionDays,
      batchSize,
    );
  }

  async purgeAdminAuditLogs(retentionDays: number, batchSize: number): Promise<number> {
    return this.deleteRowsWithCutoff(
      `
        WITH doomed AS (
          SELECT log.id
          FROM admin_audit_logs log
          WHERE log.created_at < NOW() - ($1::integer * INTERVAL '1 day')
          ORDER BY log.created_at ASC, log.id ASC
          LIMIT $2::integer
        )
        DELETE FROM admin_audit_logs log
        USING doomed
        WHERE log.id = doomed.id
        RETURNING log.id::text AS "id";
      `,
      retentionDays,
      batchSize,
    );
  }

  async purgeNotificationOutboxSent(retentionDays: number, batchSize: number): Promise<number> {
    return this.deleteRowsWithCutoff(
      `
        WITH doomed AS (
          SELECT outbox.id
          FROM notification_outbox outbox
          WHERE outbox.status = 'sent'::notification_outbox_status
            AND outbox.sent_at IS NOT NULL
            AND outbox.sent_at < NOW() - ($1::integer * INTERVAL '1 day')
          ORDER BY outbox.sent_at ASC, outbox.id ASC
          LIMIT $2::integer
        )
        DELETE FROM notification_outbox outbox
        USING doomed
        WHERE outbox.id = doomed.id
        RETURNING outbox.id::text AS "id";
      `,
      retentionDays,
      batchSize,
    );
  }

  async purgeNotificationOutboxFailed(retentionDays: number, batchSize: number): Promise<number> {
    return this.deleteRowsWithCutoff(
      `
        WITH doomed AS (
          SELECT outbox.id
          FROM notification_outbox outbox
          WHERE outbox.status = 'failed'::notification_outbox_status
            AND outbox.failed_at IS NOT NULL
            AND outbox.failed_at < NOW() - ($1::integer * INTERVAL '1 day')
          ORDER BY outbox.failed_at ASC, outbox.id ASC
          LIMIT $2::integer
        )
        DELETE FROM notification_outbox outbox
        USING doomed
        WHERE outbox.id = doomed.id
        RETURNING outbox.id::text AS "id";
      `,
      retentionDays,
      batchSize,
    );
  }

  async purgeDeletedMessageThreads(retentionDays: number, batchSize: number): Promise<number> {
    return this.deleteRowsWithCutoff(
      `
        WITH doomed AS (
          SELECT thread.id
          FROM message_threads thread
          WHERE thread.deleted_at IS NOT NULL
            AND thread.deleted_at < NOW() - ($1::integer * INTERVAL '1 day')
          ORDER BY thread.deleted_at ASC, thread.id ASC
          LIMIT $2::integer
        )
        DELETE FROM message_threads thread
        USING doomed
        WHERE thread.id = doomed.id
        RETURNING thread.id::text AS "id";
      `,
      retentionDays,
      batchSize,
    );
  }

  async purgeListingContactRequests(retentionDays: number, batchSize: number): Promise<number> {
    return this.deleteRowsWithCutoff(
      `
        WITH doomed AS (
          SELECT request.id
          FROM listing_contact_requests request
          WHERE request.created_at < NOW() - ($1::integer * INTERVAL '1 day')
          ORDER BY request.created_at ASC, request.id ASC
          LIMIT $2::integer
        )
        DELETE FROM listing_contact_requests request
        USING doomed
        WHERE request.id = doomed.id
        RETURNING request.id::text AS "id";
      `,
      retentionDays,
      batchSize,
    );
  }

  async purgePromotionEvents(retentionDays: number, batchSize: number): Promise<number> {
    return this.deleteRowsWithCutoff(
      `
        WITH doomed AS (
          SELECT event.id
          FROM promotion_events event
          WHERE event.created_at < NOW() - ($1::integer * INTERVAL '1 day')
          ORDER BY event.created_at ASC, event.id ASC
          LIMIT $2::integer
        )
        DELETE FROM promotion_events event
        USING doomed
        WHERE event.id = doomed.id
        RETURNING event.id::text AS "id";
      `,
      retentionDays,
      batchSize,
    );
  }

  async purgeInactiveArchivedMessageThreads(
    retentionDays: number,
    batchSize: number,
  ): Promise<number> {
    return this.deleteRowsWithCutoff(
      `
        WITH doomed AS (
          SELECT thread.id
          FROM message_threads thread
          WHERE thread.deleted_at IS NULL
            AND thread.latest_message_at < NOW() - ($1::integer * INTERVAL '1 day')
            AND NOT EXISTS (
              SELECT 1
              FROM message_thread_participants participant
              WHERE participant.thread_id = thread.id
                AND participant.archived_at IS NULL
            )
          ORDER BY thread.latest_message_at ASC, thread.id ASC
          LIMIT $2::integer
        )
        DELETE FROM message_threads thread
        USING doomed
        WHERE thread.id = doomed.id
        RETURNING thread.id::text AS "id";
      `,
      retentionDays,
      batchSize,
    );
  }

  private async deleteRowsWithCutoff(
    sql: string,
    retentionDays: number,
    batchSize: number,
  ): Promise<number> {
    const result = await this.pool.query<DeletedRow>(sql, [retentionDays, batchSize]);
    return result.rowCount ?? 0;
  }
}
