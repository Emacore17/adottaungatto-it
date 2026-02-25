'use client';

import type {
  LocationIntent,
  LocationIntentScope,
  SearchFallbackLevel,
  SearchFallbackReason,
  SearchListingsMetadata,
  SearchSort,
} from '@adottaungatto/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Skeleton,
  Toast,
  cn,
  motionPresets,
} from '@adottaungatto/ui';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  type ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LazyLocationSelector } from '../../components/lazy-location-selector';
import type { LocationValue } from '../../components/location-selector';

interface SearchListingsClientProps {
  apiBaseUrl: string;
}

interface PublicListingMedia {
  id: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  position: number;
  isPrimary: boolean;
  objectUrl: string;
}

interface PublicListingSummary {
  id: string;
  title: string;
  description: string;
  listingType: string;
  priceAmount: string | null;
  currency: string;
  ageText: string;
  sex: string;
  breed: string | null;
  publishedAt: string | null;
  createdAt: string;
  regionName: string;
  provinceName: string;
  provinceSigla: string;
  comuneName: string;
  distanceKm: number | null;
  mediaCount: number;
  primaryMedia: PublicListingMedia | null;
}

interface SearchListingsResponse {
  items: PublicListingSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  metadata: SearchListingsMetadata;
}

interface FilterState {
  queryText: string;
  locationIntent: LocationIntent | null;
  listingType: string;
  priceMin: string;
  priceMax: string;
  ageText: string;
  sex: string;
  breed: string;
  sort: SearchSort;
}

type ActiveFilterChipKey =
  | 'queryText'
  | 'locationIntent'
  | 'listingType'
  | 'price'
  | 'ageText'
  | 'sex'
  | 'breed'
  | 'sort';

type ActiveFilterChip = {
  key: ActiveFilterChipKey;
  label: string;
};

const pageSize = 12;
const locationScopeValues: LocationIntentScope[] = [
  'italy',
  'region',
  'province',
  'comune',
  'comune_plus_province',
];
const searchSortValues: SearchSort[] = ['relevance', 'newest', 'price_asc', 'price_desc'];
const searchFallbackLevelValues: SearchFallbackLevel[] = [
  'none',
  'italy',
  'region',
  'province',
  'comune',
  'comune_plus_province',
  'nearby',
];
const searchFallbackReasonValues: SearchFallbackReason[] = [
  'NO_EXACT_MATCH',
  'WIDENED_TO_PARENT_AREA',
  'WIDENED_TO_NEARBY_AREA',
  'NO_LOCATION_FILTER',
];

const defaultLocationLabelByScope: Record<LocationIntentScope, string> = {
  italy: 'Tutta Italia',
  region: 'Regione',
  province: 'Provincia',
  comune: 'Comune',
  comune_plus_province: 'Comune e provincia',
};
const locationScopeLabelByScope: Record<LocationIntentScope, string> = {
  italy: 'Italia',
  region: 'Regione',
  province: 'Provincia',
  comune: 'Comune',
  comune_plus_province: 'Comune + provincia',
};
const fallbackLevelLabel: Record<SearchFallbackLevel, string> = {
  none: 'Nessun fallback',
  italy: 'Italia',
  region: 'Regione',
  province: 'Provincia',
  comune: 'Comune',
  comune_plus_province: 'Comune + provincia',
  nearby: 'Zone vicine',
};
const fallbackReasonLabel: Record<SearchFallbackReason, string> = {
  NO_EXACT_MATCH: 'Nessun risultato esatto',
  WIDENED_TO_PARENT_AREA: 'Area allargata al livello superiore',
  WIDENED_TO_NEARBY_AREA: 'Area allargata alle province vicine',
  NO_LOCATION_FILTER: 'Ricerca senza filtro luogo',
};
const italyLocationIntent: LocationIntent = {
  scope: 'italy',
  regionId: null,
  provinceId: null,
  comuneId: null,
  label: 'Tutta Italia',
  secondaryLabel: 'Italia',
};

const sortLabel: Record<SearchSort, string> = {
  relevance: 'Rilevanza',
  newest: 'Più recenti',
  price_asc: 'Prezzo crescente',
  price_desc: 'Prezzo decrescente',
};

const emptyFilterState: FilterState = {
  queryText: '',
  locationIntent: null,
  listingType: '',
  priceMin: '',
  priceMax: '',
  ageText: '',
  sex: '',
  breed: '',
  sort: 'relevance',
};

const defaultSearchMetadata: SearchListingsMetadata = {
  fallbackApplied: false,
  fallbackLevel: 'none',
  fallbackReason: null,
  requestedLocationIntent: null,
  effectiveLocationIntent: null,
};
const loadingSkeletonKeys = [
  'skeleton-a',
  'skeleton-b',
  'skeleton-c',
  'skeleton-d',
  'skeleton-e',
  'skeleton-f',
];

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
};

const parseOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const parseInteger = (value: unknown, fallbackValue: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallbackValue;
};

const parseBoolean = (value: unknown, fallbackValue: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallbackValue;
};

const parseSort = (value: unknown): SearchSort => {
  if (typeof value !== 'string') {
    return 'relevance';
  }

  const normalized = value.trim().toLowerCase() as SearchSort;
  return searchSortValues.includes(normalized) ? normalized : 'relevance';
};

const parseLocationScope = (value: unknown): LocationIntentScope | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase() as LocationIntentScope;
  return locationScopeValues.includes(normalized) ? normalized : null;
};

const parseFallbackLevel = (value: unknown): SearchFallbackLevel => {
  if (typeof value !== 'string') {
    return 'none';
  }

  const normalized = value.trim().toLowerCase() as SearchFallbackLevel;
  return searchFallbackLevelValues.includes(normalized) ? normalized : 'none';
};

const parseFallbackReason = (value: unknown): SearchFallbackReason | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return searchFallbackReasonValues.includes(value as SearchFallbackReason)
    ? (value as SearchFallbackReason)
    : null;
};

const parseLocationIntent = (value: unknown): LocationIntent | null => {
  const record = asRecord(value);
  const scope = parseLocationScope(record.scope);
  const label = parseOptionalString(record.label);

  if (!scope || !label) {
    return null;
  }

  return {
    scope,
    regionId: parseOptionalString(record.regionId),
    provinceId: parseOptionalString(record.provinceId),
    comuneId: parseOptionalString(record.comuneId),
    label,
    secondaryLabel: parseOptionalString(record.secondaryLabel),
  };
};

const parsePublicMedia = (value: unknown): PublicListingMedia | null => {
  const record = asRecord(value);
  if (typeof record.id !== 'string' || typeof record.objectUrl !== 'string') {
    return null;
  }

  return {
    id: record.id,
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : 'image/jpeg',
    width: typeof record.width === 'number' ? record.width : null,
    height: typeof record.height === 'number' ? record.height : null,
    position: parseInteger(record.position, 1),
    isPrimary: parseBoolean(record.isPrimary, false),
    objectUrl: record.objectUrl,
  };
};

const parseSearchListingItem = (value: unknown): PublicListingSummary | null => {
  const record = asRecord(value);
  if (typeof record.id !== 'string' || typeof record.title !== 'string') {
    return null;
  }

  return {
    id: record.id,
    title: record.title,
    description: typeof record.description === 'string' ? record.description : '',
    listingType: typeof record.listingType === 'string' ? record.listingType : '',
    priceAmount: record.priceAmount === null ? null : String(record.priceAmount ?? ''),
    currency: typeof record.currency === 'string' ? record.currency : 'EUR',
    ageText: typeof record.ageText === 'string' ? record.ageText : '',
    sex: typeof record.sex === 'string' ? record.sex : '',
    breed: record.breed === null ? null : String(record.breed ?? ''),
    publishedAt: record.publishedAt === null ? null : String(record.publishedAt ?? ''),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
    regionName: typeof record.regionName === 'string' ? record.regionName : '',
    provinceName: typeof record.provinceName === 'string' ? record.provinceName : '',
    provinceSigla: typeof record.provinceSigla === 'string' ? record.provinceSigla : '',
    comuneName: typeof record.comuneName === 'string' ? record.comuneName : '',
    distanceKm: parseNullableNumber(record.distanceKm),
    mediaCount: parseInteger(record.mediaCount, 0),
    primaryMedia: parsePublicMedia(record.primaryMedia),
  };
};

const parseSearchResponse = (value: unknown): SearchListingsResponse => {
  const record = asRecord(value);
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const pagination = asRecord(record.pagination);
  const metadata = asRecord(record.metadata);
  const parsedItems = rawItems
    .map((item) => parseSearchListingItem(item))
    .filter((item): item is PublicListingSummary => item !== null);

  return {
    items: parsedItems,
    pagination: {
      limit: Math.max(1, parseInteger(pagination.limit, pageSize)),
      offset: Math.max(0, parseInteger(pagination.offset, 0)),
      total: Math.max(0, parseInteger(pagination.total, parsedItems.length)),
      hasMore: parseBoolean(pagination.hasMore, false),
    },
    metadata: {
      fallbackApplied: parseBoolean(metadata.fallbackApplied, false),
      fallbackLevel: parseFallbackLevel(metadata.fallbackLevel),
      fallbackReason: parseFallbackReason(metadata.fallbackReason),
      requestedLocationIntent: parseLocationIntent(metadata.requestedLocationIntent),
      effectiveLocationIntent: parseLocationIntent(metadata.effectiveLocationIntent),
    },
  };
};

const parseOffsetValue = (rawOffset: string | null): number => {
  if (!rawOffset) {
    return 0;
  }

  const parsed = Number.parseInt(rawOffset, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

const parseLocationIntentFromParams = (params: URLSearchParams | ReadonlyURLSearchParams) => {
  const scope = parseLocationScope(params.get('locationScope') ?? params.get('scope'));
  if (!scope) {
    return null;
  }

  const label =
    parseOptionalString(params.get('locationLabel')) ?? defaultLocationLabelByScope[scope];

  return {
    scope,
    regionId: scope === 'italy' ? null : parseOptionalString(params.get('regionId')),
    provinceId:
      scope === 'italy' || scope === 'region'
        ? null
        : parseOptionalString(params.get('provinceId')),
    comuneId:
      scope === 'comune' || scope === 'comune_plus_province'
        ? parseOptionalString(params.get('comuneId'))
        : null,
    label,
    secondaryLabel: parseOptionalString(params.get('locationSecondaryLabel')),
  } satisfies LocationIntent;
};

const readFiltersFromSearchParams = (
  params: URLSearchParams | ReadonlyURLSearchParams,
): FilterState => {
  return {
    queryText:
      parseOptionalString(params.get('q') ?? params.get('query')) ?? emptyFilterState.queryText,
    locationIntent: parseLocationIntentFromParams(params),
    listingType:
      parseOptionalString(
        params.get('listingType') ?? params.get('listing_type') ?? params.get('type'),
      ) ?? emptyFilterState.listingType,
    priceMin: parseOptionalString(params.get('priceMin')) ?? emptyFilterState.priceMin,
    priceMax: parseOptionalString(params.get('priceMax')) ?? emptyFilterState.priceMax,
    ageText: parseOptionalString(params.get('ageText')) ?? emptyFilterState.ageText,
    sex: parseOptionalString(params.get('sex')) ?? emptyFilterState.sex,
    breed: parseOptionalString(params.get('breed')) ?? emptyFilterState.breed,
    sort: parseSort(params.get('sort')),
  };
};

const normalizeNumericFilter = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return normalized;
};

const buildSearchQueryParams = (filters: FilterState, offset: number): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('sort', filters.sort);
  params.set('limit', String(pageSize));
  params.set('offset', String(Math.max(0, offset)));

  const queryText = filters.queryText.trim();
  if (queryText) {
    params.set('q', queryText);
  }

  const listingType = filters.listingType.trim();
  if (listingType) {
    params.set('listingType', listingType);
  }

  const priceMin = normalizeNumericFilter(filters.priceMin);
  if (priceMin) {
    params.set('priceMin', priceMin);
  }

  const priceMax = normalizeNumericFilter(filters.priceMax);
  if (priceMax) {
    params.set('priceMax', priceMax);
  }

  const ageText = filters.ageText.trim();
  if (ageText) {
    params.set('ageText', ageText);
  }

  const sex = filters.sex.trim();
  if (sex) {
    params.set('sex', sex);
  }

  const breed = filters.breed.trim();
  if (breed) {
    params.set('breed', breed);
  }

  if (filters.locationIntent) {
    params.set('locationScope', filters.locationIntent.scope);
    if (filters.locationIntent.regionId) {
      params.set('regionId', filters.locationIntent.regionId);
    }
    if (filters.locationIntent.provinceId) {
      params.set('provinceId', filters.locationIntent.provinceId);
    }
    if (filters.locationIntent.comuneId) {
      params.set('comuneId', filters.locationIntent.comuneId);
    }
    if (filters.locationIntent.label) {
      params.set('locationLabel', filters.locationIntent.label);
    }
    if (filters.locationIntent.secondaryLabel) {
      params.set('locationSecondaryLabel', filters.locationIntent.secondaryLabel);
    }
  }

  return params;
};

const formatDate = (rawDate: string | null): string => {
  if (!rawDate) {
    return '-';
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
  }).format(parsedDate);
};

const formatPrice = (priceAmount: string | null, currency: string): string => {
  if (!priceAmount) {
    return 'Prezzo non indicato';
  }

  const numericPrice = Number.parseFloat(priceAmount);
  if (Number.isNaN(numericPrice)) {
    return `${priceAmount} ${currency}`;
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericPrice);
};

const formatDistance = (distanceKm: number | null): string | null => {
  if (distanceKm === null || Number.isNaN(distanceKm)) {
    return null;
  }

  return `${distanceKm.toFixed(1)} km`;
};

const truncate = (value: string, maxLength: number): string => {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const summarizePriceChip = (priceMin: string, priceMax: string): string | null => {
  const min = normalizeNumericFilter(priceMin);
  const max = normalizeNumericFilter(priceMax);
  if (min && max) {
    return `Prezzo: ${min} - ${max} EUR`;
  }

  if (min) {
    return `Prezzo minimo: ${min} EUR`;
  }

  if (max) {
    return `Prezzo massimo: ${max} EUR`;
  }

  return null;
};

const areLocationIntentsEqual = (
  leftIntent: LocationIntent | null,
  rightIntent: LocationIntent | null,
): boolean => {
  if (!leftIntent && !rightIntent) {
    return true;
  }

  if (!leftIntent || !rightIntent) {
    return false;
  }

  return (
    leftIntent.scope === rightIntent.scope &&
    leftIntent.regionId === rightIntent.regionId &&
    leftIntent.provinceId === rightIntent.provinceId &&
    leftIntent.comuneId === rightIntent.comuneId
  );
};

const formatLocationIntentLabel = (intent: LocationIntent | null): string => {
  if (!intent) {
    return 'Tutta Italia';
  }

  const secondaryLabel = parseOptionalString(intent.secondaryLabel);
  return secondaryLabel ? `${intent.label} - ${secondaryLabel}` : intent.label;
};

const hasSecondaryFiltersApplied = (filters: FilterState): boolean =>
  Boolean(
    filters.queryText.trim() ||
      filters.listingType.trim() ||
      normalizeNumericFilter(filters.priceMin) ||
      normalizeNumericFilter(filters.priceMax) ||
      filters.ageText.trim() ||
      filters.sex.trim() ||
      filters.breed.trim(),
  );

const buildLocationOnlyFilters = (filters: FilterState): FilterState => ({
  ...emptyFilterState,
  sort: filters.sort,
  locationIntent: filters.locationIntent,
});

export function SearchListingsClient({ apiBaseUrl }: SearchListingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedSearchParams = searchParams.toString();
  const appliedFilters = useMemo(
    () => readFiltersFromSearchParams(new URLSearchParams(appliedSearchParams)),
    [appliedSearchParams],
  );
  const appliedOffset = useMemo(
    () => parseOffsetValue(new URLSearchParams(appliedSearchParams).get('offset')),
    [appliedSearchParams],
  );

  const [draftFilters, setDraftFilters] = useState<FilterState>(appliedFilters);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isErrorToastOpen, setIsErrorToastOpen] = useState(false);

  const searchQueryString = useMemo(
    () => buildSearchQueryParams(appliedFilters, appliedOffset).toString(),
    [appliedFilters, appliedOffset],
  );

  const searchQuery = useQuery<SearchListingsResponse, Error>({
    queryKey: ['listings-search', apiBaseUrl, searchQueryString],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${apiBaseUrl}/v1/listings/search?${searchQueryString}`, {
        cache: 'no-store',
        signal,
      });

      if (!response.ok) {
        const payload = asRecord(await response.json().catch(() => ({})));
        const message =
          parseOptionalString(payload.message) ??
          `Ricerca non disponibile (status ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      return parseSearchResponse(payload);
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const searchResponse = searchQuery.data ?? null;
  const requestError =
    searchQuery.error?.message ?? (searchQuery.isError ? 'Ricerca non disponibile.' : null);
  const isLoading = searchQuery.isPending;

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    if (requestError) {
      setIsErrorToastOpen(true);
    }
  }, [requestError]);

  const commitFilters = useCallback(
    (nextFilters: FilterState, nextOffset = 0) => {
      setDraftFilters(nextFilters);
      const query = buildSearchQueryParams(nextFilters, nextOffset).toString();
      router.replace(`${pathname}?${query}`, { scroll: false });
    },
    [pathname, router],
  );

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (appliedFilters.queryText) {
      chips.push({ key: 'queryText', label: `Testo: ${appliedFilters.queryText}` });
    }
    if (appliedFilters.locationIntent) {
      chips.push({ key: 'locationIntent', label: `Luogo: ${appliedFilters.locationIntent.label}` });
    }
    if (appliedFilters.listingType) {
      chips.push({ key: 'listingType', label: `Tipo: ${appliedFilters.listingType}` });
    }
    const priceChip = summarizePriceChip(appliedFilters.priceMin, appliedFilters.priceMax);
    if (priceChip) {
      chips.push({ key: 'price', label: priceChip });
    }
    if (appliedFilters.ageText) {
      chips.push({ key: 'ageText', label: `Età: ${appliedFilters.ageText}` });
    }
    if (appliedFilters.sex) {
      chips.push({ key: 'sex', label: `Sesso: ${appliedFilters.sex}` });
    }
    if (appliedFilters.breed) {
      chips.push({ key: 'breed', label: `Razza: ${appliedFilters.breed}` });
    }
    if (appliedFilters.sort !== 'relevance') {
      chips.push({ key: 'sort', label: `Ordine: ${sortLabel[appliedFilters.sort]}` });
    }
    return chips;
  }, [appliedFilters]);

  const clearSingleFilter = useCallback(
    (chipKey: ActiveFilterChipKey) => {
      const nextFilters: FilterState = { ...appliedFilters };

      if (chipKey === 'queryText') {
        nextFilters.queryText = '';
      } else if (chipKey === 'locationIntent') {
        nextFilters.locationIntent = null;
      } else if (chipKey === 'listingType') {
        nextFilters.listingType = '';
      } else if (chipKey === 'price') {
        nextFilters.priceMin = '';
        nextFilters.priceMax = '';
      } else if (chipKey === 'ageText') {
        nextFilters.ageText = '';
      } else if (chipKey === 'sex') {
        nextFilters.sex = '';
      } else if (chipKey === 'breed') {
        nextFilters.breed = '';
      } else if (chipKey === 'sort') {
        nextFilters.sort = 'relevance';
      }

      commitFilters(nextFilters, 0);
    },
    [appliedFilters, commitFilters],
  );

  const resetAllFilters = useCallback(() => {
    commitFilters(emptyFilterState, 0);
  }, [commitFilters]);
  const locationOnlyFilters = buildLocationOnlyFilters(appliedFilters);
  const hasSecondaryFilters = hasSecondaryFiltersApplied(appliedFilters);

  const currentPagination = searchResponse?.pagination ?? {
    limit: pageSize,
    offset: appliedOffset,
    total: 0,
    hasMore: false,
  };
  const currentPage = Math.floor(currentPagination.offset / currentPagination.limit) + 1;
  const totalPages = Math.max(1, Math.ceil(currentPagination.total / currentPagination.limit));
  const canGoPrev = currentPagination.offset > 0 && !isLoading;
  const canGoNext = currentPagination.hasMore && !isLoading;

  const renderSecondaryFiltersForm = useCallback(
    (options: { idPrefix: string; className?: string; closeOnApply?: boolean }) => (
      <form
        className={cn('space-y-4', options.className)}
        onSubmit={(event) => {
          event.preventDefault();
          commitFilters(draftFilters, 0);
          if (options.closeOnApply) {
            setIsMobileFiltersOpen(false);
          }
        }}
      >
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-900"
            htmlFor={`${options.idPrefix}-listing-type`}
          >
            Tipo annuncio
          </label>
          <Input
            id={`${options.idPrefix}-listing-type`}
            onChange={(event) => {
              setDraftFilters((previous) => ({ ...previous, listingType: event.target.value }));
            }}
            placeholder="adozione, vendita..."
            value={draftFilters.listingType}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-900"
              htmlFor={`${options.idPrefix}-price-min`}
            >
              Prezzo min
            </label>
            <Input
              id={`${options.idPrefix}-price-min`}
              min="0"
              onChange={(event) => {
                setDraftFilters((previous) => ({ ...previous, priceMin: event.target.value }));
              }}
              placeholder="0"
              step="1"
              type="number"
              value={draftFilters.priceMin}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-900"
              htmlFor={`${options.idPrefix}-price-max`}
            >
              Prezzo max
            </label>
            <Input
              id={`${options.idPrefix}-price-max`}
              min="0"
              onChange={(event) => {
                setDraftFilters((previous) => ({ ...previous, priceMax: event.target.value }));
              }}
              placeholder="500"
              step="1"
              type="number"
              value={draftFilters.priceMax}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-900"
            htmlFor={`${options.idPrefix}-age-text`}
          >
            Età
          </label>
          <Input
            id={`${options.idPrefix}-age-text`}
            onChange={(event) => {
              setDraftFilters((previous) => ({ ...previous, ageText: event.target.value }));
            }}
            placeholder="2 anni, cucciolo..."
            value={draftFilters.ageText}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900" htmlFor={`${options.idPrefix}-sex`}>
            Sesso
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
            id={`${options.idPrefix}-sex`}
            onChange={(event) => {
              setDraftFilters((previous) => ({ ...previous, sex: event.target.value }));
            }}
            value={draftFilters.sex}
          >
            <option value="">Qualsiasi</option>
            <option value="femmina">Femmina</option>
            <option value="maschio">Maschio</option>
          </select>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-900"
            htmlFor={`${options.idPrefix}-breed`}
          >
            Razza
          </label>
          <Input
            id={`${options.idPrefix}-breed`}
            onChange={(event) => {
              setDraftFilters((previous) => ({ ...previous, breed: event.target.value }));
            }}
            placeholder="Europeo, Maine Coon..."
            value={draftFilters.breed}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit">Applica filtri</Button>
          <Button
            onClick={() => {
              resetAllFilters();
              if (options.closeOnApply) {
                setIsMobileFiltersOpen(false);
              }
            }}
            type="button"
            variant="outline"
          >
            Azzera tutto
          </Button>
        </div>
      </form>
    ),
    [commitFilters, draftFilters, resetAllFilters],
  );

  const metadata = searchResponse?.metadata ?? defaultSearchMetadata;
  const requestedLocationIntent = metadata.requestedLocationIntent;
  const effectiveLocationIntent = metadata.effectiveLocationIntent;
  const visibleLocationIntent = effectiveLocationIntent ?? appliedFilters.locationIntent;
  const canApplyEffectiveLocation =
    metadata.fallbackApplied &&
    Boolean(effectiveLocationIntent) &&
    !areLocationIntentsEqual(appliedFilters.locationIntent, effectiveLocationIntent);
  const canExpandToItaly = appliedFilters.locationIntent?.scope !== 'italy';
  const zeroStateSuggestions: string[] = [];

  if (appliedFilters.locationIntent?.scope && appliedFilters.locationIntent.scope !== 'italy') {
    zeroStateSuggestions.push(
      `Amplia il luogo di ricerca da ${appliedFilters.locationIntent.label} a tutta Italia.`,
    );
  }

  if (hasSecondaryFilters) {
    zeroStateSuggestions.push(
      'Mantieni solo il filtro luogo per recuperare più annunci disponibili.',
    );
  }

  if (appliedFilters.queryText.trim()) {
    zeroStateSuggestions.push('Prova a semplificare o rimuovere le parole nel campo "Cerca".');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full space-y-6">
        <Toast
          actionLabel="Riprova"
          autoHideMs={6000}
          description={requestError ?? undefined}
          onAction={() => {
            setIsErrorToastOpen(false);
            void searchQuery.refetch();
          }}
          onOpenChange={setIsErrorToastOpen}
          open={Boolean(requestError) && isErrorToastOpen}
          title="Ricerca momentaneamente non disponibile"
          variant="danger"
        />

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Ricerca annunci</Badge>
            <Badge variant="outline">M3.7</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Trova il gatto giusto
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Ricerca per luogo, filtra per caratteristiche e ordina i risultati con una lista
            ottimizzata per mobile e desktop.
          </p>
        </header>

        <Card className="border-slate-300/70 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900" htmlFor="search-query">
                      Cerca
                    </label>
                    <Input
                      id="search-query"
                      onChange={(event) => {
                        setDraftFilters((previous) => ({
                          ...previous,
                          queryText: event.target.value,
                        }));
                      }}
                      placeholder="Titolo, descrizione, parole chiave"
                      value={draftFilters.queryText}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900" htmlFor="search-sort">
                      Ordina
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      id="search-sort"
                      onChange={(event) => {
                        setDraftFilters((previous) => ({
                          ...previous,
                          sort: parseSort(event.target.value),
                        }));
                      }}
                      value={draftFilters.sort}
                    >
                      {searchSortValues.map((sortValue) => (
                        <option key={sortValue} value={sortValue}>
                          {sortLabel[sortValue]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <LazyLocationSelector
                  apiBaseUrl={apiBaseUrl}
                  onChange={(nextLocationValue: LocationValue) => {
                    setDraftFilters((previous) => ({
                      ...previous,
                      locationIntent: nextLocationValue,
                    }));
                  }}
                  showDebugState={false}
                  value={draftFilters.locationIntent}
                />
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end lg:pb-1">
                <Dialog onOpenChange={setIsMobileFiltersOpen} open={isMobileFiltersOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto lg:hidden" type="button" variant="outline">
                      Filtri avanzati
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="left-auto right-0 top-0 h-dvh w-full max-w-[92vw] translate-x-0 translate-y-0 rounded-none border-l border-slate-200 p-0 sm:max-w-md">
                    <div className="flex h-full flex-col overflow-y-auto p-5">
                      <DialogHeader>
                        <DialogTitle>Filtri avanzati</DialogTitle>
                        <DialogDescription>
                          Applica filtri aggiuntivi senza uscire dalla pagina risultati.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4">
                        {renderSecondaryFiltersForm({
                          idPrefix: 'mobile-filters',
                          closeOnApply: true,
                        })}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  className="w-full sm:w-auto"
                  onClick={() => commitFilters(draftFilters, 0)}
                  type="button"
                >
                  Cerca annunci
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {activeFilterChips.length > 0 ? (
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Filtri attivi</legend>
            {activeFilterChips.map((chip) => (
              <Badge
                className="gap-2 px-3 py-1"
                key={`${chip.key}-${chip.label}`}
                variant="outline"
              >
                <span>{chip.label}</span>
                <button
                  aria-label={`Rimuovi filtro ${chip.label}`}
                  className="rounded-sm px-1 text-xs text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  onClick={() => clearSingleFilter(chip.key)}
                  type="button"
                >
                  <span aria-hidden>x</span>
                </button>
              </Badge>
            ))}
            <Button onClick={resetAllFilters} size="sm" type="button" variant="outline">
              Rimuovi tutti
            </Button>
          </fieldset>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <Card className="sticky top-6 border-slate-300/70 bg-white/90">
              <CardHeader>
                <CardTitle className="text-base">Filtri avanzati</CardTitle>
                <CardDescription>
                  Raffina la ricerca per prezzo, età, sesso e razza.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSecondaryFiltersForm({ idPrefix: 'desktop-filters' })}
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p aria-live="polite" className="text-sm text-slate-600">
                {isLoading
                  ? 'Caricamento annunci in corso...'
                  : `${currentPagination.total} annunci trovati`}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  disabled={!canGoPrev}
                  onClick={() =>
                    commitFilters(
                      appliedFilters,
                      Math.max(0, currentPagination.offset - currentPagination.limit),
                    )
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Precedente
                </Button>
                <span className="text-xs text-slate-500">
                  Pagina {currentPage} / {totalPages}
                </span>
                <Button
                  disabled={!canGoNext}
                  onClick={() =>
                    commitFilters(
                      appliedFilters,
                      currentPagination.offset + currentPagination.limit,
                    )
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Successiva
                </Button>
              </div>
            </div>

            {!isLoading && visibleLocationIntent ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {metadata.fallbackApplied ? 'Area effettiva' : 'Area selezionata'}:{' '}
                  {formatLocationIntentLabel(visibleLocationIntent)}
                </Badge>
                <Badge variant="outline">
                  Livello: {locationScopeLabelByScope[visibleLocationIntent.scope]}
                </Badge>
              </div>
            ) : null}

            {metadata.fallbackApplied ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-amber-900">
                      Nessun risultato esatto in{' '}
                      <strong>{formatLocationIntentLabel(requestedLocationIntent)}</strong>.
                      Mostriamo annunci in{' '}
                      <strong>{formatLocationIntentLabel(effectiveLocationIntent)}</strong>.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        Fallback: {fallbackLevelLabel[metadata.fallbackLevel]}
                      </Badge>
                      {metadata.fallbackReason ? (
                        <Badge variant="outline">
                          Motivo: {fallbackReasonLabel[metadata.fallbackReason]}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canApplyEffectiveLocation && effectiveLocationIntent ? (
                      <Button
                        onClick={() =>
                          commitFilters(
                            {
                              ...appliedFilters,
                              locationIntent: effectiveLocationIntent,
                            },
                            0,
                          )
                        }
                        size="sm"
                        type="button"
                      >
                        Usa area suggerita
                      </Button>
                    ) : null}
                    {hasSecondaryFilters ? (
                      <Button
                        onClick={() => commitFilters(locationOnlyFilters, 0)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Rimuovi filtri aggiuntivi
                      </Button>
                    ) : null}
                    {canExpandToItaly ? (
                      <Button
                        onClick={() =>
                          commitFilters(
                            {
                              ...appliedFilters,
                              locationIntent: italyLocationIntent,
                            },
                            0,
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Cerca in tutta Italia
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <AnimatePresence initial={false} mode="wait">
              {isLoading ? (
                <motion.div
                  animate={motionPresets.crossfade.animate}
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  exit={motionPresets.crossfade.exit}
                  initial={motionPresets.crossfade.initial}
                  key="search-loading"
                  transition={motionPresets.crossfade.transition}
                >
                  {loadingSkeletonKeys.map((skeletonKey) => (
                    <Card className="border-slate-300/70 bg-white/95" key={skeletonKey}>
                      <Skeleton className="h-48 w-full rounded-t-lg" />
                      <CardHeader className="space-y-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-4/5" />
                        <Skeleton className="h-4 w-3/5" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              ) : null}

              {!isLoading && requestError ? (
                <motion.div
                  animate={motionPresets.crossfade.animate}
                  exit={motionPresets.crossfade.exit}
                  initial={motionPresets.crossfade.initial}
                  key="search-error"
                  transition={motionPresets.crossfade.transition}
                >
                  <Card className="border-rose-300/70 bg-rose-50">
                    <CardHeader>
                      <CardTitle>Ricerca non disponibile</CardTitle>
                      <CardDescription>{requestError}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        onClick={() => {
                          void searchQuery.refetch();
                        }}
                        type="button"
                      >
                        Riprova
                      </Button>
                      <Button onClick={resetAllFilters} type="button" variant="outline">
                        Riparti da filtri vuoti
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}

              {!isLoading && !requestError && (searchResponse?.items.length ?? 0) === 0 ? (
                <motion.div
                  animate={motionPresets.crossfade.animate}
                  exit={motionPresets.crossfade.exit}
                  initial={motionPresets.crossfade.initial}
                  key="search-empty"
                  transition={motionPresets.crossfade.transition}
                >
                  <Card className="border-slate-300/70 bg-white/95">
                    <CardHeader>
                      <CardTitle>Nessun annuncio con i filtri correnti</CardTitle>
                      <CardDescription>
                        Non ci sono risultati utili con la combinazione attuale. Prova uno dei
                        suggerimenti qui sotto.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {zeroStateSuggestions.length > 0 ? (
                          zeroStateSuggestions.map((suggestion) => (
                            <li key={suggestion}>{suggestion}</li>
                          ))
                        ) : (
                          <li>
                            Riprova da una ricerca più ampia o rimuovi i filtri meno importanti per
                            te.
                          </li>
                        )}
                      </ul>
                      <div className="flex flex-wrap gap-2">
                        {hasSecondaryFilters ? (
                          <Button
                            onClick={() => commitFilters(locationOnlyFilters, 0)}
                            type="button"
                            variant="outline"
                          >
                            Mantieni solo il luogo
                          </Button>
                        ) : null}
                        {canExpandToItaly ? (
                          <Button
                            onClick={() =>
                              commitFilters(
                                {
                                  ...appliedFilters,
                                  locationIntent: italyLocationIntent,
                                },
                                0,
                              )
                            }
                            type="button"
                            variant="outline"
                          >
                            Cerca in tutta Italia
                          </Button>
                        ) : null}
                        <Button onClick={resetAllFilters} type="button" variant="outline">
                          Azzera filtri
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}

              {!isLoading && !requestError && (searchResponse?.items.length ?? 0) > 0 ? (
                <motion.div
                  animate={motionPresets.listEnter.animate}
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  exit={motionPresets.crossfade.exit}
                  initial={motionPresets.listEnter.initial}
                  key="search-results"
                  transition={motionPresets.listEnter.transition}
                >
                  {searchResponse?.items.map((listing, index) => (
                    <motion.article
                      key={listing.id}
                      transition={{
                        ...motionPresets.hoverLift.transition,
                        delay: Math.min(index * 0.02, 0.12),
                      }}
                      whileHover={motionPresets.hoverLift.whileHover}
                      whileTap={motionPresets.hoverLift.whileTap}
                    >
                      <Card className="border-slate-300/70 bg-white/95">
                        {listing.primaryMedia ? (
                          <Image
                            alt={`Foto annuncio ${listing.title}`}
                            className="h-48 w-full rounded-t-lg object-cover"
                            height={listing.primaryMedia.height ?? 480}
                            priority={index < 2}
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            src={listing.primaryMedia.objectUrl}
                            width={listing.primaryMedia.width ?? 640}
                          />
                        ) : (
                          <div className="flex h-48 w-full items-center justify-center rounded-t-lg bg-slate-100 text-sm text-slate-500">
                            Nessuna foto
                          </div>
                        )}
                        <CardHeader className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="secondary">{listing.listingType}</Badge>
                            <div className="flex items-center gap-2">
                              {formatDistance(listing.distanceKm) ? (
                                <Badge variant="outline">
                                  {formatDistance(listing.distanceKm)}
                                </Badge>
                              ) : null}
                              <span className="text-xs text-slate-500">
                                {formatDate(listing.publishedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{listing.title}</CardTitle>
                            <CardDescription>
                              {listing.comuneName} ({listing.provinceSigla}) -{' '}
                              {listing.provinceName}, {listing.regionName}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-slate-700">
                            {truncate(listing.description, 140)}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <span>Età: {listing.ageText || '-'}</span>
                            <span>Sesso: {listing.sex || '-'}</span>
                            <span className="col-span-2">
                              Prezzo: {formatPrice(listing.priceAmount, listing.currency)}
                            </span>
                          </div>
                          <Link
                            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                            href={`/annunci/${listing.id}`}
                          >
                            Apri dettaglio
                          </Link>
                        </CardContent>
                      </Card>
                    </motion.article>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </main>
  );
}
