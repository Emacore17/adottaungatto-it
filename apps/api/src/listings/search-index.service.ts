import { loadApiEnv } from '@adottaungatto/config';
import {
  NO_BREED_FILTER,
  SEARCH_INDEX_LEGACY_NAME,
  SEARCH_INDEX_MAPPING,
  SEARCH_INDEX_READ_ALIAS,
  SEARCH_INDEX_WRITE_ALIAS,
  buildVersionedSearchIndexName,
} from '@adottaungatto/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import {
  ListingsRepository,
  type LocationCentroid,
  type SearchIndexDocumentRecord,
  type SearchPublishedResultRecord,
} from './listings.repository';
const SPONSORED_MAX_BOOST = 1.2;

type OpenSearchResponse = {
  status: number;
  body: unknown;
};

type OpenSearchAliasResponse = Record<string, unknown>;
type OpenSearchSearchHit = {
  _id?: string;
};
type OpenSearchBulkItemResponse = {
  index?: {
    _id?: string;
    status?: number;
    error?: unknown;
  };
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
    return SEARCH_INDEX_READ_ALIAS;
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

    await this.ensureAliasesReady();
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

    const response = await this.request(`/${SEARCH_INDEX_WRITE_ALIAS}/_doc/${listingId}`, {
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
    const currentReadTargets = await this.listAliasTargets(SEARCH_INDEX_READ_ALIAS);
    const currentWriteTargets = await this.listAliasTargets(SEARCH_INDEX_WRITE_ALIAS);
    this.assertAliasTargetsAreConsistent(currentReadTargets, currentWriteTargets);

    const nextIndexName = await this.createVersionedIndex();

    let offset = 0;
    let indexedCount = 0;

    try {
      while (true) {
        const documents = await this.listingsRepository.listPublishedSearchIndexDocuments(
          batchSize,
          offset,
        );

        if (documents.length === 0) {
          break;
        }

        await this.bulkIndexDocuments(nextIndexName, documents);
        indexedCount += documents.length;
        offset += documents.length;
      }

      await this.refreshIndex(nextIndexName);
      await this.swapAliases(nextIndexName, currentReadTargets, currentWriteTargets);
      this.logger.log(
        `OpenSearch reindex completed. activeIndex="${nextIndexName}" indexed=${indexedCount}.`,
      );

      return indexedCount;
    } catch (error) {
      await this.deleteIndexIfExists(nextIndexName);
      throw error;
    }
  }

  async searchPublished(query: SearchListingsQueryDto): Promise<SearchPublishedResultRecord> {
    await this.ensureIndexExists();
    const referencePoint =
      query.referencePoint ??
      (await this.listingsRepository.resolveLocationCentroid(query.locationIntent));

    const response = await this.request(`/${SEARCH_INDEX_READ_ALIAS}/_search`, {
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

  private async indexDocument(document: SearchIndexDocumentRecord): Promise<void> {
    const response = await this.request(`/${SEARCH_INDEX_WRITE_ALIAS}/_doc/${document.id}`, {
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

  private async ensureAliasesReady(): Promise<void> {
    const readTargets = await this.listAliasTargets(SEARCH_INDEX_READ_ALIAS);
    const writeTargets = await this.listAliasTargets(SEARCH_INDEX_WRITE_ALIAS);
    this.assertAliasTargetsAreConsistent(readTargets, writeTargets);

    if (readTargets.length === 1 && writeTargets.length === 1) {
      return;
    }

    const bootstrapIndexName = await this.resolveBootstrapIndexName(readTargets, writeTargets);
    await this.swapAliases(bootstrapIndexName, readTargets, writeTargets);

    if (readTargets.length === 0 && writeTargets.length === 0) {
      this.logger.log(
        `OpenSearch aliases initialized on "${bootstrapIndexName}" (${SEARCH_INDEX_READ_ALIAS}, ${SEARCH_INDEX_WRITE_ALIAS}).`,
      );
      return;
    }

    this.logger.warn(
      `OpenSearch aliases repaired on "${bootstrapIndexName}" (${SEARCH_INDEX_READ_ALIAS}, ${SEARCH_INDEX_WRITE_ALIAS}).`,
    );
  }

  private assertAliasTargetsAreConsistent(
    readTargets: string[],
    writeTargets: string[],
  ): void {
    if (readTargets.length > 1) {
      throw new Error(
        `${SEARCH_INDEX_READ_ALIAS} points to multiple indices: ${readTargets.join(', ')}.`,
      );
    }

    if (writeTargets.length > 1) {
      throw new Error(
        `${SEARCH_INDEX_WRITE_ALIAS} points to multiple indices: ${writeTargets.join(', ')}.`,
      );
    }

    if (
      readTargets.length === 1 &&
      writeTargets.length === 1 &&
      readTargets[0] !== writeTargets[0]
    ) {
      throw new Error(
        `Search aliases are inconsistent: ${SEARCH_INDEX_READ_ALIAS}=${readTargets[0]}, ${SEARCH_INDEX_WRITE_ALIAS}=${writeTargets[0]}.`,
      );
    }
  }

  private async resolveBootstrapIndexName(
    readTargets: string[],
    writeTargets: string[],
  ): Promise<string> {
    const existingTarget = readTargets[0] ?? writeTargets[0];
    if (existingTarget) {
      return existingTarget;
    }

    if (await this.indexExists(SEARCH_INDEX_LEGACY_NAME)) {
      return SEARCH_INDEX_LEGACY_NAME;
    }

    const createdIndexName = await this.createVersionedIndex();
    this.logger.log(`OpenSearch bootstrap index "${createdIndexName}" created.`);
    return createdIndexName;
  }

  private async createVersionedIndex(): Promise<string> {
    const baseToken = Date.now().toString(36);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const versionToken = attempt === 0 ? baseToken : `${baseToken}_${attempt}`;
      const indexName = buildVersionedSearchIndexName(versionToken);
      if (await this.indexExists(indexName)) {
        continue;
      }

      await this.createIndex(indexName);
      return indexName;
    }

    throw new Error('Unable to allocate a unique OpenSearch versioned index name.');
  }

  private async createIndex(indexName: string): Promise<void> {
    const createResponse = await this.request(`/${indexName}`, {
      method: 'PUT',
      body: SEARCH_INDEX_MAPPING,
    });

    if (createResponse.status < 200 || createResponse.status >= 300) {
      throw new Error(
        `OpenSearch index creation failed (${createResponse.status}) for ${indexName}: ${JSON.stringify(
          createResponse.body,
        )}`,
      );
    }
  }

  private async refreshIndex(indexName: string): Promise<void> {
    const response = await this.request(`/${indexName}/_refresh`, {
      method: 'POST',
      parseJson: false,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`OpenSearch refresh failed (${response.status}) for index ${indexName}.`);
    }
  }

  private async deleteIndexIfExists(indexName: string): Promise<void> {
    try {
      const response = await this.request(`/${indexName}`, {
        method: 'DELETE',
        parseJson: false,
      });

      if (response.status === 404) {
        return;
      }

      if (response.status < 200 || response.status >= 300) {
        this.logger.warn(`Failed to delete OpenSearch index "${indexName}" after reindex error.`);
      }
    } catch {
      this.logger.warn(`Failed to delete OpenSearch index "${indexName}" after reindex error.`);
    }
  }

  private async swapAliases(
    targetIndexName: string,
    currentReadTargets: string[],
    currentWriteTargets: string[],
  ): Promise<void> {
    const actions: Array<Record<'add' | 'remove', { index: string; alias: string }> | {
      add: { index: string; alias: string };
    } | {
      remove: { index: string; alias: string };
    }> = [];

    for (const indexName of currentReadTargets) {
      if (indexName === targetIndexName) {
        continue;
      }

      actions.push({
        remove: {
          index: indexName,
          alias: SEARCH_INDEX_READ_ALIAS,
        },
      });
    }

    for (const indexName of currentWriteTargets) {
      if (indexName === targetIndexName) {
        continue;
      }

      actions.push({
        remove: {
          index: indexName,
          alias: SEARCH_INDEX_WRITE_ALIAS,
        },
      });
    }

    if (!currentReadTargets.includes(targetIndexName)) {
      actions.push({
        add: {
          index: targetIndexName,
          alias: SEARCH_INDEX_READ_ALIAS,
        },
      });
    }

    if (!currentWriteTargets.includes(targetIndexName)) {
      actions.push({
        add: {
          index: targetIndexName,
          alias: SEARCH_INDEX_WRITE_ALIAS,
        },
      });
    }

    if (actions.length === 0) {
      return;
    }

    const response = await this.request('/_aliases', {
      method: 'POST',
      body: {
        actions,
      },
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch alias swap failed (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }
  }

  private async listAliasTargets(aliasName: string): Promise<string[]> {
    const response = await this.request(`/_alias/${aliasName}`, {
      method: 'GET',
    });

    if (response.status === 404) {
      return [];
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch alias lookup failed (${response.status}) for ${aliasName}: ${JSON.stringify(
          response.body,
        )}`,
      );
    }

    const payload = this.asRecord(response.body) as OpenSearchAliasResponse | null;
    if (!payload) {
      return [];
    }

    return Object.keys(payload).sort((left, right) => left.localeCompare(right));
  }

  private async indexExists(indexName: string): Promise<boolean> {
    const response = await this.request(`/${indexName}`, {
      method: 'HEAD',
      parseJson: false,
    });

    if (response.status === 404) {
      return false;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`OpenSearch index check failed (${response.status}) for ${indexName}.`);
    }

    return true;
  }

  private async bulkIndexDocuments(
    indexName: string,
    documents: SearchIndexDocumentRecord[],
  ): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    const operations = documents.flatMap((document) => [
      JSON.stringify({
        index: {
          _index: indexName,
          _id: document.id,
        },
      }),
      JSON.stringify(document),
    ]);

    const response = await this.request('/_bulk', {
      method: 'POST',
      body: `${operations.join('\n')}\n`,
      contentType: 'application/x-ndjson',
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch bulk index failed (${response.status}) for ${indexName}: ${JSON.stringify(
          response.body,
        )}`,
      );
    }

    const payload = this.asRecord(response.body);
    if (!payload || payload.errors !== true) {
      return;
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    const firstFailure = items.find((item) => {
      const bulkItem = this.asRecord(item) as OpenSearchBulkItemResponse | null;
      const result = bulkItem?.index;
      return Boolean(result?.error) || (result?.status ?? 200) >= 400;
    }) as OpenSearchBulkItemResponse | undefined;

    const failedDocumentId = firstFailure?.index?._id ?? 'unknown';
    throw new Error(`OpenSearch bulk index reported item errors for document ${failedDocumentId}.`);
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

    if (query.breed === NO_BREED_FILTER) {
      filters.push({
        bool: {
          should: [{ bool: { must_not: { exists: { field: 'breed' } } } }, { term: { breed: '' } }],
          minimum_should_match: 1,
        },
      });
    } else if (query.breed) {
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
      contentType?: string;
    } = {},
  ): Promise<OpenSearchResponse> {
    const method = options.method ?? 'GET';
    const parseJson = options.parseJson ?? true;
    const url = `${this.opensearchBaseUrl}${path}`;
    const hasBody = options.body !== undefined;
    const requestBody = hasBody
      ? typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
      : undefined;

    const response = await fetch(url, {
      method,
      headers: hasBody
        ? {
            'Content-Type': options.contentType ?? 'application/json',
          }
        : undefined,
      body: requestBody,
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
