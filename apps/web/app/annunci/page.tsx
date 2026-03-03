import { loadWebEnv } from '@adottaungatto/config';
import { NO_BREED_FILTER, type SearchSort } from '@adottaungatto/types';
import { Badge, Card, CardDescription, CardHeader, CardTitle } from '@adottaungatto/ui';
import type { Metadata } from 'next';
import Script from 'next/script';
import { LinkButton } from '../../components/link-button';
import { ListingsPagination } from '../../components/listings-pagination';
import {
  type ListingsFilterValues,
  ListingsFiltersSidebar,
  ListingsResultsToolbar,
} from '../../components/listings-search-controls';
import { SectionReveal } from '../../components/motion/section-reveal';
import { PublicListingsList } from '../../components/public-listings-list';
import {
  type PublicListingsSearchOptions,
  searchPublicListingsWithMetadata,
} from '../../lib/listings';

const env = loadWebEnv();
const listingsPerPage = 12;

interface ListingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

interface ParsedListingsPageState {
  filters: ListingsFilterValues;
  page: number;
  searchOptions: PublicListingsSearchOptions;
}

const searchSortValues = new Set<SearchSort>(['relevance', 'newest', 'price_asc', 'price_desc']);
const locationScopeValues = new Set([
  'italy',
  'region',
  'province',
  'comune',
  'comune_plus_province',
]);

const getFirstValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const normalizeOptionalString = (value: string | string[] | undefined) => {
  const firstValue = getFirstValue(value);
  if (typeof firstValue !== 'string') {
    return null;
  }

  const normalized = firstValue.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseNonNegativeNumber = (value: string | string[] | undefined): number | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const parseNonNegativeInteger = (value: string | string[] | undefined): number | null => {
  const parsed = parseNonNegativeNumber(value);
  if (parsed === null) {
    return null;
  }

  return Math.trunc(parsed);
};

const parseBoundedNumber = (
  value: string | string[] | undefined,
  minValue: number,
  maxValue: number,
) => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < minValue || parsed > maxValue) {
    return null;
  }

  return parsed;
};

const parsePositivePage = (value: string | string[] | undefined) => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return 1;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseLocationScope = (value: string | string[] | undefined) => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized && locationScopeValues.has(normalized)) {
    return normalized as NonNullable<PublicListingsSearchOptions['locationScope']>;
  }

  return null;
};

const parseListingsPageState = (
  params: Record<string, string | string[] | undefined> | undefined,
): ParsedListingsPageState => {
  const page = parsePositivePage(params?.page);
  const priceMin = parseNonNegativeNumber(params?.priceMin);
  const priceMax = parseNonNegativeNumber(params?.priceMax);
  const ageMinMonths = parseNonNegativeInteger(params?.ageMinMonths);
  const ageMaxMonths = parseNonNegativeInteger(params?.ageMaxMonths);
  const referenceLat = parseBoundedNumber(params?.referenceLat, -90, 90);
  const referenceLon = parseBoundedNumber(params?.referenceLon, -180, 180);
  const [effectivePriceMin, effectivePriceMax] =
    priceMin !== null && priceMax !== null && priceMin > priceMax
      ? [priceMax, priceMin]
      : [priceMin, priceMax];
  const [effectiveAgeMinMonths, effectiveAgeMaxMonths] =
    ageMinMonths !== null && ageMaxMonths !== null && ageMinMonths > ageMaxMonths
      ? [ageMaxMonths, ageMinMonths]
      : [ageMinMonths, ageMaxMonths];
  const [effectiveReferenceLat, effectiveReferenceLon] =
    referenceLat !== null && referenceLon !== null ? [referenceLat, referenceLon] : [null, null];
  const defaultSort: SearchSort =
    effectiveReferenceLat !== null && effectiveReferenceLon !== null ? 'relevance' : 'newest';
  const sortCandidate = normalizeOptionalString(params?.sort)?.toLowerCase();
  const sort =
    sortCandidate && searchSortValues.has(sortCandidate as SearchSort)
      ? (sortCandidate as SearchSort)
      : defaultSort;

  const filters: ListingsFilterValues = {
    q: normalizeOptionalString(params?.q) ?? '',
    listingType: normalizeOptionalString(params?.listingType) ?? '',
    sex: normalizeOptionalString(params?.sex) ?? '',
    breed: normalizeOptionalString(params?.breed) ?? '',
    ageMinMonths: effectiveAgeMinMonths,
    ageMaxMonths: effectiveAgeMaxMonths,
    priceMin: effectivePriceMin,
    priceMax: effectivePriceMax,
    sort,
    locationScope: parseLocationScope(params?.locationScope),
    regionId: normalizeOptionalString(params?.regionId),
    provinceId: normalizeOptionalString(params?.provinceId),
    comuneId: normalizeOptionalString(params?.comuneId),
    locationLabel: normalizeOptionalString(params?.locationLabel),
    locationSecondaryLabel: normalizeOptionalString(params?.locationSecondaryLabel),
    locationQuery: normalizeOptionalString(params?.locationLabel) ?? '',
    referenceLat: effectiveReferenceLat,
    referenceLon: effectiveReferenceLon,
  };

  return {
    filters,
    page,
    searchOptions: {
      q: filters.q || null,
      listingType: filters.listingType || null,
      sex: filters.sex || null,
      breed: filters.breed || null,
      ageMinMonths: filters.ageMinMonths,
      ageMaxMonths: filters.ageMaxMonths,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      sort: filters.sort,
      locationScope: filters.locationScope,
      regionId: filters.regionId,
      provinceId: filters.provinceId,
      comuneId: filters.comuneId,
      locationLabel: filters.locationLabel,
      locationSecondaryLabel: filters.locationSecondaryLabel,
      referenceLat: filters.referenceLat,
      referenceLon: filters.referenceLon,
    },
  };
};

const formatAgeMonthsLabel = (value: number) => {
  if (value % 12 === 0) {
    const years = value / 12;
    return `${years} ${years === 1 ? 'anno' : 'anni'}`;
  }

  return `${value} ${value === 1 ? 'mese' : 'mesi'}`;
};

const buildAgeFilterLabel = (filters: ListingsFilterValues) => {
  if (filters.ageMinMonths !== null && filters.ageMaxMonths !== null) {
    return `${formatAgeMonthsLabel(filters.ageMinMonths)} - ${formatAgeMonthsLabel(filters.ageMaxMonths)}`;
  }

  if (filters.ageMinMonths !== null) {
    return `Da ${formatAgeMonthsLabel(filters.ageMinMonths)}`;
  }

  if (filters.ageMaxMonths !== null) {
    return `Fino a ${formatAgeMonthsLabel(filters.ageMaxMonths)}`;
  }

  return null;
};

const hasIndexBlockingFilters = (filters: ListingsFilterValues) => {
  if (filters.q.trim()) return true;
  if (filters.listingType) return true;
  if (filters.sex) return true;
  if (filters.breed) return true;
  if (filters.ageMinMonths !== null || filters.ageMaxMonths !== null) return true;
  if (filters.priceMin !== null || filters.priceMax !== null) return true;
  if (filters.locationScope || filters.regionId || filters.provinceId || filters.comuneId)
    return true;
  if (filters.referenceLat !== null || filters.referenceLon !== null) return true;
  if (filters.locationLabel) return true;
  if (filters.sort !== 'newest') return true;

  return false;
};

const buildActiveFilterLabels = (filters: ListingsFilterValues) => {
  const labels: string[] = [];

  if (filters.q.trim()) {
    labels.push(`Testo: ${filters.q.trim()}`);
  }

  if (filters.listingType) {
    labels.push(`Tipo: ${filters.listingType}`);
  }

  if (filters.sex) {
    labels.push(`Sesso: ${filters.sex}`);
  }

  if (filters.breed === NO_BREED_FILTER) {
    labels.push('Razza: Non di razza');
  } else if (filters.breed) {
    labels.push(`Razza: ${filters.breed}`);
  }

  const ageLabel = buildAgeFilterLabel(filters);
  if (ageLabel) {
    labels.push(`Eta: ${ageLabel}`);
  }

  if (filters.priceMin !== null) {
    labels.push(`Prezzo da EUR ${filters.priceMin}`);
  }

  if (filters.priceMax !== null) {
    labels.push(`Prezzo fino a EUR ${filters.priceMax}`);
  }

  if (filters.referenceLat !== null && filters.referenceLon !== null) {
    labels.push('Vicino a te');
  } else if (filters.locationLabel) {
    labels.push(`Localita: ${filters.locationLabel}`);
  }

  return labels;
};

const buildListingsHref = (filters: ListingsFilterValues, page = 1) => {
  const params = new URLSearchParams();

  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.listingType) params.set('listingType', filters.listingType);
  if (filters.sex) params.set('sex', filters.sex);
  if (filters.breed) params.set('breed', filters.breed);
  if (filters.ageMinMonths !== null) params.set('ageMinMonths', String(filters.ageMinMonths));
  if (filters.ageMaxMonths !== null) params.set('ageMaxMonths', String(filters.ageMaxMonths));
  if (filters.priceMin !== null) params.set('priceMin', String(filters.priceMin));
  if (filters.priceMax !== null) params.set('priceMax', String(filters.priceMax));
  if (filters.locationScope) params.set('locationScope', filters.locationScope);
  if (filters.regionId) params.set('regionId', filters.regionId);
  if (filters.provinceId) params.set('provinceId', filters.provinceId);
  if (filters.comuneId) params.set('comuneId', filters.comuneId);
  if (filters.locationLabel) params.set('locationLabel', filters.locationLabel);
  if (filters.locationSecondaryLabel)
    params.set('locationSecondaryLabel', filters.locationSecondaryLabel);
  if (filters.referenceLat !== null && filters.referenceLon !== null) {
    params.set('referenceLat', String(filters.referenceLat));
    params.set('referenceLon', String(filters.referenceLon));
  }
  if (
    filters.sort !== 'newest' ||
    (filters.referenceLat !== null && filters.referenceLon !== null)
  ) {
    params.set('sort', filters.sort);
  }
  if (page > 1) params.set('page', String(page));

  const queryString = params.toString();
  return queryString ? `/annunci?${queryString}` : '/annunci';
};

const buildPageTitle = (filters: ListingsFilterValues) => {
  if (filters.referenceLat !== null && filters.referenceLon !== null) {
    return 'Annunci di gatti vicino a te';
  }

  if (filters.locationLabel) {
    return `Annunci gatti a ${filters.locationLabel}`;
  }

  return 'Annunci gatti da tutta Italia';
};

const buildPageDescription = (filters: ListingsFilterValues) => {
  if (filters.referenceLat !== null && filters.referenceLon !== null) {
    return 'Consulta gli annunci ordinati per distanza dalla tua posizione, con filtri completi e card ottimizzate per confronto rapido.';
  }

  if (filters.locationLabel) {
    return `Scopri gli annunci di gatti disponibili in ${filters.locationLabel}, con filtri per razza, sesso, eta e prezzo.`;
  }

  return 'Sfoglia annunci di gatti in adozione, stallo e segnalazione in tutta Italia con filtri per localita, eta, prezzo e preferenze.';
};

export async function generateMetadata({ searchParams }: ListingsPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const { filters, page } = parseListingsPageState(resolvedSearchParams);
  const title = buildPageTitle(filters);
  const description = buildPageDescription(filters);
  const shouldIndex = !hasIndexBlockingFilters(filters);
  const canonicalUrl = new URL('/annunci', env.NEXT_PUBLIC_WEB_URL);
  if (shouldIndex && page > 1) {
    canonicalUrl.searchParams.set('page', String(page));
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl.toString(),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl.toString(),
      type: 'website',
    },
    robots: shouldIndex ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { filters, page, searchOptions } = parseListingsPageState(resolvedSearchParams);
  const offset = (page - 1) * listingsPerPage;
  const searchResult = await searchPublicListingsWithMetadata({
    ...searchOptions,
    limit: listingsPerPage,
    offset,
  }).catch(() => ({
    items: [],
    pagination: {
      limit: listingsPerPage,
      offset,
      total: 0,
      hasMore: false,
    },
    metadata: null,
  }));

  const totalCount = searchResult.pagination?.total ?? searchResult.items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / listingsPerPage));
  const activeFilterLabels = buildActiveFilterLabels(filters);
  const pageTitle = buildPageTitle(filters);
  const pageDescription = buildPageDescription(filters);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDescription,
    url: new URL(buildListingsHref(filters, page), env.NEXT_PUBLIC_WEB_URL).toString(),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: searchResult.items.length,
      itemListElement: searchResult.items.map((listing, index) => ({
        '@type': 'ListItem',
        position: offset + index + 1,
        url: new URL(`/annunci/${listing.id}`, env.NEXT_PUBLIC_WEB_URL).toString(),
        name: listing.title,
      })),
    },
  };

  return (
    <div className="space-y-8 pb-8">
      <Script id="annunci-list-jsonld" strategy="beforeInteractive" type="application/ld+json">
        {JSON.stringify(structuredData)}
      </Script>

      <SectionReveal>
        <section className="overflow-hidden rounded-[36px] border border-[color:color-mix(in_srgb,var(--color-border)_82%,white_18%)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-primary)_12%,transparent)_0%,transparent_46%),linear-gradient(180deg,color-mix(in_srgb,var(--color-surface-overlay-strong)_90%,white_10%)_0%,color-mix(in_srgb,var(--color-surface-elevated)_94%,white_6%)_100%)] px-5 py-6 shadow-[0_24px_70px_rgb(66_40_49_/_0.08)] sm:px-7 sm:py-8 lg:px-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge className="w-fit" variant="secondary">
                Catalogo annunci
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text)] sm:text-4xl">
                  {pageTitle}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-[var(--color-text-muted)] sm:text-[1rem]">
                  {pageDescription}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {new Intl.NumberFormat('it-IT').format(totalCount)} annunci
                </Badge>
                {searchResult.metadata?.fallbackApplied ? (
                  <Badge variant="warning">Area ampliata automaticamente</Badge>
                ) : null}
                {filters.referenceLat !== null && filters.referenceLon !== null ? (
                  <Badge variant="outline">Posizione attiva</Badge>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <LinkButton href="/pubblica" variant="outline">
                Pubblica annuncio
              </LinkButton>
              {activeFilterLabels.length > 0 ? (
                <LinkButton href="/annunci" variant="secondary">
                  Rimuovi filtri
                </LinkButton>
              ) : null}
            </div>
          </div>
        </section>
      </SectionReveal>

      <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[380px_minmax(0,1fr)]">
        <ListingsFiltersSidebar initialValues={filters} />

        <div className="space-y-6">
          <ListingsResultsToolbar
            initialValues={filters}
            page={page}
            resultsCount={searchResult.items.length}
            totalCount={totalCount}
            totalPages={totalPages}
          />

          {activeFilterLabels.length > 0 ? (
            <SectionReveal delay={0.04}>
              <div className="flex flex-wrap gap-2">
                {activeFilterLabels.map((label) => (
                  <Badge key={label} variant="outline">
                    {label}
                  </Badge>
                ))}
              </div>
            </SectionReveal>
          ) : null}

          <SectionReveal delay={0.08}>
            {searchResult.items.length > 0 ? (
              <PublicListingsList listings={searchResult.items} />
            ) : (
              <Card>
                <CardHeader className="space-y-4">
                  <div className="space-y-2">
                    <CardTitle>Nessun annuncio trovato con i filtri correnti.</CardTitle>
                    <CardDescription>
                      Prova ad allargare la ricerca oppure rimuovi i filtri per vedere tutto il
                      catalogo disponibile.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <LinkButton href="/annunci" variant="secondary">
                      Vedi tutti gli annunci
                    </LinkButton>
                    <LinkButton href="/pubblica" variant="outline">
                      Pubblica annuncio
                    </LinkButton>
                  </div>
                </CardHeader>
              </Card>
            )}
          </SectionReveal>

          <SectionReveal delay={0.12}>
            <ListingsPagination
              buildPageHref={(targetPage) => buildListingsHref(filters, targetPage)}
              currentPage={page}
              totalPages={totalPages}
            />
          </SectionReveal>
        </div>
      </div>
    </div>
  );
}
