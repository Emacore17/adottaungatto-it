export interface HealthResponse {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

export type LocationIntentScope =
  | 'italy'
  | 'region'
  | 'province'
  | 'comune'
  | 'comune_plus_province';

export interface LocationIntent {
  scope: LocationIntentScope;
  regionId: string | null;
  provinceId: string | null;
  comuneId: string | null;
  label: string;
  secondaryLabel: string | null;
}

export type SearchSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

export type SearchFallbackLevel = 'none' | 'nearby' | LocationIntentScope;

export type SearchFallbackReason =
  | 'NO_EXACT_MATCH'
  | 'WIDENED_TO_PARENT_AREA'
  | 'WIDENED_TO_NEARBY_AREA'
  | 'NO_LOCATION_FILTER';

export interface SearchListingsMetadata {
  fallbackApplied: boolean;
  fallbackLevel: SearchFallbackLevel;
  fallbackReason: SearchFallbackReason | null;
  requestedLocationIntent: LocationIntent | null;
  effectiveLocationIntent: LocationIntent | null;
}
