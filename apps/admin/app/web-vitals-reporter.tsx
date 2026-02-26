'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { capturePoorAdminWebVital } from './sentry-client';

const trackedMetrics = new Set(['LCP', 'CLS', 'INP']);

export function AdminWebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!trackedMetrics.has(metric.name)) {
      return;
    }

    capturePoorAdminWebVital(metric);

    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const valueLabel =
      typeof metric.value === 'number' ? metric.value.toFixed(2) : String(metric.value);
    const ratingLabel = metric.rating ? ` (${metric.rating})` : '';
    console.info(`[admin-web-vitals] ${metric.name}: ${valueLabel}${ratingLabel}`);
  });

  return null;
}
