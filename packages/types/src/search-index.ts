export const SEARCH_INDEX_LEGACY_NAME = 'listings_v1';
export const SEARCH_INDEX_READ_ALIAS = 'listings_read';
export const SEARCH_INDEX_WRITE_ALIAS = 'listings_write';
export const SEARCH_INDEX_VERSION_PREFIX = 'listings_v';

export const SEARCH_INDEX_MAPPING = {
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

export const buildVersionedSearchIndexName = (versionToken = Date.now().toString(36)) =>
  `${SEARCH_INDEX_VERSION_PREFIX}${versionToken}`;
