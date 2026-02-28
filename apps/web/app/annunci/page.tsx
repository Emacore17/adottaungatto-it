import type { SearchSort } from '@adottaungatto/types';
import { Badge } from '@adottaungatto/ui';
import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';
import { PublicListingsGrid } from '../../components/public-listings-grid';
import {
  type PublicListingsSearchOptions,
  fetchPublicListings,
  searchPublicListingsWithMetadata,
} from '../../lib/listings';
import { isMockModeEnabled } from '../../lib/mock-mode';

interface ListingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

const parseSearchSort = (value: string | string[] | undefined): SearchSort => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized && searchSortValues.has(normalized as SearchSort)) {
    return normalized as SearchSort;
  }

  return 'relevance';
};

const parseLocationScope = (
  value: string | string[] | undefined,
): PublicListingsSearchOptions['locationScope'] => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized && locationScopeValues.has(normalized)) {
    return normalized as PublicListingsSearchOptions['locationScope'];
  }

  return null;
};

const parseSearchOptions = (
  params: Record<string, string | string[] | undefined> | undefined,
): PublicListingsSearchOptions => {
  const priceMin = parseNonNegativeNumber(params?.priceMin);
  const priceMax = parseNonNegativeNumber(params?.priceMax);

  const [effectivePriceMin, effectivePriceMax] =
    priceMin !== null && priceMax !== null && priceMin > priceMax
      ? [priceMax, priceMin]
      : [priceMin, priceMax];

  return {
    q: normalizeOptionalString(params?.q),
    listingType: normalizeOptionalString(params?.listingType),
    sex: normalizeOptionalString(params?.sex),
    breed: normalizeOptionalString(params?.breed),
    ageText: normalizeOptionalString(params?.ageText),
    locationScope: parseLocationScope(params?.locationScope),
    regionId: normalizeOptionalString(params?.regionId),
    provinceId: normalizeOptionalString(params?.provinceId),
    comuneId: normalizeOptionalString(params?.comuneId),
    locationLabel: normalizeOptionalString(params?.locationLabel),
    locationSecondaryLabel: normalizeOptionalString(params?.locationSecondaryLabel),
    sort: parseSearchSort(params?.sort),
    priceMin: effectivePriceMin,
    priceMax: effectivePriceMax,
  };
};

const nonWordLocationRegex = /[^a-z0-9\s]/g;
const locationStopwords = new Set([
  'comune',
  'provincia',
  'regione',
  'citta',
  'citt',
  'di',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'e',
]);

const normalizeLocationText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(nonWordLocationRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractLocationTokens = (value: string) =>
  normalizeLocationText(value)
    .split(' ')
    .filter((token) => token.length > 0 && !locationStopwords.has(token));

const filterListingsByLocationLabel = (
  listings: Awaited<ReturnType<typeof fetchPublicListings>>,
  locationLabel: string | null | undefined,
) => {
  const normalizedLabel = normalizeLocationText(locationLabel ?? '');
  if (!normalizedLabel) {
    return listings;
  }

  const tokens = extractLocationTokens(normalizedLabel);
  if (tokens.length === 0) {
    return listings;
  }

  return listings.filter((listing) => {
    const haystackTokens = extractLocationTokens(
      `${listing.comuneName} ${listing.provinceName} ${listing.provinceSigla} ${listing.regionName}`,
    );
    if (haystackTokens.length === 0) {
      return false;
    }

    return tokens.every((token) => {
      if (token.length <= 2) {
        return haystackTokens.some((word) => word === token);
      }

      return haystackTokens.some((word) => word.startsWith(token) || word.includes(token));
    });
  });
};

const hasStructuredLocationIntent = (options: PublicListingsSearchOptions) =>
  Boolean(options.locationScope || options.regionId || options.provinceId || options.comuneId);

const shouldApplyLocationLabelPostFilter = (options: PublicListingsSearchOptions) =>
  Boolean(options.locationLabel) && !hasStructuredLocationIntent(options);

const buildRelaxedSearchVariants = (
  options: PublicListingsSearchOptions,
): PublicListingsSearchOptions[] => {
  const variants: PublicListingsSearchOptions[] = [];
  const seen = new Set<string>();

  const pushVariant = (candidate: PublicListingsSearchOptions) => {
    const key = JSON.stringify({
      q: candidate.q ?? null,
      listingType: candidate.listingType ?? null,
      sex: candidate.sex ?? null,
      breed: candidate.breed ?? null,
      ageText: candidate.ageText ?? null,
      locationScope: candidate.locationScope ?? null,
      regionId: candidate.regionId ?? null,
      provinceId: candidate.provinceId ?? null,
      comuneId: candidate.comuneId ?? null,
      locationLabel: candidate.locationLabel ?? null,
      locationSecondaryLabel: candidate.locationSecondaryLabel ?? null,
      sort: candidate.sort ?? 'relevance',
      priceMin: candidate.priceMin ?? null,
      priceMax: candidate.priceMax ?? null,
    });

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    variants.push(candidate);
  };

  let current = { ...options };

  if (current.ageText) {
    current = { ...current, ageText: null };
    pushVariant(current);
  }

  if (current.breed) {
    current = { ...current, breed: null };
    pushVariant(current);
  }

  if (current.sex) {
    current = { ...current, sex: null };
    pushVariant(current);
  }

  if (current.listingType) {
    current = { ...current, listingType: null };
    pushVariant(current);
  }

  if (current.priceMin !== null || current.priceMax !== null) {
    current = { ...current, priceMin: null, priceMax: null };
    pushVariant(current);
  }

  if (current.q) {
    current = { ...current, q: null };
    pushVariant(current);
  }

  if (current.locationLabel && !hasStructuredLocationIntent(current)) {
    current = { ...current, locationLabel: null, locationSecondaryLabel: null };
    pushVariant(current);
  }

  return variants;
};

const hasActiveSearchFilters = (options: PublicListingsSearchOptions) => {
  if (options.q) return true;
  if (options.listingType) return true;
  if (options.sex) return true;
  if (options.breed) return true;
  if (options.ageText) return true;
  if (options.priceMin !== null && options.priceMin !== undefined) return true;
  if (options.priceMax !== null && options.priceMax !== undefined) return true;
  if (options.locationLabel) return true;
  if (options.locationScope || options.regionId || options.provinceId || options.comuneId) {
    return true;
  }

  return (options.sort ?? 'relevance') !== 'relevance';
};

const sortLabelByValue: Record<SearchSort, string> = {
  relevance: 'Più pertinenti',
  newest: 'Più recenti',
  price_asc: 'Prezzo crescente',
  price_desc: 'Prezzo decrescente',
};

const buildActiveFilterLabels = (options: PublicListingsSearchOptions): string[] => {
  const labels: string[] = [];

  if (options.q) {
    labels.push(`Testo: ${options.q}`);
  }

  if (options.listingType) {
    labels.push(`Tipo: ${options.listingType}`);
  }

  if (options.sex) {
    labels.push(`Sesso: ${options.sex}`);
  }

  if (options.breed) {
    labels.push(`Razza: ${options.breed}`);
  }

  if (options.ageText) {
    labels.push(`Età: ${options.ageText}`);
  }

  if (options.locationLabel) {
    labels.push(`Località: ${options.locationLabel}`);
  }

  if (options.priceMin !== null && options.priceMin !== undefined) {
    labels.push(`Min €${options.priceMin}`);
  }

  if (options.priceMax !== null && options.priceMax !== undefined) {
    labels.push(`Max €${options.priceMax}`);
  }

  if ((options.sort ?? 'relevance') !== 'relevance') {
    labels.push(`Ordine: ${sortLabelByValue[options.sort ?? 'relevance']}`);
  }

  return labels;
};

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const searchOptions = parseSearchOptions(resolvedSearchParams);
  const searchMode = hasActiveSearchFilters(searchOptions);

  let rawListings: Awaited<ReturnType<typeof fetchPublicListings>> = [];
  let resultsExpanded = false;
  let expandedResultsLabel: string | null = null;

  const markExpandedResults = (label: string) => {
    resultsExpanded = true;
    if (!expandedResultsLabel) {
      expandedResultsLabel = label;
    }
  };

  if (searchMode) {
    const initialSearch = await searchPublicListingsWithMetadata({
      ...searchOptions,
      limit: 12,
      offset: 0,
    }).catch(() => ({
      items: [] as Awaited<ReturnType<typeof fetchPublicListings>>,
      metadata: null,
    }));

    rawListings = initialSearch.items;
    if (initialSearch.metadata?.fallbackApplied) {
      markExpandedResults('Risultati ampliati località');
    }
  } else {
    rawListings = await fetchPublicListings({ limit: 12 }).catch(() => []);
  }

  if (searchMode && rawListings.length === 0) {
    const relaxedVariants = buildRelaxedSearchVariants(searchOptions);
    for (const variant of relaxedVariants) {
      const attempt = await searchPublicListingsWithMetadata({
        ...variant,
        limit: 12,
        offset: 0,
      }).catch(() => ({
        items: [] as Awaited<ReturnType<typeof fetchPublicListings>>,
        metadata: null,
      }));

      if (attempt.items.length > 0) {
        rawListings = attempt.items;
        markExpandedResults('Risultati ampliati filtri');
        if (attempt.metadata?.fallbackApplied) {
          markExpandedResults('Risultati ampliati località');
        }
        break;
      }
    }

    if (rawListings.length === 0) {
      rawListings = await fetchPublicListings({ limit: 12 }).catch(() => []);
      if (rawListings.length > 0) {
        markExpandedResults('Risultati ampliati filtri');
      }
    }
  }

  let listings = shouldApplyLocationLabelPostFilter(searchOptions)
    ? filterListingsByLocationLabel(rawListings, searchOptions.locationLabel)
    : rawListings;

  if (searchMode && listings.length === 0 && rawListings.length > 0) {
    listings = rawListings;
    markExpandedResults('Risultati ampliati località');
  }

  const activeFilterLabels = buildActiveFilterLabels(searchOptions);

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Data source
            </p>
            <p className="text-sm text-[var(--color-text)]">
              {searchMode
                ? 'Ricerca reale `/v1/listings/search` con filtri attivi.'
                : 'Endpoint pubblico listings + fallback mock opzionale.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{listings.length} elementi</Badge>
            <Badge variant={searchMode ? 'info' : 'secondary'}>
              Search {searchMode ? 'on' : 'off'}
            </Badge>
            <Badge variant={isMockModeEnabled ? 'warning' : 'secondary'}>
              Mock {isMockModeEnabled ? 'on' : 'off'}
            </Badge>
          </div>
        </div>
      }
      description={
        searchMode
          ? 'Risultati ottenuti dalla ricerca backend reale con i filtri della query string.'
          : 'La pagina annunci e tornata a una lista pubblica essenziale. Niente filtri avanzati, drawer o fallback banner: solo il contratto dati e una presentazione minima.'
      }
      eyebrow={searchMode ? 'Ricerca pubblica' : 'Catalogo pubblico'}
      title={searchMode ? 'Risultati ricerca annunci' : 'Annunci pubblici'}
    >
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/pubblica" variant="outline">
          Pubblica annuncio
        </LinkButton>
        <LinkButton href="/login" variant="ghost">
          Accedi
        </LinkButton>
        {searchMode ? (
          <LinkButton href="/annunci" variant="secondary">
            Rimuovi filtri
          </LinkButton>
        ) : null}
      </div>

      {searchMode && (activeFilterLabels.length > 0 || resultsExpanded) ? (
        <div className="flex flex-wrap gap-2">
          {resultsExpanded ? (
            <Badge variant="warning">{expandedResultsLabel ?? 'Risultati ampliati'}</Badge>
          ) : null}
          {activeFilterLabels.map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
        </div>
      ) : null}

      <PublicListingsGrid
        emptyDescription={
          searchMode
            ? 'Nessun annuncio trovato con i filtri correnti. Prova ad allargare la ricerca.'
            : 'Quando il nuovo motore di ricerca sara ridisegnato, questa vista tornera a crescere sopra lo stesso layer dati.'
        }
        listings={listings}
      />
    </PageShell>
  );
}
