'use client';

import { useReportWebVitals } from 'next/web-vitals';

const trackedMetrics = new Set(['LCP', 'CLS', 'INP']);

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!trackedMetrics.has(metric.name)) {
      return;
    }

    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const valueLabel =
      typeof metric.value === 'number' ? metric.value.toFixed(2) : String(metric.value);
    const ratingLabel = metric.rating ? ` (${metric.rating})` : '';
    console.info(`[web-vitals] ${metric.name}: ${valueLabel}${ratingLabel}`);
  });

  return null;
}
