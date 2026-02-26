import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { fetchAdminAnalyticsKpis } from '../../lib/analytics';
import { isMockModeEnabled } from '../../lib/mock-mode';
import { mockAdminKpis, mockAdminTrend } from '../../mocks/admin-data';

const trendColor: Record<string, string> = {
  up: 'bg-emerald-500',
  down: 'bg-rose-500',
  neutral: 'bg-[var(--color-surface-muted-strong)]',
};

export default async function AdminDashboardPage() {
  let source: 'api' | 'mock' = 'mock';
  let kpis = mockAdminKpis;
  let trend = mockAdminTrend;

  try {
    const analytics = await fetchAdminAnalyticsKpis(30);
    kpis = [
      {
        id: 'kpi-listings-live',
        label: 'Annunci pubblicati',
        value: analytics.funnel.listingPublished,
        trendLabel: `${analytics.windowDays} giorni`,
        trendDirection: 'neutral',
      },
      {
        id: 'kpi-pending-review',
        label: 'In moderazione',
        value: analytics.moderation.pendingReview,
        trendLabel: `${analytics.moderation.approved} approvati`,
        trendDirection: 'down',
      },
      {
        id: 'kpi-contact-rate',
        label: 'Contact rate',
        value: `${analytics.derived.contactRatePct.toFixed(1)}%`,
        trendLabel: `fallback ${analytics.derived.fallbackRatePct.toFixed(1)}%`,
        trendDirection: 'up',
      },
      {
        id: 'kpi-reports',
        label: 'Search performed',
        value: analytics.metrics.searchPerformed,
        trendLabel: `${analytics.metrics.searchFallbackApplied} fallback`,
        trendDirection: 'neutral',
      },
    ];
    trend = mockAdminTrend.map((item, index) => ({
      ...item,
      value: Math.max(8, Math.round((analytics.metrics.searchPerformed / 120) * (index + 1))),
    }));
    source = 'api';
  } catch {
    source = isMockModeEnabled ? 'mock' : 'mock';
  }

  const maxTrendValue = Math.max(...trend.map((item) => item.value), 1);

  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={source === 'api' ? 'success' : 'warning'}>
              KPI source: {source === 'api' ? 'API' : 'MOCK'}
            </Badge>
            <Badge variant="outline">RBAC UI</Badge>
          </div>
          <CardTitle>Dashboard admin</CardTitle>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]" key={kpi.id}>
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                {kpi.label}
              </p>
              <CardTitle className="text-3xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[var(--color-text-muted)]">
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full ${trendColor[kpi.trendDirection]}`}
              />
              {kpi.trendLabel}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle>Trend ultimi 7 giorni</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-7">
          {trend.map((item) => (
            <div
              className="flex min-h-28 flex-col justify-end rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2"
              key={item.id}
            >
              <div
                className="rounded-md bg-[var(--color-primary)]"
                style={{ height: `${Math.max(10, (item.value / maxTrendValue) * 100)}px` }}
              />
              <p className="mt-2 text-xs font-medium text-[var(--color-text)]">{item.label}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
          href="/admin/moderazione"
        >
          Apri moderazione
        </Link>
        <Link
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
          href="/admin/utenti"
        >
          Gestione utenti
        </Link>
        <Link
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
          href="/admin/segnalazioni"
        >
          Segnalazioni
        </Link>
        <Link
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
          href="/admin/audit-log"
        >
          Audit log
        </Link>
      </div>
    </main>
  );
}
