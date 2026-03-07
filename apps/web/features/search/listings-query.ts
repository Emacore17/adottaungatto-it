import type { LocationIntent, LocationIntentScope, SearchSort } from '@adottaungatto/types';

export interface ListingsFilterValues {
  q: string;
  listingType: string;
  sex: string;
  breed: string;
  isSterilized: boolean | null;
  isVaccinated: boolean | null;
  hasMicrochip: boolean | null;
  compatibleWithChildren: boolean | null;
  compatibleWithOtherAnimals: boolean | null;
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: SearchSort;
  locationScope: LocationIntentScope | null;
  regionId: string | null;
  provinceId: string | null;
  comuneId: string | null;
  locationLabel: string | null;
  locationSecondaryLabel: string | null;
  locationQuery: string;
  referenceLat: number | null;
  referenceLon: number | null;
}

interface BuildListingsHrefOptions {
  defaultSort?: SearchSort | null;
  page?: number;
}

interface BuildListingsFiltersOptions {
  q: string;
  listingType: string;
  sex: string;
  breed: string;
  isSterilized?: boolean | null;
  isVaccinated?: boolean | null;
  hasMicrochip?: boolean | null;
  compatibleWithChildren?: boolean | null;
  compatibleWithOtherAnimals?: boolean | null;
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: SearchSort;
  locationIntent?: LocationIntent | null;
  locationQuery?: string;
  locationLabelFallback?: string | null;
  referenceLat?: number | null;
  referenceLon?: number | null;
}

interface ListingsRangeFilters {
  ageMaxMonths: number | null;
  ageMinMonths: number | null;
  priceMax: number | null;
  priceMin: number | null;
}

const priceRangeValidationMessage = 'Il prezzo minimo non puo essere superiore al prezzo massimo.';
const ageRangeValidationMessage = "L'eta minima non puo essere superiore all'eta massima.";

export const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const areEquivalentSearchTexts = (
  firstValue: string | null | undefined,
  secondValue: string | null | undefined,
) => normalizeSearchText(firstValue) === normalizeSearchText(secondValue);

export const hasReferenceCoordinates = (filters: ListingsFilterValues) =>
  filters.referenceLat !== null && filters.referenceLon !== null;

export const hasStructuredLocationFilter = (filters: ListingsFilterValues) =>
  Boolean(
    filters.locationScope && (filters.locationLabel || filters.regionId || filters.provinceId),
  );

export const clearStructuredLocationFilter = (
  filters: ListingsFilterValues,
): ListingsFilterValues => ({
  ...filters,
  locationScope: null,
  regionId: null,
  provinceId: null,
  comuneId: null,
  locationLabel: null,
  locationSecondaryLabel: null,
});

export const applyLocationIntent = (
  filters: ListingsFilterValues,
  locationIntent: LocationIntent,
  locationQuery: string = locationIntent.label ?? '',
): ListingsFilterValues => ({
  ...clearStructuredLocationFilter(filters),
  locationScope: locationIntent.scope,
  regionId: locationIntent.regionId,
  provinceId: locationIntent.provinceId,
  comuneId: locationIntent.comuneId,
  locationLabel: locationIntent.label,
  locationSecondaryLabel: locationIntent.secondaryLabel,
  locationQuery,
  referenceLat: null,
  referenceLon: null,
});

export const buildListingsFilters = ({
  q,
  listingType,
  sex,
  breed,
  isSterilized = null,
  isVaccinated = null,
  hasMicrochip = null,
  compatibleWithChildren = null,
  compatibleWithOtherAnimals = null,
  ageMinMonths,
  ageMaxMonths,
  priceMin,
  priceMax,
  sort,
  locationIntent = null,
  locationQuery = '',
  locationLabelFallback = null,
  referenceLat = null,
  referenceLon = null,
}: BuildListingsFiltersOptions): ListingsFilterValues => {
  const normalizedLocationQuery = locationQuery.trim();
  const normalizedFallbackLabel = locationLabelFallback?.trim() || null;

  const baseFilters: ListingsFilterValues = {
    q,
    listingType,
    sex,
    breed,
    isSterilized,
    isVaccinated,
    hasMicrochip,
    compatibleWithChildren,
    compatibleWithOtherAnimals,
    ageMinMonths,
    ageMaxMonths,
    priceMin,
    priceMax,
    sort,
    locationScope: null,
    regionId: null,
    provinceId: null,
    comuneId: null,
    locationLabel: normalizedFallbackLabel,
    locationSecondaryLabel: null,
    locationQuery: normalizedLocationQuery || normalizedFallbackLabel || '',
    referenceLat,
    referenceLon,
  };

  if (!locationIntent) {
    return baseFilters;
  }

  return applyLocationIntent(
    baseFilters,
    locationIntent,
    normalizedLocationQuery || locationIntent.label || '',
  );
};

export const buildListingsHref = (
  filters: ListingsFilterValues,
  { defaultSort = 'newest', page = 1 }: BuildListingsHrefOptions = {},
) => {
  const params = new URLSearchParams();
  const q = filters.q.trim();
  const locationQuery = filters.locationQuery.trim();

  if (q) {
    params.set('q', q);
  }

  if (filters.listingType) {
    params.set('listingType', filters.listingType);
  }

  if (filters.sex) {
    params.set('sex', filters.sex);
  }

  if (filters.breed) {
    params.set('breed', filters.breed);
  }

  if (filters.ageMinMonths !== null) {
    params.set('ageMinMonths', String(filters.ageMinMonths));
  }

  if (filters.ageMaxMonths !== null) {
    params.set('ageMaxMonths', String(filters.ageMaxMonths));
  }

  if (filters.priceMin !== null) {
    params.set('priceMin', String(filters.priceMin));
  }

  if (filters.priceMax !== null) {
    params.set('priceMax', String(filters.priceMax));
  }

  const appendBooleanFilter = (paramName: string, value: boolean | null) => {
    if (value === true) {
      params.set(paramName, 'true');
    } else if (value === false) {
      params.set(paramName, 'false');
    }
  };

  appendBooleanFilter('isSterilized', filters.isSterilized);
  appendBooleanFilter('isVaccinated', filters.isVaccinated);
  appendBooleanFilter('hasMicrochip', filters.hasMicrochip);
  appendBooleanFilter('compatibleWithChildren', filters.compatibleWithChildren);
  appendBooleanFilter('compatibleWithOtherAnimals', filters.compatibleWithOtherAnimals);

  if (hasStructuredLocationFilter(filters)) {
    params.set('locationScope', filters.locationScope ?? 'comune');

    if (filters.regionId) {
      params.set('regionId', filters.regionId);
    }

    if (filters.provinceId) {
      params.set('provinceId', filters.provinceId);
    }

    if (filters.comuneId) {
      params.set('comuneId', filters.comuneId);
    }

    if (filters.locationLabel) {
      params.set('locationLabel', filters.locationLabel);
    }

    if (filters.locationSecondaryLabel) {
      params.set('locationSecondaryLabel', filters.locationSecondaryLabel);
    }
  } else {
    const fallbackLocationLabel = filters.locationLabel?.trim() || locationQuery;
    if (fallbackLocationLabel) {
      params.set('locationLabel', fallbackLocationLabel);
    }
  }

  if (hasReferenceCoordinates(filters)) {
    params.set('referenceLat', String(filters.referenceLat));
    params.set('referenceLon', String(filters.referenceLon));
  }

  const includeSort =
    defaultSort === null || filters.sort !== defaultSort || hasReferenceCoordinates(filters);

  if (includeSort) {
    params.set('sort', filters.sort);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const queryString = params.toString();
  return queryString ? `/annunci?${queryString}` : '/annunci';
};

export const countActiveListingsFilters = (filters: ListingsFilterValues) =>
  (filters.q.trim() ? 1 : 0) +
  (filters.listingType ? 1 : 0) +
  (filters.sex ? 1 : 0) +
  (filters.breed ? 1 : 0) +
  (filters.isSterilized !== null ? 1 : 0) +
  (filters.isVaccinated !== null ? 1 : 0) +
  (filters.hasMicrochip !== null ? 1 : 0) +
  (filters.compatibleWithChildren !== null ? 1 : 0) +
  (filters.compatibleWithOtherAnimals !== null ? 1 : 0) +
  (filters.ageMinMonths !== null || filters.ageMaxMonths !== null ? 1 : 0) +
  (filters.priceMin !== null || filters.priceMax !== null ? 1 : 0) +
  (hasStructuredLocationFilter(filters) || filters.referenceLat !== null ? 1 : 0);

export const getListingsRangeValidationError = ({
  ageMaxMonths,
  ageMinMonths,
  priceMax,
  priceMin,
}: ListingsRangeFilters) => {
  if (priceMin !== null && priceMax !== null && Number(priceMin) > Number(priceMax)) {
    return priceRangeValidationMessage;
  }

  if (ageMinMonths !== null && ageMaxMonths !== null && ageMinMonths > ageMaxMonths) {
    return ageRangeValidationMessage;
  }

  return null;
};
