import { loadWebEnv } from '@adottaungatto/config';
import { NO_BREED_FILTER, type SearchSort } from '@adottaungatto/types';
import { Badge, Card, CardDescription, CardHeader, CardTitle } from '@adottaungatto/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import { LinkButton } from '../../components/link-button';
import { ListingsPagination } from '../../components/listings-pagination';
import {
  ListingsFiltersSidebar,
  ListingsResultsToolbar,
} from '../../components/listings-search-controls';
import { SectionReveal } from '../../components/motion/section-reveal';
import { PublicListingsList } from '../../components/public-listings-list';
import { type ListingsFilterValues, buildListingsHref } from '../../features/search/listings-query';
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

const parseNullableBoolean = (value: string | string[] | undefined): boolean | null => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (['true', '1', 'yes', 'si'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }

  return null;
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
  const isSterilized = parseNullableBoolean(params?.isSterilized);
  const isVaccinated = parseNullableBoolean(params?.isVaccinated);
  const hasMicrochip = parseNullableBoolean(params?.hasMicrochip);
  const compatibleWithChildren = parseNullableBoolean(params?.compatibleWithChildren);
  const compatibleWithOtherAnimals = parseNullableBoolean(params?.compatibleWithOtherAnimals);
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
  const listingType =
    normalizeOptionalString(params?.listingType) ?? normalizeOptionalString(params?.tipo) ?? '';

  const filters: ListingsFilterValues = {
    q: normalizeOptionalString(params?.q) ?? '',
    listingType,
    sex: normalizeOptionalString(params?.sex) ?? '',
    breed: normalizeOptionalString(params?.breed) ?? '',
    isSterilized,
    isVaccinated,
    hasMicrochip,
    compatibleWithChildren,
    compatibleWithOtherAnimals,
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
      isSterilized: filters.isSterilized,
      isVaccinated: filters.isVaccinated,
      hasMicrochip: filters.hasMicrochip,
      compatibleWithChildren: filters.compatibleWithChildren,
      compatibleWithOtherAnimals: filters.compatibleWithOtherAnimals,
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

const buildPaginationHrefFromSearchParams = (
  params: Record<string, string | string[] | undefined> | undefined,
  targetPage: number,
) => {
  const nextParams = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (key === 'page') {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            nextParams.append(key, item);
          }
        }
        continue;
      }

      if (typeof value === 'string') {
        nextParams.set(key, value);
      }
    }
  }

  if (targetPage > 1) {
    nextParams.set('page', String(targetPage));
  }

  const queryString = nextParams.toString();
  return queryString ? `/annunci?${queryString}` : '/annunci';
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
  if (filters.isSterilized !== null) return true;
  if (filters.isVaccinated !== null) return true;
  if (filters.hasMicrochip !== null) return true;
  if (filters.compatibleWithChildren !== null) return true;
  if (filters.compatibleWithOtherAnimals !== null) return true;
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

  if (filters.isSterilized !== null) {
    labels.push(`Sterilizzato: ${filters.isSterilized ? 'Si' : 'No'}`);
  }

  if (filters.isVaccinated !== null) {
    labels.push(`Vaccinato: ${filters.isVaccinated ? 'Si' : 'No'}`);
  }

  if (filters.hasMicrochip !== null) {
    labels.push(`Microchip: ${filters.hasMicrochip ? 'Si' : 'No'}`);
  }

  if (filters.compatibleWithChildren !== null) {
    labels.push(`Compatibile con bambini: ${filters.compatibleWithChildren ? 'Si' : 'No'}`);
  }

  if (filters.compatibleWithOtherAnimals !== null) {
    labels.push(
      `Compatibile con altri animali: ${filters.compatibleWithOtherAnimals ? 'Si' : 'No'}`,
    );
  }

  const ageLabel = buildAgeFilterLabel(filters);
  if (ageLabel) {
    labels.push(`Età: ${ageLabel}`);
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
    labels.push(`Località: ${filters.locationLabel}`);
  }

  return labels;
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
    return `Scopri gli annunci di gatti disponibili in ${filters.locationLabel}, con filtri per razza, sesso, età e prezzo.`;
  }

  return 'Sfoglia annunci di gatti in adozione, stallo e segnalazione in tutta Italia con filtri per località, età, prezzo e preferenze.';
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

  if (page > totalPages) {
    redirect(buildPaginationHrefFromSearchParams(resolvedSearchParams, totalPages));
  }

  const activeFilterLabels = buildActiveFilterLabels(filters);
  const pageTitle = buildPageTitle(filters);
  const pageDescription = buildPageDescription(filters);
  const currentListingsHref = buildListingsHref(filters, { page });
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDescription,
    url: new URL(currentListingsHref, env.NEXT_PUBLIC_WEB_URL).toString(),
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
        <section className="overflow-hidden rounded-[32px] border border-[color:color-mix(in_srgb,var(--color-border)_82%,white_18%)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-primary)_12%,transparent)_0%,transparent_46%),linear-gradient(180deg,color-mix(in_srgb,var(--color-surface-overlay-strong)_90%,white_10%)_0%,color-mix(in_srgb,var(--color-surface-elevated)_94%,white_6%)_100%)] px-5 py-5 shadow-[0_22px_58px_rgb(66_40_49_/_0.08)] sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
            </div>
          </div>
        </section>
      </SectionReveal>

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
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
              <div className="rounded-[24px] border border-[color:color-mix(in_srgb,var(--color-border)_82%,white_18%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_84%,white_16%)] px-4 py-4 shadow-[0_16px_40px_rgb(66_40_49_/_0.06)] sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      Filtri attivi
                    </p>
                    <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                      {activeFilterLabels.length === 1
                        ? 'Hai applicato 1 filtro. Azzera o aggiorna i criteri per ampliare il catalogo.'
                        : `Hai applicato ${activeFilterLabels.length} filtri. Azzera o aggiorna i criteri per ampliare il catalogo.`}
                    </p>
                  </div>
                  <LinkButton href="/annunci" variant="secondary">
                    Azzera filtri
                  </LinkButton>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {activeFilterLabels.map((label) => (
                    <Badge key={label} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </SectionReveal>
          ) : null}

          <SectionReveal delay={0.08}>
            {searchResult.items.length > 0 ? (
              <PublicListingsList
                backToListingsHref={currentListingsHref}
                listings={searchResult.items}
              />
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
              buildPageHref={(targetPage) =>
                buildPaginationHrefFromSearchParams(resolvedSearchParams, targetPage)
              }
              currentPage={page}
              totalPages={totalPages}
            />
          </SectionReveal>
        </div>
      </div>
    </div>
  );
}
