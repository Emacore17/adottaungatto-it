import type { WorkerEnv } from '@adottaungatto/config';
import { describe, expect, it } from 'vitest';
import { evaluateOpsAlerts, type OpsObservabilitySnapshot } from './ops-observability';

const baseSnapshot = (): OpsObservabilitySnapshot => ({
  timestamp: '2026-03-07T12:00:00.000Z',
  workerName: 'worker-test',
  outbox: {
    pendingCount: 0,
    processingCount: 0,
    processingStaleCount: 0,
    failedLastHourCount: 0,
    failedLast24HoursCount: 0,
    oldestPendingAgeSeconds: null,
  },
  promotions: {
    dueActivations: 0,
    dueExpirations: 0,
    dueTotal: 0,
  },
  search: {
    reachable: true,
    clusterStatus: 'green',
    aliasesReady: true,
  },
});

const baseEnv = (): WorkerEnv =>
  ({
    NODE_ENV: 'test',
    WORKER_NAME: 'worker-test',
    DATABASE_URL: 'postgresql://example.test/db',
    REDIS_URL: 'redis://example.test:6379',
    OPENSEARCH_URL: 'http://example.test:9200',
    KEYCLOAK_URL: 'http://example.test:8080',
    KEYCLOAK_REALM: 'adottaungatto',
    KEYCLOAK_ADMIN_REALM: 'master',
    KEYCLOAK_ADMIN_CLIENT_ID: 'admin-cli',
    KEYCLOAK_ADMIN: 'admin',
    KEYCLOAK_ADMIN_PASSWORD: 'admin',
    MINIO_ENDPOINT: 'http://example.test:9000',
    MINIO_ACCESS_KEY: 'minio',
    MINIO_SECRET_KEY: 'minio123',
    MINIO_BUCKET_LISTING_ORIGINALS: 'listing-originals',
    MINIO_BUCKET_LISTING_THUMBS: 'listing-thumbs',
    MESSAGE_EMAIL_NOTIFICATIONS_ENABLED: true,
    MESSAGE_EMAIL_NOTIFICATION_MAX_ATTEMPTS: 8,
    MESSAGE_NOTIFICATION_WORKER_POLL_MS: 5000,
    MESSAGE_NOTIFICATION_WORKER_BATCH_SIZE: 10,
    MESSAGE_NOTIFICATION_WORKER_PROCESSING_TIMEOUT_SECONDS: 300,
    SEARCH_INDEX_STALE_CLEANUP_ENABLED: true,
    SEARCH_INDEX_STALE_CLEANUP_POLL_MS: 900000,
    SEARCH_INDEX_STALE_RETAIN_INACTIVE_COUNT: 1,
    PROMOTIONS_LIFECYCLE_ENABLED: true,
    PROMOTIONS_LIFECYCLE_POLL_MS: 60000,
    PROMOTIONS_LIFECYCLE_BATCH_SIZE: 500,
    PROMOTIONS_LIFECYCLE_MAX_BATCHES_PER_CYCLE: 10,
    RETENTION_CLEANUP_ENABLED: true,
    RETENTION_CLEANUP_POLL_MS: 300000,
    RETENTION_CLEANUP_DELETE_BATCH_SIZE: 500,
    RETENTION_ANALYTICS_EVENTS_DAYS: 90,
    RETENTION_ADMIN_AUDIT_LOGS_DAYS: 365,
    RETENTION_NOTIFICATION_OUTBOX_SENT_DAYS: 14,
    RETENTION_NOTIFICATION_OUTBOX_FAILED_DAYS: 30,
    RETENTION_MESSAGE_THREADS_DELETED_DAYS: 30,
    RETENTION_LISTING_CONTACT_REQUESTS_DAYS: 180,
    RETENTION_PROMOTION_EVENTS_DAYS: 365,
    RETENTION_MESSAGE_THREADS_INACTIVE_DAYS: 120,
    USER_IDENTITY_RECONCILIATION_ENABLED: true,
    USER_IDENTITY_RECONCILIATION_POLL_MS: 900000,
    USER_IDENTITY_RECONCILIATION_BATCH_SIZE: 100,
    USER_IDENTITY_RECONCILIATION_MAX_BATCHES_PER_CYCLE: 10,
    OPS_ALERT_OUTBOX_PENDING_WARN: 200,
    OPS_ALERT_OUTBOX_PROCESSING_STALE_CRITICAL: 10,
    OPS_ALERT_OUTBOX_FAILED_LAST_HOUR_WARN: 20,
    OPS_ALERT_OUTBOX_OLDEST_PENDING_SECONDS_WARN: 900,
    OPS_ALERT_PROMOTIONS_DUE_WARN: 50,
    OPS_ALERT_FAIL_ON: 'critical',
    WEB_APP_URL: 'http://localhost:3000',
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_SECURE: false,
    SMTP_USERNAME: '',
    SMTP_PASSWORD: '',
    SMTP_FROM_EMAIL: 'notifiche@example.test',
    SMTP_FROM_NAME: 'Adotta un Gatto',
  }) as WorkerEnv;

describe('evaluateOpsAlerts', () => {
  it('returns ok when no alert conditions are met', () => {
    const report = evaluateOpsAlerts({
      snapshot: baseSnapshot(),
      env: baseEnv(),
    });

    expect(report.status).toBe('ok');
    expect(report.shouldFail).toBe(false);
    expect(report.alerts).toHaveLength(0);
  });

  it('returns warning when backlog thresholds are exceeded', () => {
    const snapshot = baseSnapshot();
    snapshot.outbox.pendingCount = 250;
    snapshot.outbox.failedLastHourCount = 24;

    const report = evaluateOpsAlerts({
      snapshot,
      env: baseEnv(),
    });

    expect(report.status).toBe('warning');
    expect(report.shouldFail).toBe(false);
    expect(report.alerts.map((alert) => alert.code)).toEqual(
      expect.arrayContaining(['outbox_pending_backlog', 'outbox_failed_last_hour']),
    );
  });

  it('returns critical and fail when critical signals are present', () => {
    const snapshot = baseSnapshot();
    snapshot.search.reachable = false;
    snapshot.outbox.processingStaleCount = 12;

    const report = evaluateOpsAlerts({
      snapshot,
      env: baseEnv(),
    });

    expect(report.status).toBe('critical');
    expect(report.shouldFail).toBe(true);
    expect(report.alerts.map((alert) => alert.code)).toEqual(
      expect.arrayContaining(['search_unreachable', 'outbox_processing_stale']),
    );
  });

  it('fails on warnings when fail policy is warning', () => {
    const snapshot = baseSnapshot();
    snapshot.promotions.dueTotal = 60;

    const env = baseEnv();
    env.OPS_ALERT_FAIL_ON = 'warning';

    const report = evaluateOpsAlerts({
      snapshot,
      env,
    });

    expect(report.status).toBe('warning');
    expect(report.shouldFail).toBe(true);
  });
});
