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
