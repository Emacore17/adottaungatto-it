import { loadApiEnv } from '@adottaungatto/config';
import type {
  LocationIntent,
  SearchFallbackLevel,
  SearchFallbackReason,
  SearchListingsMetadata,
} from '@adottaungatto/types';
import { Inject, Injectable } from '@nestjs/common';
import type { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import {
  type FallbackComuneContext,
  type FallbackProvinceContext,
  ListingsRepository,
  type SearchPublishedResultRecord,
} from './listings.repository';

type SearchExecutor = (query: SearchListingsQueryDto) => Promise<SearchPublishedResultRecord>;

type FallbackStep = {
  level: SearchFallbackLevel;
  reason: SearchFallbackReason | null;
  intents: Array<LocationIntent | null>;
};

export interface SearchWithFallbackResult {
  result: SearchPublishedResultRecord;
  metadata: SearchListingsMetadata;
}

const DEFAULT_MAX_FALLBACK_STEPS = 5;
const NEARBY_PROVINCES_LIMIT = 5;

const toIntentKey = (intent: LocationIntent | null): string => {
  if (!intent) {
    return 'none';
  }

  return [intent.scope, intent.regionId ?? '', intent.provinceId ?? '', intent.comuneId ?? ''].join(
    '|',
  );
};

const dedupeIntents = (intents: Array<LocationIntent | null>): Array<LocationIntent | null> => {
  const seen = new Set<string>();
  const unique: Array<LocationIntent | null> = [];

  for (const intent of intents) {
    const key = toIntentKey(intent);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(intent);
  }

  return unique;
};

@Injectable()
export class SearchFallbackService {
  private readonly env = loadApiEnv();
  private readonly maxFallbackSteps = this.resolveMaxFallbackSteps();

  constructor(
    @Inject(ListingsRepository)
    private readonly listingsRepository: ListingsRepository,
  ) {}

  async searchWithFallback(
    query: SearchListingsQueryDto,
    executeSearch: SearchExecutor,
  ): Promise<SearchWithFallbackResult> {
    const steps = (await this.buildFallbackSteps(query)).slice(0, this.maxFallbackSteps);
    let lastResult: SearchPublishedResultRecord = { items: [], total: 0 };

    for (const [stepIndex, step] of steps.entries()) {
      for (const intent of step.intents) {
        const result = await executeSearch(this.withLocationIntent(query, intent));
        lastResult = result;

        if (result.total > 0) {
          const fallbackApplied = stepIndex > 0;
          return {
            result,
            metadata: {
              fallbackApplied,
              fallbackLevel: fallbackApplied ? step.level : 'none',
              fallbackReason: fallbackApplied ? step.reason : null,
              requestedLocationIntent: query.locationIntent,
              effectiveLocationIntent: intent,
            },
          };
        }
      }
    }

    return {
      result: lastResult,
      metadata: {
        fallbackApplied: false,
        fallbackLevel: 'none',
        fallbackReason: query.locationIntent ? 'NO_EXACT_MATCH' : 'NO_LOCATION_FILTER',
        requestedLocationIntent: query.locationIntent,
        effectiveLocationIntent: query.locationIntent,
      },
    };
  }

  private resolveMaxFallbackSteps(): number {
    const parsedValue = Number.parseInt(String(this.env.SEARCH_FALLBACK_MAX_STEPS), 10);
    if (!Number.isFinite(parsedValue)) {
      return DEFAULT_MAX_FALLBACK_STEPS;
    }

    return Math.min(Math.max(parsedValue, 1), DEFAULT_MAX_FALLBACK_STEPS);
  }

  private withLocationIntent(
    query: SearchListingsQueryDto,
    locationIntent: LocationIntent | null,
  ): SearchListingsQueryDto {
    return {
      ...query,
      locationIntent,
    };
  }

  private async buildFallbackSteps(query: SearchListingsQueryDto): Promise<FallbackStep[]> {
    const requestedIntent = query.locationIntent;
    const steps: FallbackStep[] = [
      {
        level: 'none',
        reason: null,
        intents: [requestedIntent],
      },
    ];

    if (!requestedIntent || requestedIntent.scope === 'italy') {
      return steps;
    }

    if (requestedIntent.scope === 'region') {
      steps.push({
        level: 'italy',
        reason: 'WIDENED_TO_PARENT_AREA',
        intents: [this.buildItalyIntent()],
      });
      return steps;
    }

    if (requestedIntent.scope === 'comune') {
      const comuneContext = requestedIntent.comuneId
        ? await this.listingsRepository.findFallbackComuneContextById(requestedIntent.comuneId)
        : null;

      const provinceIntent = this.buildProvinceIntentFromComune(requestedIntent, comuneContext);
      if (provinceIntent) {
        steps.push({
          level: 'province',
          reason: 'WIDENED_TO_PARENT_AREA',
          intents: [provinceIntent],
        });

        const nearbyProvinceIntents = await this.buildNearbyProvinceIntents(provinceIntent);
        if (nearbyProvinceIntents.length > 0) {
          steps.push({
            level: 'nearby',
            reason: 'WIDENED_TO_NEARBY_AREA',
            intents: nearbyProvinceIntents,
          });
        }
      }

      const regionIntent = this.buildRegionIntentFromComune(requestedIntent, comuneContext);
      if (regionIntent) {
        steps.push({
          level: 'region',
          reason: 'WIDENED_TO_PARENT_AREA',
          intents: [regionIntent],
        });
      }

      steps.push({
        level: 'italy',
        reason: 'WIDENED_TO_PARENT_AREA',
        intents: [this.buildItalyIntent()],
      });

      return this.normalizeSteps(steps);
    }

    const provinceContext =
      requestedIntent.provinceId === null
        ? null
        : await this.listingsRepository.findFallbackProvinceContextById(requestedIntent.provinceId);

    const nearbyProvinceIntents = await this.buildNearbyProvinceIntents(
      this.buildExactProvinceIntent(requestedIntent, provinceContext),
    );
    if (nearbyProvinceIntents.length > 0) {
      steps.push({
        level: 'nearby',
        reason: 'WIDENED_TO_NEARBY_AREA',
        intents: nearbyProvinceIntents,
      });
    }

    const regionIntent = this.buildRegionIntentFromProvince(requestedIntent, provinceContext);
    if (regionIntent) {
      steps.push({
        level: 'region',
        reason: 'WIDENED_TO_PARENT_AREA',
        intents: [regionIntent],
      });
    }

    steps.push({
      level: 'italy',
      reason: 'WIDENED_TO_PARENT_AREA',
      intents: [this.buildItalyIntent()],
    });

    return this.normalizeSteps(steps);
  }

  private normalizeSteps(steps: FallbackStep[]): FallbackStep[] {
    const globalSeen = new Set<string>();
    const normalized: FallbackStep[] = [];

    for (const step of steps) {
      const uniqueStepIntents = dedupeIntents(step.intents).filter((intent) => {
        const key = toIntentKey(intent);
        if (globalSeen.has(key)) {
          return false;
        }

        globalSeen.add(key);
        return true;
      });

      if (uniqueStepIntents.length === 0) {
        continue;
      }

      normalized.push({
        ...step,
        intents: uniqueStepIntents,
      });
    }

    return normalized;
  }

  private buildItalyIntent(): LocationIntent {
    return {
      scope: 'italy',
      regionId: null,
      provinceId: null,
      comuneId: null,
      label: 'Tutta Italia',
      secondaryLabel: 'Ricerca nazionale',
    };
  }

  private buildExactProvinceIntent(
    requestedIntent: LocationIntent,
    provinceContext: FallbackProvinceContext | null,
  ): LocationIntent | null {
    if (!requestedIntent.provinceId) {
      return null;
    }

    const provinceName = provinceContext?.name ?? requestedIntent.label;
    const provinceSigla = provinceContext?.sigla ? ` (${provinceContext.sigla})` : '';

    return {
      scope: 'province',
      regionId: provinceContext?.regionId ?? requestedIntent.regionId,
      provinceId: requestedIntent.provinceId,
      comuneId: null,
      label: `${provinceName}${provinceSigla}`,
      secondaryLabel: provinceContext
        ? `Provincia - ${provinceContext.regionName}`
        : requestedIntent.secondaryLabel,
    };
  }

  private buildProvinceIntentFromComune(
    requestedIntent: LocationIntent,
    comuneContext: FallbackComuneContext | null,
  ): LocationIntent | null {
    const provinceId = comuneContext?.provinceId ?? requestedIntent.provinceId;
    if (!provinceId) {
      return null;
    }

    const provinceSigla = comuneContext?.provinceSigla ? ` (${comuneContext.provinceSigla})` : '';
    const provinceName = comuneContext?.provinceName ?? 'Provincia';

    return {
      scope: 'province',
      regionId: comuneContext?.regionId ?? requestedIntent.regionId,
      provinceId,
      comuneId: null,
      label: `${provinceName}${provinceSigla}`,
      secondaryLabel: comuneContext
        ? `Provincia - ${comuneContext.regionName}`
        : 'Fallback automatico - Provincia',
    };
  }

  private buildRegionIntentFromComune(
    requestedIntent: LocationIntent,
    comuneContext: FallbackComuneContext | null,
  ): LocationIntent | null {
    const regionId = comuneContext?.regionId ?? requestedIntent.regionId;
    if (!regionId) {
      return null;
    }

    return {
      scope: 'region',
      regionId,
      provinceId: null,
      comuneId: null,
      label: comuneContext?.regionName ?? 'Regione',
      secondaryLabel: 'Fallback automatico - Regione',
    };
  }

  private buildRegionIntentFromProvince(
    requestedIntent: LocationIntent,
    provinceContext: FallbackProvinceContext | null,
  ): LocationIntent | null {
    const regionId = provinceContext?.regionId ?? requestedIntent.regionId;
    if (!regionId) {
      return null;
    }

    return {
      scope: 'region',
      regionId,
      provinceId: null,
      comuneId: null,
      label: provinceContext?.regionName ?? 'Regione',
      secondaryLabel: 'Fallback automatico - Regione',
    };
  }

  private async buildNearbyProvinceIntents(
    originProvinceIntent: LocationIntent | null,
  ): Promise<LocationIntent[]> {
    if (!originProvinceIntent?.provinceId) {
      return [];
    }

    const nearbyProvinces = await this.listingsRepository.listNearbyFallbackProvinces(
      originProvinceIntent.provinceId,
      NEARBY_PROVINCES_LIMIT,
    );

    return nearbyProvinces.map((province) => ({
      scope: 'province',
      regionId: province.regionId,
      provinceId: province.id,
      comuneId: null,
      label: `${province.name} (${province.sigla})`,
      secondaryLabel: `Provincia vicina - ${province.regionName}`,
    }));
  }
}
