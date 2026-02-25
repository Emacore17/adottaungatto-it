import { loadApiEnv } from '@adottaungatto/config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import {
  ListingsRepository,
  type LocationCentroid,
  type SearchIndexDocumentRecord,
  type SearchPublishedResultRecord,
} from './listings.repository';

const SEARCH_INDEX_NAME = 'listings_v1';
const SPONSORED_MAX_BOOST = 1.2;

const SEARCH_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      title: { type: 'text' },
      description: { type: 'text' },
      listingType: { type: 'keyword' },
      priceAmount: { type: 'double' },
      currency: { type: 'keyword' },
      ageText: { type: 'text' },
      sex: { type: 'keyword' },
      breed: { type: 'keyword' },
      status: { type: 'keyword' },
      regionId: { type: 'keyword' },
      provinceId: { type: 'keyword' },
      comuneId: { type: 'keyword' },
      regionName: { type: 'keyword' },
      provinceName: { type: 'keyword' },
      provinceSigla: { type: 'keyword' },
      comuneName: { type: 'keyword' },
      location: { type: 'geo_point' },
      isSponsored: { type: 'boolean' },
      promotionWeight: { type: 'double' },
      publishedAt: { type: 'date' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
} as const;

type OpenSearchResponse = {
  status: number;
  body: unknown;
};

type OpenSearchSearchHit = {
  _id?: string;
};

@Injectable()
export class SearchIndexService {
  private readonly env = loadApiEnv();
  private readonly logger = new Logger(SearchIndexService.name);
  private readonly opensearchBaseUrl = this.env.OPENSEARCH_URL.replace(/\/+$/, '');
  private indexEnsured = false;

  constructor(
    @Inject(ListingsRepository)
    private readonly listingsRepository: ListingsRepository,
  ) {}

  getIndexName(): string {
    return SEARCH_INDEX_NAME;
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.request('/', { method: 'GET' });
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }

  async ensureIndexExists(): Promise<void> {
    if (this.indexEnsured) {
      return;
    }

    const indexPath = `/${SEARCH_INDEX_NAME}`;
    const headResponse = await this.request(indexPath, { method: 'HEAD', parseJson: false });

    if (headResponse.status === 404) {
      const createResponse = await this.request(indexPath, {
        method: 'PUT',
        body: SEARCH_INDEX_MAPPING,
      });

      if (createResponse.status < 200 || createResponse.status >= 300) {
        throw new Error(
          `OpenSearch index creation failed (${createResponse.status}): ${JSON.stringify(
            createResponse.body,
          )}`,
        );
      }

      this.logger.log(`OpenSearch index "${SEARCH_INDEX_NAME}" created.`);
      this.indexEnsured = true;
      return;
    }

    if (headResponse.status < 200 || headResponse.status >= 300) {
      throw new Error(
        `OpenSearch index check failed (${headResponse.status}): ${JSON.stringify(headResponse.body)}`,
      );
    }

    this.indexEnsured = true;
  }

  async indexPublishedListingById(listingId: string): Promise<void> {
    await this.ensureIndexExists();

    const document = await this.listingsRepository.findPublishedSearchIndexDocumentById(listingId);
    if (!document) {
      await this.removeListingById(listingId);
      return;
    }

    await this.indexDocument(document);
  }

  async removeListingById(listingId: string): Promise<void> {
    await this.ensureIndexExists();

    const response = await this.request(`/${SEARCH_INDEX_NAME}/_doc/${listingId}`, {
      method: 'DELETE',
      parseJson: false,
    });

    if (response.status === 404) {
      return;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`OpenSearch delete failed (${response.status}) for listing ${listingId}.`);
    }
  }

  async reindexAllPublishedListings(batchSize = 200): Promise<number> {
    await this.ensureIndexExists();
    await this.clearAllDocuments();

    let offset = 0;
    let indexedCount = 0;

    while (true) {
      const documents = await this.listingsRepository.listPublishedSearchIndexDocuments(
        batchSize,
        offset,
      );

      if (documents.length === 0) {
        break;
      }

      for (const document of documents) {
        await this.indexDocument(document);
      }

      indexedCount += documents.length;
      offset += documents.length;
    }

    await this.request(`/${SEARCH_INDEX_NAME}/_refresh`, { method: 'POST', parseJson: false });
    return indexedCount;
  }

  async searchPublished(query: SearchListingsQueryDto): Promise<SearchPublishedResultRecord> {
    await this.ensureIndexExists();
    const referencePoint = await this.listingsRepository.resolveLocationCentroid(
      query.locationIntent,
    );

    const response = await this.request(`/${SEARCH_INDEX_NAME}/_search`, {
      method: 'POST',
      body: this.buildSearchRequestBody(query, referencePoint),
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch search failed (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }

    const { listingIds, total } = this.extractSearchListingIds(response.body);
    if (listingIds.length === 0) {
      return {
        items: [],
        total,
      };
    }

    const indexedListings = await this.listingsRepository.listPublishedByIds(listingIds);
    const listingsById = new Map(indexedListings.map((listing) => [listing.id, listing]));
    const orderedItems = listingIds.flatMap((listingId) => {
      const listing = listingsById.get(listingId);
      return listing ? [listing] : [];
    });

    return {
      items: orderedItems,
      total,
    };
  }

  private async clearAllDocuments(): Promise<void> {
    const response = await this.request(`/${SEARCH_INDEX_NAME}/_delete_by_query?refresh=true`, {
      method: 'POST',
      body: {
        query: {
          match_all: {},
        },
      },
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch delete-by-query failed (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }
  }

  private async indexDocument(document: SearchIndexDocumentRecord): Promise<void> {
    const response = await this.request(`/${SEARCH_INDEX_NAME}/_doc/${document.id}`, {
      method: 'PUT',
      body: document,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch index document failed (${response.status}) for listing ${document.id}: ${JSON.stringify(
          response.body,
        )}`,
      );
    }
  }

  private buildSearchRequestBody(
    query: SearchListingsQueryDto,
    referencePoint: LocationCentroid | null,
  ): Record<string, unknown> {
    const filters: Record<string, unknown>[] = [{ term: { status: 'published' } }];
    const must: Record<string, unknown>[] = [];

    if (query.queryText) {
      must.push({
        multi_match: {
          query: query.queryText,
          fields: ['title^3', 'description', 'comuneName^2', 'provinceName', 'regionName'],
          type: 'best_fields',
          operator: 'and',
        },
      });
    }

    const locationIntent = query.locationIntent;
    if (locationIntent) {
      if (locationIntent.scope === 'region' && locationIntent.regionId) {
        filters.push({ term: { regionId: locationIntent.regionId } });
      }

      if (
        (locationIntent.scope === 'province' || locationIntent.scope === 'comune_plus_province') &&
        locationIntent.provinceId
      ) {
        filters.push({ term: { provinceId: locationIntent.provinceId } });
      }

      if (locationIntent.scope === 'comune' && locationIntent.comuneId) {
        filters.push({ term: { comuneId: locationIntent.comuneId } });
      }
    }

    if (query.listingType) {
      filters.push(this.buildCaseInsensitiveKeywordFilter('listingType', query.listingType));
    }

    if (query.priceMin !== null || query.priceMax !== null) {
      const range: Record<string, number> = {};
      if (query.priceMin !== null) {
        range.gte = query.priceMin;
      }
      if (query.priceMax !== null) {
        range.lte = query.priceMax;
      }

      filters.push({
        range: {
          priceAmount: range,
        },
      });
    }

    if (query.ageText) {
      filters.push({
        match: {
          ageText: {
            query: query.ageText,
            operator: 'and',
          },
        },
      });
    }

    if (query.sex) {
      filters.push(this.buildCaseInsensitiveKeywordFilter('sex', query.sex));
    }

    if (query.breed) {
      filters.push({
        wildcard: {
          breed: {
            value: `*${this.escapeWildcardValue(query.breed)}*`,
            case_insensitive: true,
          },
        },
      });
    }

    const boolQuery: Record<string, unknown> = {
      filter: filters,
    };

    if (must.length > 0) {
      boolQuery.must = must;
    }

    const shouldApplySponsoredBoost = query.sort === 'relevance' && Boolean(query.queryText);

    return {
      from: query.offset,
      size: query.limit,
      track_total_hits: true,
      query: shouldApplySponsoredBoost
        ? this.buildSponsoredFunctionScoreQuery(boolQuery)
        : {
            bool: boolQuery,
          },
      sort: this.buildSortClause(query, referencePoint),
    };
  }

  private buildSponsoredFunctionScoreQuery(
    boolQuery: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      function_score: {
        query: {
          bool: boolQuery,
        },
        functions: [
          {
            filter: {
              term: {
                isSponsored: true,
              },
            },
            field_value_factor: {
              field: 'promotionWeight',
              modifier: 'sqrt',
              missing: 1,
            },
          },
        ],
        score_mode: 'multiply',
        boost_mode: 'multiply',
        max_boost: SPONSORED_MAX_BOOST,
      },
    };
  }

  private buildSortClause(
    query: SearchListingsQueryDto,
    referencePoint: LocationCentroid | null,
  ): Array<Record<string, unknown>> {
    const newestSort: Array<Record<string, unknown>> = [
      { publishedAt: { order: 'desc', missing: '_last' } },
      { createdAt: { order: 'desc' } },
      { id: { order: 'desc' } },
    ];
    const geoDistanceSort = this.buildGeoDistanceSort(referencePoint);

    if (query.sort === 'newest') {
      if (geoDistanceSort) {
        return [newestSort[0], geoDistanceSort, ...newestSort.slice(1)];
      }

      return newestSort;
    }

    if (query.sort === 'price_asc') {
      return [
        { priceAmount: { order: 'asc', missing: '_last' } },
        ...(geoDistanceSort ? [geoDistanceSort] : []),
        ...newestSort,
      ];
    }

    if (query.sort === 'price_desc') {
      return [
        { priceAmount: { order: 'desc', missing: '_last' } },
        ...(geoDistanceSort ? [geoDistanceSort] : []),
        ...newestSort,
      ];
    }

    if (query.sort === 'relevance' && query.queryText) {
      return [
        { _score: { order: 'desc' } },
        ...(geoDistanceSort ? [geoDistanceSort] : []),
        ...newestSort,
      ];
    }

    if (query.sort === 'relevance' && geoDistanceSort) {
      return [geoDistanceSort, ...newestSort];
    }

    return newestSort;
  }

  private buildGeoDistanceSort(
    referencePoint: LocationCentroid | null,
  ): Record<string, unknown> | null {
    if (!referencePoint) {
      return null;
    }

    return {
      _geo_distance: {
        location: {
          lat: referencePoint.lat,
          lon: referencePoint.lon,
        },
        order: 'asc',
        unit: 'km',
        distance_type: 'arc',
        ignore_unmapped: true,
      },
    };
  }

  private buildCaseInsensitiveKeywordFilter(
    fieldName: string,
    rawValue: string,
  ): Record<string, unknown> {
    const normalized = rawValue.trim();
    if (!normalized) {
      return { term: { [fieldName]: rawValue } };
    }

    const variants = Array.from(
      new Set([normalized, normalized.toLowerCase(), normalized.toUpperCase()]),
    );

    if (variants.length === 1) {
      return {
        term: {
          [fieldName]: variants[0],
        },
      };
    }

    return {
      bool: {
        should: variants.map((variant) => ({
          term: {
            [fieldName]: variant,
          },
        })),
        minimum_should_match: 1,
      },
    };
  }

  private escapeWildcardValue(value: string): string {
    return value.replace(/[\\*?]/g, '\\$&');
  }

  private extractSearchListingIds(payload: unknown): { listingIds: string[]; total: number } {
    const parsedPayload = this.asRecord(payload);
    if (!parsedPayload) {
      return { listingIds: [], total: 0 };
    }

    const hitsSection = this.asRecord(parsedPayload.hits);
    const hitsArrayRaw = Array.isArray(hitsSection?.hits) ? hitsSection.hits : [];
    const listingIds = hitsArrayRaw.flatMap((hit) => {
      if (typeof hit !== 'object' || hit === null || Array.isArray(hit)) {
        return [];
      }

      const id = (hit as OpenSearchSearchHit)._id;
      return typeof id === 'string' && id.length > 0 ? [id] : [];
    });

    const totalRaw = hitsSection?.total;
    const total =
      typeof totalRaw === 'number'
        ? totalRaw
        : typeof totalRaw === 'object' &&
            totalRaw !== null &&
            typeof (totalRaw as Record<string, unknown>).value === 'number'
          ? (totalRaw as Record<string, number>).value
          : listingIds.length;

    return {
      listingIds,
      total: Number.isFinite(total) ? total : 0,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private async request(
    path: string,
    options: {
      method?: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD';
      body?: unknown;
      parseJson?: boolean;
    } = {},
  ): Promise<OpenSearchResponse> {
    const method = options.method ?? 'GET';
    const parseJson = options.parseJson ?? true;
    const url = `${this.opensearchBaseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: options.body
        ? {
            'Content-Type': 'application/json',
          }
        : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!parseJson || response.status === 204 || response.headers.get('content-length') === '0') {
      return {
        status: response.status,
        body: null,
      };
    }

    const text = await response.text();
    if (!text) {
      return {
        status: response.status,
        body: null,
      };
    }

    try {
      return {
        status: response.status,
        body: JSON.parse(text),
      };
    } catch {
      return {
        status: response.status,
        body: text,
      };
    }
  }
}
