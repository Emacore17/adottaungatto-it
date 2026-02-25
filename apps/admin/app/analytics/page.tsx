import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { fetchAdminAnalyticsKpis } from '../../lib/analytics';
import { requireAdminRole } from '../../lib/auth';

interface AnalyticsPageProps {
  searchParams?: Promise<{
    windowDays?: string | string[];
  }>;
}

const rangeOptions = [
  {
    value: 7,
    label: '7 giorni',
    description: 'Trend operativo breve',
  },
  {
    value: 30,
    label: '30 giorni',
    description: 'Baseline mensile',
  },
  {
    value: 90,
    label: '90 giorni',
    description: 'Stagionalita breve',
  },
  {
    value: 180,
    label: '180 giorni',
    description: 'Trend semestrale',
  },
] as const;

const getFirstParamValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const parseWindowDays = (rawValue: string | undefined): number => {
  if (!rawValue) {
    return 30;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return rangeOptions.some((option) => option.value === parsed) ? parsed : 30;
};

const formatDateTime = (rawDate: string): string => {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const session = await requireAdminRole('/analytics');
  const resolvedSearchParams = await searchParams;
  const selectedWindowDays = parseWindowDays(getFirstParamValue(resolvedSearchParams?.windowDays));

  let kpisError: string | null = null;
  let kpis = null as Awaited<ReturnType<typeof fetchAdminAnalyticsKpis>> | null;

  try {
    kpis = await fetchAdminAnalyticsKpis(selectedWindowDays);
  } catch {
    kpisError =
      'Impossibile caricare i KPI analytics. Verifica API/DB locale e riprova tra pochi istanti.';
  }

  const createdCount = kpis?.funnel.listingCreated ?? 0;
  const publishedCount = kpis?.funnel.listingPublished ?? 0;
  const contactSentCount = kpis?.funnel.contactSent ?? 0;

  const publishedStepPct =
    createdCount > 0 ? clampPercent((publishedCount / createdCount) * 100) : 0;
  const contactsStepPct =
    createdCount > 0 ? clampPercent((contactSentCount / createdCount) * 100) : 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Card className="border-slate-300/70 bg-white/95">
        <CardHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="success">M5.4</Badge>
            <Badge variant="outline">admin analytics</Badge>
            {kpis ? <Badge variant="outline">window {kpis.windowDays} giorni</Badge> : null}
          </div>
          <CardTitle>KPI analytics</CardTitle>
          <CardDescription>
            Vista operativa con range tempo, moderazione e funnel conversione annunci.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                User ID
              </p>
              <p className="font-mono text-xs text-slate-800">{session.user.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="font-mono text-xs text-slate-800">{session.user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ruoli</p>
              <p className="font-mono text-xs text-slate-800">{session.user.roles.join(', ')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Intervallo
              </p>
              <p className="text-xs text-slate-800">
                {kpis ? `${formatDateTime(kpis.from)} - ${formatDateTime(kpis.to)}` : '-'}
              </p>
            </div>
          </div>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Range tempo</p>
              <p className="text-xs text-slate-500">Filtra KPI e funnel</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {rangeOptions.map((option) => {
                const isActive = option.value === selectedWindowDays;

                return (
                  <a
                    className={[
                      'rounded-lg border px-3 py-3 transition-colors',
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
                    ].join(' ')}
                    href={`/analytics?windowDays=${option.value}`}
                    key={option.value}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-600">{option.description}</p>
                  </a>
                );
              })}
            </div>
          </section>

          {kpisError ? (
            <div className="space-y-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <p>{kpisError}</p>
              <a
                className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400 bg-white px-3 text-xs font-medium text-rose-800 transition-colors hover:bg-rose-100"
                href={`/analytics?windowDays=${selectedWindowDays}`}
              >
                Riprova ora
              </a>
            </div>
          ) : null}

          {kpis ? (
            <section className="space-y-5">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Metriche principali
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-slate-300/80 bg-white/95 shadow-sm">
                    <CardHeader>
                      <CardDescription>Listing view</CardDescription>
                      <CardTitle className="text-2xl">{kpis.metrics.listingView}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-slate-300/80 bg-white/95 shadow-sm">
                    <CardHeader>
                      <CardDescription>Search performed</CardDescription>
                      <CardTitle className="text-2xl">{kpis.metrics.searchPerformed}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-slate-300/80 bg-white/95 shadow-sm">
                    <CardHeader>
                      <CardDescription>Fallback rate</CardDescription>
                      <CardTitle className="text-2xl">
                        {formatPercent(kpis.derived.fallbackRatePct)}
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        {kpis.metrics.searchFallbackApplied} fallback su{' '}
                        {kpis.metrics.searchPerformed} ricerche
                      </p>
                    </CardHeader>
                  </Card>
                  <Card className="border-slate-300/80 bg-white/95 shadow-sm">
                    <CardHeader>
                      <CardDescription>Contact clicked / sent</CardDescription>
                      <CardTitle className="text-2xl">
                        {kpis.metrics.contactClicked} / {kpis.metrics.contactSent}
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        click -&gt; invio {formatPercent(kpis.funnel.contactClickToSendRatePct)}
                      </p>
                    </CardHeader>
                  </Card>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Moderazione
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-amber-300/80 bg-amber-50/70 shadow-sm">
                    <CardHeader>
                      <CardDescription>Pending review</CardDescription>
                      <CardTitle className="text-2xl">{kpis.moderation.pendingReview}</CardTitle>
                      <p className="text-xs text-amber-800">Snapshot coda attuale</p>
                    </CardHeader>
                  </Card>
                  <Card className="border-emerald-300/80 bg-emerald-50/70 shadow-sm">
                    <CardHeader>
                      <CardDescription>Approvati nel range</CardDescription>
                      <CardTitle className="text-2xl">{kpis.moderation.approved}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-rose-300/80 bg-rose-50/70 shadow-sm">
                    <CardHeader>
                      <CardDescription>Rifiutati nel range</CardDescription>
                      <CardTitle className="text-2xl">{kpis.moderation.rejected}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Funnel annunci
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-slate-300/80 bg-white/95 shadow-sm">
                    <CardHeader>
                      <CardDescription>Creati</CardDescription>
                      <CardTitle className="text-2xl">{kpis.funnel.listingCreated}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-slate-300/80 bg-white/95 shadow-sm">
                    <CardHeader>
                      <CardDescription>Pubblicati</CardDescription>
                      <CardTitle className="text-2xl">{kpis.funnel.listingPublished}</CardTitle>
                      <p className="text-xs text-slate-500">
                        publish rate {formatPercent(kpis.funnel.publishRatePct)}
                      </p>
                    </CardHeader>
                  </Card>
                  <Card className="border-slate-300/80 bg-white/95 shadow-sm">
                    <CardHeader>
                      <CardDescription>Contatti inviati</CardDescription>
                      <CardTitle className="text-2xl">{kpis.funnel.contactSent}</CardTitle>
                      <p className="text-xs text-slate-500">
                        da pubblicati {formatPercent(kpis.funnel.contactFromPublishedRatePct)}
                      </p>
                    </CardHeader>
                  </Card>
                  <Card className="border-slate-300/80 bg-white/95 shadow-sm">
                    <CardHeader>
                      <CardDescription>Contact conversion</CardDescription>
                      <CardTitle className="text-2xl">
                        {formatPercent(kpis.derived.contactRatePct)}
                      </CardTitle>
                      <p className="text-xs text-slate-500">contatti inviati su listing view</p>
                    </CardHeader>
                  </Card>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Percorso creato -&gt; pubblicato -&gt; contatto
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Creati</span>
                        <span>{createdCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-slate-800" style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Pubblicati</span>
                        <span>{publishedCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-emerald-600"
                          style={{ width: `${publishedStepPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Contatti</span>
                        <span>{contactSentCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${contactsStepPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </section>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto"
              href="/moderation"
            >
              Vai a moderazione
            </a>
            <a
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto"
              href={`/analytics?windowDays=${selectedWindowDays}`}
            >
              Aggiorna KPI
            </a>
            <form action="/api/auth/logout" method="post">
              <Button className="w-full sm:w-auto" type="submit" variant="secondary">
                Logout
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
