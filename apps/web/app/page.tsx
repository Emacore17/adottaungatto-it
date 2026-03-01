import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { LinkButton } from '../components/link-button';
import { PageShell } from '../components/page-shell';
import { PublicListingsGrid } from '../components/public-listings-grid';
import { type PublicListingSummary, fetchPublicListings } from '../lib/listings';

type HomeSort = 'latest' | 'price_asc' | 'price_desc';
type HomeView = 'map' | 'card';

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

interface HomeSectionFiltersProps {
  params: Record<string, string | string[] | undefined> | undefined;
  sortKey: 'featuredSort' | 'allSort';
  viewKey: 'featuredView' | 'allView';
  currentSort: HomeSort;
  currentView: HomeView;
}

const homeSortValues = new Set<HomeSort>(['latest', 'price_asc', 'price_desc']);
const homeViewValues = new Set<HomeView>(['map', 'card']);
const homeSortOptions: ReadonlyArray<{ value: HomeSort; label: string }> = [
  { value: 'latest', label: 'Latest' },
  { value: 'price_asc', label: 'Prezzo crescente' },
  { value: 'price_desc', label: 'Prezzo decrescente' },
];

const baseFilterButtonClassName =
  'inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]';
const activeFilterButtonClassName =
  'border-[var(--color-primary)] bg-[var(--color-surface-muted)] text-[var(--color-text)]';

const getFirstValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const parseHomeSort = (value: string | string[] | undefined): HomeSort => {
  const normalized = getFirstValue(value)?.trim().toLowerCase();
  if (normalized && homeSortValues.has(normalized as HomeSort)) {
    return normalized as HomeSort;
  }

  return 'latest';
};

const parseHomeView = (value: string | string[] | undefined): HomeView => {
  const normalized = getFirstValue(value)?.trim().toLowerCase();
  if (normalized && homeViewValues.has(normalized as HomeView)) {
    return normalized as HomeView;
  }

  return 'card';
};

const parseListingTimestamp = (listing: PublicListingSummary) => {
  const value = new Date(listing.publishedAt ?? listing.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
};

const parseListingPrice = (priceAmount: string | null): number | null => {
  if (priceAmount === null) {
    return null;
  }

  const parsedValue = Number.parseFloat(priceAmount);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const sortListings = (listings: PublicListingSummary[], sort: HomeSort): PublicListingSummary[] => {
  const sorted = [...listings];

  sorted.sort((a, b) => {
    if (sort === 'latest') {
      return parseListingTimestamp(b) - parseListingTimestamp(a);
    }

    const aPrice = parseListingPrice(a.priceAmount);
    const bPrice = parseListingPrice(b.priceAmount);

    if (aPrice === null && bPrice === null) {
      return parseListingTimestamp(b) - parseListingTimestamp(a);
    }

    if (aPrice === null) {
      return 1;
    }

    if (bPrice === null) {
      return -1;
    }

    if (aPrice !== bPrice) {
      return sort === 'price_asc' ? aPrice - bPrice : bPrice - aPrice;
    }

    return parseListingTimestamp(b) - parseListingTimestamp(a);
  });

  return sorted;
};

const buildHomeHref = (
  params: Record<string, string | string[] | undefined> | undefined,
  updates: Record<string, string>,
) => {
  const nextQuery = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      const firstValue = getFirstValue(value);
      if (firstValue) {
        nextQuery.set(key, firstValue);
      }
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    nextQuery.set(key, value);
  }

  const queryString = nextQuery.toString();
  return queryString ? `/?${queryString}` : '/';
};

const sortLabel = (sort: HomeSort) => {
  return homeSortOptions.find((option) => option.value === sort)?.label ?? 'Latest';
};

function HomeSectionFilters({
  params,
  sortKey,
  viewKey,
  currentSort,
  currentView,
}: HomeSectionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <details className="group relative">
        <summary
          className={`${baseFilterButtonClassName} ${activeFilterButtonClassName} list-none cursor-pointer [&::-webkit-details-marker]:hidden`}
        >
          <svg
            aria-hidden="true"
            fill="none"
            focusable="false"
            height="16"
            viewBox="0 0 24 24"
            width="16"
          >
            <path
              d="M4 7h16M4 12h10M4 17h7"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
          {sortLabel(currentSort)}
          <svg
            aria-hidden="true"
            className="transition-transform group-open:rotate-180"
            fill="none"
            focusable="false"
            height="14"
            viewBox="0 0 24 24"
            width="14"
          >
            <path
              d="m7 10 5 5 5-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </summary>

        <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[220px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)] p-1 shadow-[var(--shadow-sm)] backdrop-blur-xl">
          {homeSortOptions.map((option) => (
            <Link
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] ${
                option.value === currentSort ? 'bg-[var(--color-surface-muted)] font-semibold' : ''
              }`}
              href={buildHomeHref(params, { [sortKey]: option.value })}
              key={`${sortKey}-${option.value}`}
            >
              {option.label}
              {option.value === currentSort ? (
                <svg
                  aria-hidden="true"
                  fill="none"
                  focusable="false"
                  height="14"
                  viewBox="0 0 24 24"
                  width="14"
                >
                  <path
                    d="m5 12 4.2 4.2L19 6.4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              ) : null}
            </Link>
          ))}
        </div>
      </details>

      <Link
        className={`${baseFilterButtonClassName} ${currentView === 'map' ? activeFilterButtonClassName : ''}`}
        href={buildHomeHref(params, { [viewKey]: 'map' })}
      >
        <svg
          aria-hidden="true"
          fill="none"
          focusable="false"
          height="16"
          viewBox="0 0 24 24"
          width="16"
        >
          <path
            d="M3 7.6 8.8 4l6.4 3 5.8-3v12.4L15.2 20l-6.4-3L3 20V7.6Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path d="M8.8 4v13M15.2 7v13" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Map View
      </Link>

      <Link
        className={`${baseFilterButtonClassName} ${currentView === 'card' ? activeFilterButtonClassName : ''}`}
        href={buildHomeHref(params, { [viewKey]: 'card' })}
      >
        <svg
          aria-hidden="true"
          fill="none"
          focusable="false"
          height="16"
          viewBox="0 0 24 24"
          width="16"
        >
          <rect height="15" rx="3" stroke="currentColor" strokeWidth="1.8" width="18" x="3" y="5" />
          <path d="M3 11.5h18" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Card View
      </Link>
    </div>
  );
}

const renderListingsByView = ({
  listings,
  view,
  emptyDescription,
}: {
  listings: PublicListingSummary[];
  view: HomeView;
  emptyDescription: string;
}) => {
  if (view === 'card') {
    return <PublicListingsGrid emptyDescription={emptyDescription} listings={listings} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <PublicListingsGrid emptyDescription={emptyDescription} layout="list" listings={listings} />
      <Card className="h-fit bg-[var(--color-surface-overlay-strong)]">
        <CardHeader>
          <CardTitle>Map View in rebuild</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
          <p>La mappa dedicata verra reintegrata in una fase successiva.</p>
          <p>Nel frattempo questa vista mantiene focus su lettura rapida e confronto annunci.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default async function Page({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const featuredSort = parseHomeSort(resolvedSearchParams?.featuredSort);
  const featuredView = parseHomeView(resolvedSearchParams?.featuredView);
  const allSort = parseHomeSort(resolvedSearchParams?.allSort);
  const allView = parseHomeView(resolvedSearchParams?.allView);

  const listings = await fetchPublicListings({ limit: 24 }).catch(() => []);
  const featuredListings = sortListings(listings, featuredSort).slice(0, 4);
  const allListings = sortListings(listings, allSort);

  return (
    <PageShell
      description="Due aree distinte per esplorare gli annunci: selezione in evidenza e catalogo completo con filtri rapidi."
      eyebrow="Home"
      title="Trova il tuo prossimo gatto."
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <Badge className="w-fit" variant="secondary">
                In evidenza
              </Badge>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Annunci consigliati</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Una selezione rapida dei profili piu rilevanti da cui partire.
                </p>
              </div>
            </div>
            <LinkButton href="/annunci" variant="outline">
              Apri tutti gli annunci
            </LinkButton>
          </div>

          <HomeSectionFilters
            currentSort={featuredSort}
            currentView={featuredView}
            params={resolvedSearchParams}
            sortKey="featuredSort"
            viewKey="featuredView"
          />

          {renderListingsByView({
            listings: featuredListings,
            view: featuredView,
            emptyDescription:
              'Nessun annuncio in evidenza al momento. Riprova tra poco o apri il catalogo completo.',
          })}
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Badge className="w-fit" variant="outline">
              Catalogo completo
            </Badge>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Tutti gli annunci</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Esplora l intero inventario con la stessa base dati pubblica della pagina annunci.
              </p>
            </div>
          </div>

          <HomeSectionFilters
            currentSort={allSort}
            currentView={allView}
            params={resolvedSearchParams}
            sortKey="allSort"
            viewKey="allView"
          />

          {renderListingsByView({
            listings: allListings,
            view: allView,
            emptyDescription:
              'Nessun annuncio pubblico disponibile. Il layer dati resta collegato alla stessa sorgente.',
          })}
        </section>
      </div>
    </PageShell>
  );
}
