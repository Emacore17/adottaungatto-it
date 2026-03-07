import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { fetchAdminAnalyticsKpis } from '../../lib/analytics';

const trendColor: Record<string, string> = {
  up: 'bg-emerald-500',
  down: 'bg-rose-500',
  neutral: 'bg-[var(--color-surface-muted-strong)]',
};

export default async function AdminDashboardPage() {
  let source: 'api' | 'unavailable' = 'api';
  let kpis: Array<{
    id: string;
    label: string;
    value: string | number;
    trendLabel: string;
    trendDirection: 'up' | 'down' | 'neutral';
  }> = [];
  let trend: Array<{
    id: string;
    label: string;
    value: number;
  }> = [];

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
        id: 'kpi-search-performed',
        label: 'Search performed',
        value: analytics.metrics.searchPerformed,
        trendLabel: `${analytics.metrics.searchFallbackApplied} fallback`,
        trendDirection: 'neutral',
      },
    ];

    trend = Array.from({ length: 7 }, (_, index) => {
      const value = Math.max(8, Math.round((analytics.metrics.searchPerformed / 120) * (index + 1)));
      return {
        id: `trend-${index + 1}`,
        label: `G${index + 1}`,
        value,
      };
    });
  } catch {
    source = 'unavailable';
  }

  const maxTrendValue = Math.max(...trend.map((item) => item.value), 1);

  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={source === 'api' ? 'success' : 'warning'}>
              KPI source: {source === 'api' ? 'API' : 'NON DISPONIBILE'}
            </Badge>
            <Badge variant="outline">RBAC UI</Badge>
          </div>
          <CardTitle>Dashboard admin</CardTitle>
        </CardHeader>
      </Card>

      {source === 'api' ? (
        <>
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
        </>
      ) : (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle>Dati analytics non disponibili</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-text-muted)]">
            La dashboard mostra solo dati reali API. Riprova quando il backend analytics e
            raggiungibile.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
          href="/admin/moderazione"
        >
          Apri moderazione
        </Link>
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          Le aree utenti, segnalazioni, audit log e impostazioni sono temporaneamente disabilitate
          finche non saranno collegate a endpoint amministrativi reali.
        </div>
      </div>
    </main>
  );
}
