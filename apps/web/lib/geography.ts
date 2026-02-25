import type { LocationIntent, LocationIntentScope } from '@adottaungatto/types';

export type GeographySuggestion = {
  type: LocationIntentScope;
  id: string;
  name: string;
  label: string;
  secondaryLabel: string | null;
  istatCode: string | null;
  regionId: string | null;
  provinceId: string | null;
  comuneId: string | null;
  regionName: string | null;
  provinceName: string | null;
  sigla: string | null;
  locationIntent: LocationIntent;
};

type JsonRecord = Record<string, unknown>;

const ensureOk = (response: Response, endpoint: string) => {
  if (!response.ok) {
    throw new Error(`Geography request failed (${endpoint}) with status ${response.status}.`);
  }
};

const parseArray = <TItem>(payload: JsonRecord, key: string): TItem[] => {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value as TItem[];
};

export const fetchLocationSuggestions = async (
  apiBaseUrl: string,
  query: string,
  limit = 8,
): Promise<GeographySuggestion[]> => {
  const encodedQuery = encodeURIComponent(query.trim());
  const response = await fetch(
    `${apiBaseUrl}/v1/geography/search?q=${encodedQuery}&limit=${limit.toString()}`,
    {
      cache: 'no-store',
    },
  );
  ensureOk(response, '/v1/geography/search');
  const payload = (await response.json()) as JsonRecord;
  return parseArray<GeographySuggestion>(payload, 'items');
};
