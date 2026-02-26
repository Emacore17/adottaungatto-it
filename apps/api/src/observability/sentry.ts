import * as Sentry from '@sentry/node';

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
let serviceName = 'adottaungatto-api';

const readOptionalNonEmpty = (rawValue: string | undefined): string | undefined => {
  if (!rawValue) {
    return undefined;
  }

  const normalized = rawValue.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const initializeApiSentry = (): boolean => {
  if (initialized) {
    return true;
  }

  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    return false;
  }

  serviceName = readOptionalNonEmpty(process.env.SENTRY_SERVICE_NAME) ?? 'adottaungatto-api';
  const release = readOptionalNonEmpty(process.env.SENTRY_RELEASE);

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV,
    tracesSampleRate: parseOptionalSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    release,
    enabled: true,
    initialScope: {
      tags: {
        service: serviceName,
        app: 'api',
      },
    },
  });

  initialized = true;
  return true;
};

export const isApiSentryEnabled = (): boolean => initialized;

export const captureApiException = (
  error: unknown,
  context?: {
    source?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    requestId?: string;
  },
): string | undefined => {
  if (!initialized) {
    return undefined;
  }

  const eventId = Sentry.captureException(error, {
    tags: {
      source: context?.source ?? 'api',
      service: serviceName,
    },
    extra: {
      path: context?.path,
      method: context?.method,
      statusCode: context?.statusCode,
      requestId: context?.requestId,
    },
  });

  return eventId;
};

export const flushApiSentry = async (timeoutMs = 2_000): Promise<void> => {
  if (!initialized) {
    return;
  }

  await Sentry.flush(timeoutMs);
};
