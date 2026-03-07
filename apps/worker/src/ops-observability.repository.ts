import type { Pool } from 'pg';

export type OpsOutboxMetrics = {
  pendingCount: number;
  processingCount: number;
  processingStaleCount: number;
  failedLastHourCount: number;
  failedLast24HoursCount: number;
  oldestPendingAgeSeconds: number | null;
};

export type OpsPromotionLagMetrics = {
  dueActivations: number;
  dueExpirations: number;
  dueTotal: number;
};

type OutboxMetricsRow = {
  pendingCount: string;
  processingCount: string;
  processingStaleCount: string;
  failedLastHourCount: string;
  failedLast24HoursCount: string;
  oldestPendingAgeSeconds: string | null;
};

type PromotionLagRow = {
  dueActivations: string;
  dueExpirations: string;
};

const parseInteger = (value: string | null | undefined): number => {
  if (typeof value !== 'string') {
    return 0;
  }

  return Number.parseInt(value, 10) || 0;
};

export class OpsObservabilityRepository {
  constructor(private readonly pool: Pool) {}

  async readOutboxMetrics(processingTimeoutSeconds: number): Promise<OpsOutboxMetrics> {
    const result = await this.pool.query<OutboxMetricsRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE outbox.status = 'pending'::notification_outbox_status)::text AS "pendingCount",
          COUNT(*) FILTER (WHERE outbox.status = 'processing'::notification_outbox_status)::text AS "processingCount",
          COUNT(*) FILTER (
            WHERE outbox.status = 'processing'::notification_outbox_status
              AND outbox.processing_started_at IS NOT NULL
              AND outbox.processing_started_at <= NOW() - ($1::integer * INTERVAL '1 second')
          )::text AS "processingStaleCount",
          COUNT(*) FILTER (
            WHERE outbox.status = 'failed'::notification_outbox_status
              AND outbox.failed_at IS NOT NULL
              AND outbox.failed_at >= NOW() - INTERVAL '1 hour'
          )::text AS "failedLastHourCount",
          COUNT(*) FILTER (
            WHERE outbox.status = 'failed'::notification_outbox_status
              AND outbox.failed_at IS NOT NULL
              AND outbox.failed_at >= NOW() - INTERVAL '24 hours'
          )::text AS "failedLast24HoursCount",
          CASE
            WHEN COUNT(*) FILTER (WHERE outbox.status = 'pending'::notification_outbox_status) = 0 THEN NULL
            ELSE FLOOR(
              MAX(EXTRACT(EPOCH FROM (NOW() - outbox.available_at))) FILTER (
                WHERE outbox.status = 'pending'::notification_outbox_status
              )
            )::text
          END AS "oldestPendingAgeSeconds"
        FROM notification_outbox outbox
        WHERE outbox.channel = 'email'
          AND outbox.event_type = 'message_received';
      `,
      [processingTimeoutSeconds],
    );

    const row = result.rows[0];

    return {
      pendingCount: parseInteger(row?.pendingCount),
      processingCount: parseInteger(row?.processingCount),
      processingStaleCount: parseInteger(row?.processingStaleCount),
      failedLastHourCount: parseInteger(row?.failedLastHourCount),
      failedLast24HoursCount: parseInteger(row?.failedLast24HoursCount),
      oldestPendingAgeSeconds:
        row?.oldestPendingAgeSeconds === null
          ? null
          : parseInteger(row?.oldestPendingAgeSeconds),
    };
  }

  async readPromotionLagMetrics(): Promise<OpsPromotionLagMetrics> {
    const result = await this.pool.query<PromotionLagRow>(
      `
        SELECT
          COUNT(*) FILTER (
            WHERE lp.status = 'scheduled'
              AND lp.cancelled_at IS NULL
              AND lp.starts_at <= NOW()
              AND lp.ends_at > NOW()
          )::text AS "dueActivations",
          COUNT(*) FILTER (
            WHERE lp.status IN ('scheduled', 'active')
              AND lp.cancelled_at IS NULL
              AND lp.ends_at <= NOW()
          )::text AS "dueExpirations"
        FROM listing_promotions lp;
      `,
    );

    const dueActivations = parseInteger(result.rows[0]?.dueActivations);
    const dueExpirations = parseInteger(result.rows[0]?.dueExpirations);

    return {
      dueActivations,
      dueExpirations,
      dueTotal: dueActivations + dueExpirations,
    };
  }
}
