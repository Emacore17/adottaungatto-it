'use client';

import * as Sentry from '@sentry/browser';

type WebVitalMetric = {
  name: string;
  id: string;
  value: number;
  delta: number;
  rating?: string;
  navigationType?: string;
};

const parseOptionalSampleRate = (rawValue: string | undefined): number | undefined => {
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return undefined;
  }

  return parsed;
};

let initialized = false;
const defaultServiceName = 'adottaungatto-web';

const readOptionalNonEmpty = (rawValue: string | undefined): string | undefined => {
  if (!rawValue) {
    return undefined;
  }

  const normalized = rawValue.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const initializeSentryIfNeeded = () => {
  if (initialized) {
    return;
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  const release = readOptionalNonEmpty(process.env.NEXT_PUBLIC_SENTRY_RELEASE);
  const serviceName =
    readOptionalNonEmpty(process.env.NEXT_PUBLIC_SENTRY_SERVICE_NAME) ?? defaultServiceName;

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV,
    tracesSampleRate: parseOptionalSampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE),
    release,
    enabled: true,
    initialScope: {
      tags: {
        app: 'web',
        service: serviceName,
      },
    },
  });

  initialized = true;
};

export const captureWebException = (error: unknown, source: string): void => {
  initializeSentryIfNeeded();
  if (!initialized) {
    return;
  }

  Sentry.captureException(error, {
    tags: {
      source,
      app: 'web',
    },
  });
};

export const capturePoorWebVital = (metric: WebVitalMetric): void => {
  if (metric.rating !== 'poor') {
    return;
  }

  initializeSentryIfNeeded();
  if (!initialized) {
    return;
  }

  Sentry.captureMessage(`web-vital:${metric.name}`, {
    level: 'warning',
    tags: {
      app: 'web',
      metric: metric.name,
      rating: metric.rating ?? 'unknown',
    },
    extra: {
      id: metric.id,
      value: metric.value,
      delta: metric.delta,
      navigationType: metric.navigationType,
    },
  });
};
