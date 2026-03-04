import {
  SEARCH_INDEX_LEGACY_NAME,
  SEARCH_INDEX_MAPPING,
  SEARCH_INDEX_READ_ALIAS,
  SEARCH_INDEX_VERSION_PREFIX,
  SEARCH_INDEX_WRITE_ALIAS,
  buildVersionedSearchIndexName,
} from '@adottaungatto/types';

export const SEARCH_INDEX_ADMIN_CLIENT = Symbol('SEARCH_INDEX_ADMIN_CLIENT');

type OpenSearchResponse = {
  status: number;
  body: unknown;
};

type OpenSearchBulkItemResponse = {
  index?: {
    _id?: string;
    status?: number;
    error?: unknown;
  };
};

type OpenSearchManagedIndexRow = {
  index?: string;
  'docs.count'?: string;
  'creation.date'?: string;
  'store.size'?: string;
  status?: string;
};

type OpenSearchSearchHit = {
  _id?: string;
  sort?: unknown;
};

export type SearchManagedIndex = {
  index: string;
  docsCount: number;
  creationDate: number | null;
  storeSize: string | null;
  status: string | null;
};

export type SearchCleanupPlan = {
  inactiveManagedIndices: SearchManagedIndex[];
  retainedInactiveIndices: SearchManagedIndex[];
  indicesToDelete: SearchManagedIndex[];
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const isManagedSearchIndexName = (indexName: string): boolean =>
  indexName.startsWith(SEARCH_INDEX_VERSION_PREFIX);

export const isLegacySearchIndexName = (indexName: string): boolean =>
  indexName === SEARCH_INDEX_LEGACY_NAME;

const sortManagedIndicesNewestFirst = (
  left: SearchManagedIndex,
  right: SearchManagedIndex,
): number => {
  const leftCreationDate = left.creationDate ?? 0;
  const rightCreationDate = right.creationDate ?? 0;

  if (leftCreationDate !== rightCreationDate) {
    return rightCreationDate - leftCreationDate;
  }

  return right.index.localeCompare(left.index);
};

export const planSearchIndexCleanup = (input: {
  managedIndices: SearchManagedIndex[];
  protectedIndices: string[];
  retainInactiveCount: number;
}): SearchCleanupPlan => {
  const protectedIndices = new Set(input.protectedIndices);
  const inactiveManagedIndices = input.managedIndices
    .filter(
      (indexInfo) =>
        isManagedSearchIndexName(indexInfo.index) &&
        !isLegacySearchIndexName(indexInfo.index) &&
        !protectedIndices.has(indexInfo.index),
    )
    .sort(sortManagedIndicesNewestFirst);

  const retainInactiveCount = Math.max(0, input.retainInactiveCount);

  return {
    inactiveManagedIndices,
    retainedInactiveIndices: inactiveManagedIndices.slice(0, retainInactiveCount),
    indicesToDelete: inactiveManagedIndices.slice(retainInactiveCount),
  };
};

export const createSearchIndexAdminClient = (opensearchUrl: string) => {
  const baseUrl = opensearchUrl.replace(/\/+$/, '');

  const requestOpenSearch = async (
    path: string,
    options: {
      method?: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD';
      body?: unknown;
      parseJson?: boolean;
      contentType?: string;
    } = {},
  ): Promise<OpenSearchResponse> => {
    const hasBody = options.body !== undefined;
    const requestBody = hasBody
      ? typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
      : undefined;

    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: hasBody
        ? {
            'Content-Type': options.contentType ?? 'application/json',
          }
        : undefined,
      body: requestBody,
    });

    if (
      options.parseJson === false ||
      response.status === 204 ||
      response.headers.get('content-length') === '0'
    ) {
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
  };

  const listAliasTargets = async (aliasName: string): Promise<string[]> => {
    const response = await requestOpenSearch(`/_alias/${aliasName}`);

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

    const payload = asRecord(response.body);
    if (!payload) {
      return [];
    }

    return Object.keys(payload).sort((left, right) => left.localeCompare(right));
  };

  const assertAliasTargetsAreConsistent = (readTargets: string[], writeTargets: string[]) => {
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
  };

  const indexExists = async (indexName: string): Promise<boolean> => {
    const response = await requestOpenSearch(`/${indexName}`, {
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
  };

  const createIndex = async (indexName: string): Promise<void> => {
    const response = await requestOpenSearch(`/${indexName}`, {
      method: 'PUT',
      body: SEARCH_INDEX_MAPPING,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch index creation failed (${response.status}) for ${indexName}: ${JSON.stringify(
          response.body,
        )}`,
      );
    }
  };

  const createVersionedIndex = async (): Promise<string> => {
    const baseToken = Date.now().toString(36);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const versionToken = attempt === 0 ? baseToken : `${baseToken}_${attempt}`;
      const indexName = buildVersionedSearchIndexName(versionToken);
      if (await indexExists(indexName)) {
        continue;
      }

      await createIndex(indexName);
      return indexName;
    }

    throw new Error('Unable to allocate a unique OpenSearch versioned index name.');
  };

  const swapAliases = async (
    targetIndexName: string,
    currentReadTargets: string[],
    currentWriteTargets: string[],
  ): Promise<void> => {
    const actions: Array<{
      add?: { index: string; alias: string };
      remove?: { index: string; alias: string };
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

    const response = await requestOpenSearch('/_aliases', {
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
  };

  const resolveBootstrapIndexName = async (
    readTargets: string[],
    writeTargets: string[],
  ): Promise<string> => {
    const existingTarget = readTargets[0] ?? writeTargets[0];
    if (existingTarget) {
      return existingTarget;
    }

    if (await indexExists(SEARCH_INDEX_LEGACY_NAME)) {
      return SEARCH_INDEX_LEGACY_NAME;
    }

    return createVersionedIndex();
  };

  const ensureAliasesReady = async (logger?: {
    log?: (message: string) => void;
    warn?: (message: string) => void;
  }): Promise<{ readTargets: string[]; writeTargets: string[] }> => {
    const readTargets = await listAliasTargets(SEARCH_INDEX_READ_ALIAS);
    const writeTargets = await listAliasTargets(SEARCH_INDEX_WRITE_ALIAS);
    assertAliasTargetsAreConsistent(readTargets, writeTargets);

    if (readTargets.length === 1 && writeTargets.length === 1) {
      return {
        readTargets,
        writeTargets,
      };
    }

    const bootstrapIndexName = await resolveBootstrapIndexName(readTargets, writeTargets);
    await swapAliases(bootstrapIndexName, readTargets, writeTargets);

    if (readTargets.length === 0 && writeTargets.length === 0) {
      logger?.log?.(
        `OpenSearch aliases initialized on ${bootstrapIndexName} (${SEARCH_INDEX_READ_ALIAS}, ${SEARCH_INDEX_WRITE_ALIAS}).`,
      );
    } else {
      logger?.warn?.(
        `OpenSearch aliases repaired on ${bootstrapIndexName} (${SEARCH_INDEX_READ_ALIAS}, ${SEARCH_INDEX_WRITE_ALIAS}).`,
      );
    }

    return {
      readTargets: [bootstrapIndexName],
      writeTargets: [bootstrapIndexName],
    };
  };

  const refreshIndex = async (indexName: string): Promise<void> => {
    const response = await requestOpenSearch(`/${indexName}/_refresh`, {
      method: 'POST',
      parseJson: false,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`OpenSearch refresh failed (${response.status}) for index ${indexName}.`);
    }
  };

  const deleteIndexIfExists = async (indexName: string): Promise<boolean> => {
    const response = await requestOpenSearch(`/${indexName}`, {
      method: 'DELETE',
      parseJson: false,
    });

    if (response.status === 404) {
      return false;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`OpenSearch index delete failed (${response.status}) for ${indexName}.`);
    }

    return true;
  };

  const bulkIndexDocuments = async (
    indexName: string,
    documents: Array<Record<string, unknown>>,
  ): Promise<void> => {
    if (documents.length === 0) {
      return;
    }

    const operations = documents.flatMap((document) => [
      JSON.stringify({
        index: {
          _index: indexName,
          _id: String(document.id),
        },
      }),
      JSON.stringify(document),
    ]);

    const response = await requestOpenSearch('/_bulk', {
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

    const payload = asRecord(response.body);
    if (!payload || payload.errors !== true) {
      return;
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    const firstFailure = items.find((item) => {
      const bulkItem = asRecord(item) as OpenSearchBulkItemResponse | null;
      const result = bulkItem?.index;
      return Boolean(result?.error) || (result?.status ?? 200) >= 400;
    }) as OpenSearchBulkItemResponse | undefined;

    const failedDocumentId = firstFailure?.index?._id ?? 'unknown';
    throw new Error(`OpenSearch bulk index reported item errors for document ${failedDocumentId}.`);
  };

  const listManagedIndices = async (): Promise<SearchManagedIndex[]> => {
    const response = await requestOpenSearch(
      `/_cat/indices/${SEARCH_INDEX_VERSION_PREFIX}*?format=json&h=index,docs.count,creation.date,store.size,status`,
    );

    if (response.status === 404) {
      return [];
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch managed indices lookup failed (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }

    const rows = Array.isArray(response.body) ? response.body : [];

    return rows
      .flatMap((row) => {
        const parsedRow = asRecord(row) as OpenSearchManagedIndexRow | null;
        if (!parsedRow) {
          return [];
        }

        const indexName = parsedRow.index?.trim();

        if (!indexName || !isManagedSearchIndexName(indexName)) {
          return [];
        }

        const docsCount = Number.parseInt(parsedRow['docs.count'] ?? '0', 10) || 0;
        const creationDateRaw = parsedRow['creation.date'];
        const creationDate = creationDateRaw ? Number.parseInt(creationDateRaw, 10) : Number.NaN;

        return [
          {
            index: indexName,
            docsCount,
            creationDate: Number.isFinite(creationDate) ? creationDate : null,
            storeSize: parsedRow['store.size'] ?? null,
            status: parsedRow.status ?? null,
          } satisfies SearchManagedIndex,
        ];
      })
      .sort(sortManagedIndicesNewestFirst);
  };

  const countDocuments = async (indexNameOrAlias: string): Promise<number> => {
    const response = await requestOpenSearch(`/${indexNameOrAlias}/_count`, {
      method: 'POST',
      body: {
        query: {
          match_all: {},
        },
      },
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `OpenSearch count failed (${response.status}) for ${indexNameOrAlias}: ${JSON.stringify(
          response.body,
        )}`,
      );
    }

    const payload = asRecord(response.body);
    const count = payload?.count;

    return typeof count === 'number' && Number.isFinite(count) ? count : 0;
  };

  const listDocumentIds = async (
    indexNameOrAlias: string,
    batchSize: number,
  ): Promise<string[]> => {
    const ids: string[] = [];
    let searchAfter: unknown[] | null = null;

    while (true) {
      const body: Record<string, unknown> = {
        size: batchSize,
        _source: false,
        query: {
          match_all: {},
        },
        sort: [{ id: { order: 'asc' } }],
      };

      if (searchAfter) {
        body.search_after = searchAfter;
      }

      const response = await requestOpenSearch(`/${indexNameOrAlias}/_search`, {
        method: 'POST',
        body,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `OpenSearch search failed (${response.status}) for ${indexNameOrAlias}: ${JSON.stringify(
            response.body,
          )}`,
        );
      }

      const payload = asRecord(response.body);
      const hitsSection = asRecord(payload?.hits);
      const hits = Array.isArray(hitsSection?.hits) ? hitsSection.hits : [];

      if (hits.length === 0) {
        break;
      }

      let lastSort: unknown[] | null = null;
      for (const hit of hits) {
        const parsedHit = asRecord(hit) as OpenSearchSearchHit | null;
        if (typeof parsedHit?._id === 'string' && parsedHit._id.length > 0) {
          ids.push(parsedHit._id);
        }

        lastSort = Array.isArray(parsedHit?.sort) ? parsedHit.sort : null;
      }

      if (hits.length < batchSize || !lastSort) {
        break;
      }

      searchAfter = lastSort;
    }

    return ids;
  };

  return {
    requestOpenSearch,
    listAliasTargets,
    assertAliasTargetsAreConsistent,
    indexExists,
    createIndex,
    createVersionedIndex,
    swapAliases,
    resolveBootstrapIndexName,
    ensureAliasesReady,
    refreshIndex,
    deleteIndexIfExists,
    bulkIndexDocuments,
    listManagedIndices,
    countDocuments,
    listDocumentIds,
  };
};

export type SearchIndexAdminClient = ReturnType<typeof createSearchIndexAdminClient>;
