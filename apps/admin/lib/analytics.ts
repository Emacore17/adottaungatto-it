import 'server-only';

import { loadAdminEnv } from '@adottaungatto/config';
import { cookies } from 'next/headers';
import { adminSessionCookieName } from './auth';

const env = loadAdminEnv();

export interface AdminAnalyticsKpiSnapshot {
  windowDays: number;
  from: string;
  to: string;
  metrics: {
    listingView: number;
    searchPerformed: number;
    searchFallbackApplied: number;
    contactClicked: number;
    contactSent: number;
    listingCreated: number;
    listingPublished: number;
  };
  moderation: {
    pendingReview: number;
    approved: number;
    rejected: number;
  };
  funnel: {
    listingCreated: number;
    listingPublished: number;
    contactClicked: number;
    contactSent: number;
    publishRatePct: number;
    contactFromPublishedRatePct: number;
    contactClickToSendRatePct: number;
  };
  derived: {
    fallbackRatePct: number;
    contactRatePct: number;
    publishRatePct: number;
  };
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseInteger = (value: unknown, fallbackValue: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallbackValue;
};

const parseNumber = (value: unknown, fallbackValue: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallbackValue;
};

export const fetchAdminAnalyticsKpis = async (
  windowDays: number,
): Promise<AdminAnalyticsKpiSnapshot> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName)?.value;
  if (!token) {
    throw new Error('Missing admin session token.');
  }

  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/v1/admin/analytics/kpis?windowDays=${windowDays}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch analytics KPI with status ${response.status}.`);
  }

  const payload = asRecord(await response.json());
  const metrics = asRecord(payload.metrics);
  const moderation = asRecord(payload.moderation);
  const funnel = asRecord(payload.funnel);
  const derived = asRecord(payload.derived);

  return {
    windowDays: parseInteger(payload.windowDays, windowDays),
    from: typeof payload.from === 'string' ? payload.from : new Date(0).toISOString(),
    to: typeof payload.to === 'string' ? payload.to : new Date(0).toISOString(),
    metrics: {
      listingView: parseInteger(metrics.listingView, 0),
      searchPerformed: parseInteger(metrics.searchPerformed, 0),
      searchFallbackApplied: parseInteger(metrics.searchFallbackApplied, 0),
      contactClicked: parseInteger(metrics.contactClicked, 0),
      contactSent: parseInteger(metrics.contactSent, 0),
      listingCreated: parseInteger(metrics.listingCreated, 0),
      listingPublished: parseInteger(metrics.listingPublished, 0),
    },
    moderation: {
      pendingReview: parseInteger(moderation.pendingReview, 0),
      approved: parseInteger(moderation.approved, 0),
      rejected: parseInteger(moderation.rejected, 0),
    },
    funnel: {
      listingCreated: parseInteger(funnel.listingCreated, 0),
      listingPublished: parseInteger(funnel.listingPublished, 0),
      contactClicked: parseInteger(funnel.contactClicked, 0),
      contactSent: parseInteger(funnel.contactSent, 0),
      publishRatePct: parseNumber(funnel.publishRatePct, 0),
      contactFromPublishedRatePct: parseNumber(funnel.contactFromPublishedRatePct, 0),
      contactClickToSendRatePct: parseNumber(funnel.contactClickToSendRatePct, 0),
    },
    derived: {
      fallbackRatePct: parseNumber(derived.fallbackRatePct, 0),
      contactRatePct: parseNumber(derived.contactRatePct, 0),
      publishRatePct: parseNumber(derived.publishRatePct, 0),
    },
  };
};
