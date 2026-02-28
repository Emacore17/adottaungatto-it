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

const accentsRegex = /\p{M}/gu;
const nonWordRegex = /[^a-z0-9\s]/g;

const suggestionTypeRank: Record<LocationIntentScope, number> = {
  comune: 0,
  comune_plus_province: 1,
  province: 2,
  region: 3,
  italy: 4,
};

const normalizeSearchText = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(accentsRegex, '')
    .toLowerCase()
    .replace(nonWordRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildSuggestionSearchFields = (suggestion: GeographySuggestion): string[] => {
  const fields = [
    suggestion.name,
    suggestion.label,
    suggestion.secondaryLabel,
    suggestion.provinceName,
    suggestion.regionName,
    suggestion.sigla,
  ];

  return fields.map((field) => normalizeSearchText(field)).filter((field) => field.length > 0);
};

const tokenMatchesField = (token: string, field: string): boolean => {
  if (token.length <= 2) {
    return field.startsWith(token);
  }

  return field.includes(token);
};

const filterAndRankSuggestions = (
  suggestions: GeographySuggestion[],
  normalizedQuery: string,
  limit: number,
): GeographySuggestion[] => {
  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 0);

  const ranked = suggestions
    .map((suggestion) => {
      const fields = buildSuggestionSearchFields(suggestion);
      if (fields.length === 0) {
        return null;
      }

      const matchesAllTokens = queryTokens.every((token) =>
        fields.some((field) => tokenMatchesField(token, field)),
      );
      if (!matchesAllTokens) {
        return null;
      }

      const normalizedName = normalizeSearchText(suggestion.name);
      const normalizedLabel = normalizeSearchText(suggestion.label);
      const startsWithQuery = fields.some((field) => field.startsWith(normalizedQuery));
      const allTokensAsPrefix = queryTokens.every((token) =>
        fields.some((field) => field.startsWith(token)),
      );

      let score = 3;
      if (normalizedName === normalizedQuery || normalizedLabel === normalizedQuery) {
        score = 0;
      } else if (startsWithQuery) {
        score = 1;
      } else if (allTokensAsPrefix) {
        score = 2;
      }

      return {
        suggestion,
        score,
        typeRank: suggestionTypeRank[suggestion.type] ?? 9,
        normalizedLabel,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        suggestion: GeographySuggestion;
        score: number;
        typeRank: number;
        normalizedLabel: string;
      } => entry !== null,
    )
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      if (a.typeRank !== b.typeRank) {
        return a.typeRank - b.typeRank;
      }

      return a.normalizedLabel.localeCompare(b.normalizedLabel);
    });

  return ranked.slice(0, limit).map((entry) => entry.suggestion);
};

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
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeSearchText(trimmedQuery);
  if (normalizedQuery.length < 2) {
    return [];
  }

  // Ask for a wider candidate set and rank client-side to prevent noisy matches.
  const upstreamLimit = Math.min(Math.max(limit * 5, 20), 50);
  const encodedQuery = encodeURIComponent(trimmedQuery);
  const response = await fetch(
    `${apiBaseUrl}/v1/geography/search?q=${encodedQuery}&limit=${upstreamLimit.toString()}`,
    {
      cache: 'no-store',
    },
  );
  ensureOk(response, '/v1/geography/search');
  const payload = (await response.json()) as JsonRecord;
  const suggestions = parseArray<GeographySuggestion>(payload, 'items');
  return filterAndRankSuggestions(suggestions, normalizedQuery, limit);
};
