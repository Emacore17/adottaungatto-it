import type { WorkerEnv } from '@adottaungatto/config';
import { SEARCH_INDEX_READ_ALIAS, SEARCH_INDEX_WRITE_ALIAS } from '@adottaungatto/types';
import type { Pool } from 'pg';
import {
  OpsObservabilityRepository,
  type OpsOutboxMetrics,
  type OpsPromotionLagMetrics,
} from './ops-observability.repository';

export type SearchClusterStatus = 'green' | 'yellow' | 'red' | 'unknown';

export type OpsSearchMetrics = {
  reachable: boolean;
  clusterStatus: SearchClusterStatus;
  aliasesReady: boolean;
};

export type OpsObservabilitySnapshot = {
  timestamp: string;
  workerName: string;
  outbox: OpsOutboxMetrics;
  promotions: OpsPromotionLagMetrics;
  search: OpsSearchMetrics;
};

export type OpsAlertSeverity = 'warning' | 'critical';

export type OpsAlert = {
  code: string;
  severity: OpsAlertSeverity;
  message: string;
};

export type OpsAlertReportStatus = 'ok' | 'warning' | 'critical';

export type OpsAlertReport = {
  timestamp: string;
  status: OpsAlertReportStatus;
  failOn: 'warning' | 'critical';
  shouldFail: boolean;
  alerts: OpsAlert[];
};

const normalizeSearchClusterStatus = (value: unknown): SearchClusterStatus => {
  if (value === 'green' || value === 'yellow' || value === 'red') {
    return value;
  }

  return 'unknown';
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const buildBaseOpenSearchUrl = (url: string): string => url.replace(/\/$/, '');

const readSearchMetrics = async (opensearchUrl: string): Promise<OpsSearchMetrics> => {
  const baseUrl = buildBaseOpenSearchUrl(opensearchUrl);

  try {
    const [clusterResponse, aliasesResponse] = await Promise.all([
      fetch(`${baseUrl}/_cluster/health`, {
        method: 'GET',
      }),
      fetch(`${baseUrl}/_cat/aliases/${SEARCH_INDEX_READ_ALIAS},${SEARCH_INDEX_WRITE_ALIAS}?format=json`, {
        method: 'GET',
      }),
    ]);

    if (!clusterResponse.ok) {
      return {
        reachable: false,
        clusterStatus: 'unknown',
        aliasesReady: false,
      };
    }

    const clusterPayload = asRecord(await clusterResponse.json());
    const clusterStatus = normalizeSearchClusterStatus(clusterPayload?.status);

    let aliasesReady = false;
    if (aliasesResponse.status === 200) {
      const aliasesPayload = (await aliasesResponse.json()) as unknown;
      if (Array.isArray(aliasesPayload)) {
        const aliases = new Set<string>();
        for (const item of aliasesPayload) {
          const record = asRecord(item);
          const alias = typeof record?.alias === 'string' ? record.alias : null;
          if (alias) {
            aliases.add(alias);
          }
        }

        aliasesReady = aliases.has(SEARCH_INDEX_READ_ALIAS) && aliases.has(SEARCH_INDEX_WRITE_ALIAS);
      }
    }

    return {
      reachable: true,
      clusterStatus,
      aliasesReady,
    };
  } catch {
    return {
      reachable: false,
      clusterStatus: 'unknown',
      aliasesReady: false,
    };
  }
};

export const buildOpsObservabilitySnapshot = async (input: {
  env: WorkerEnv;
  pool: Pool;
}): Promise<OpsObservabilitySnapshot> => {
  const repository = new OpsObservabilityRepository(input.pool);

  const [outbox, promotions, search] = await Promise.all([
    repository.readOutboxMetrics(input.env.MESSAGE_NOTIFICATION_WORKER_PROCESSING_TIMEOUT_SECONDS),
    repository.readPromotionLagMetrics(),
    readSearchMetrics(input.env.OPENSEARCH_URL),
  ]);

  return {
    timestamp: new Date().toISOString(),
    workerName: input.env.WORKER_NAME,
    outbox,
    promotions,
    search,
  };
};

const evaluateStatus = (alerts: OpsAlert[]): OpsAlertReportStatus => {
  if (alerts.some((alert) => alert.severity === 'critical')) {
    return 'critical';
  }

  if (alerts.some((alert) => alert.severity === 'warning')) {
    return 'warning';
  }

  return 'ok';
};

const buildAlertMessage = (input: {
  code: string;
  metric: number | null;
  threshold: number;
  comparator: '>=' | '>';
  extra?: string;
}): string => {
  const valueText = input.metric === null ? 'null' : String(input.metric);
  return `${input.code}: value=${valueText} ${input.comparator} threshold=${input.threshold}${input.extra ? ` (${input.extra})` : ''}`;
};

export const evaluateOpsAlerts = (input: {
  snapshot: OpsObservabilitySnapshot;
  env: WorkerEnv;
}): OpsAlertReport => {
  const { snapshot, env } = input;
  const alerts: OpsAlert[] = [];

  if (!snapshot.search.reachable) {
    alerts.push({
      code: 'search_unreachable',
      severity: 'critical',
      message: 'OpenSearch is unreachable from worker runtime.',
    });
  }

  if (snapshot.search.clusterStatus === 'red') {
    alerts.push({
      code: 'search_cluster_red',
      severity: 'critical',
      message: 'OpenSearch cluster health is red.',
    });
  }

  if (!snapshot.search.aliasesReady) {
    alerts.push({
      code: 'search_aliases_not_ready',
      severity: 'warning',
      message: 'Search aliases listings_read/listings_write are not both available.',
    });
  }

  if (snapshot.outbox.pendingCount >= env.OPS_ALERT_OUTBOX_PENDING_WARN) {
    alerts.push({
      code: 'outbox_pending_backlog',
      severity: 'warning',
      message: buildAlertMessage({
        code: 'outbox_pending_backlog',
        metric: snapshot.outbox.pendingCount,
        threshold: env.OPS_ALERT_OUTBOX_PENDING_WARN,
        comparator: '>=',
      }),
    });
  }

  if (snapshot.outbox.processingStaleCount >= env.OPS_ALERT_OUTBOX_PROCESSING_STALE_CRITICAL) {
    alerts.push({
      code: 'outbox_processing_stale',
      severity: 'critical',
      message: buildAlertMessage({
        code: 'outbox_processing_stale',
        metric: snapshot.outbox.processingStaleCount,
        threshold: env.OPS_ALERT_OUTBOX_PROCESSING_STALE_CRITICAL,
        comparator: '>=',
      }),
    });
  }

  if (snapshot.outbox.failedLastHourCount >= env.OPS_ALERT_OUTBOX_FAILED_LAST_HOUR_WARN) {
    alerts.push({
      code: 'outbox_failed_last_hour',
      severity: 'warning',
      message: buildAlertMessage({
        code: 'outbox_failed_last_hour',
        metric: snapshot.outbox.failedLastHourCount,
        threshold: env.OPS_ALERT_OUTBOX_FAILED_LAST_HOUR_WARN,
        comparator: '>=',
      }),
    });
  }

  if (
    snapshot.outbox.oldestPendingAgeSeconds !== null &&
    snapshot.outbox.oldestPendingAgeSeconds >= env.OPS_ALERT_OUTBOX_OLDEST_PENDING_SECONDS_WARN
  ) {
    alerts.push({
      code: 'outbox_oldest_pending_age',
      severity: 'warning',
      message: buildAlertMessage({
        code: 'outbox_oldest_pending_age',
        metric: snapshot.outbox.oldestPendingAgeSeconds,
        threshold: env.OPS_ALERT_OUTBOX_OLDEST_PENDING_SECONDS_WARN,
        comparator: '>=',
      }),
    });
  }

  if (snapshot.promotions.dueTotal >= env.OPS_ALERT_PROMOTIONS_DUE_WARN) {
    alerts.push({
      code: 'promotions_due_backlog',
      severity: 'warning',
      message: buildAlertMessage({
        code: 'promotions_due_backlog',
        metric: snapshot.promotions.dueTotal,
        threshold: env.OPS_ALERT_PROMOTIONS_DUE_WARN,
        comparator: '>=',
      }),
    });
  }

  const status = evaluateStatus(alerts);
  const shouldFail =
    status === 'critical' || (status === 'warning' && env.OPS_ALERT_FAIL_ON === 'warning');

  return {
    timestamp: snapshot.timestamp,
    status,
    failOn: env.OPS_ALERT_FAIL_ON,
    shouldFail,
    alerts,
  };
};
