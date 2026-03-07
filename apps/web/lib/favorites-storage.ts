export const FAVORITES_STORAGE_KEY = 'adottaungatto:web:favorites';
export const FAVORITES_UPDATED_EVENT = 'adottaungatto:favorites-updated';

const favoritesApiPath = '/api/users/me/favorites';

interface FavoriteApiError extends Error {
  status?: number;
}

const normalizeFavoriteIds = (favoriteIds: string[]) =>
  Array.from(
    new Set(
      favoriteIds
        .map((favoriteId) => favoriteId.trim())
        .filter((favoriteId) => favoriteId.length > 0),
    ),
  );

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseFavoriteIdsFromPayload = (value: unknown): string[] => {
  const record = asRecord(value);

  if (Array.isArray(record.favoriteIds)) {
    return normalizeFavoriteIds(
      record.favoriteIds.filter((item): item is string => typeof item === 'string'),
    );
  }

  if (Array.isArray(record.favorites)) {
    const listingIds = record.favorites
      .map((item) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return null;
        }

        const listingId = (item as Record<string, unknown>).listingId;
        return typeof listingId === 'string' ? listingId : null;
      })
      .filter((item): item is string => item !== null);

    return normalizeFavoriteIds(listingIds);
  }

  return [];
};

const parseErrorMessage = (payload: unknown, fallbackMessage: string): string => {
  const record = asRecord(payload);
  if (typeof record.message === 'string') {
    return record.message;
  }

  return fallbackMessage;
};

const dispatchFavoritesUpdatedEvent = (favoriteIds: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(FAVORITES_UPDATED_EVENT, {
      detail: {
        favoriteIds,
      },
    }),
  );
};

export const readFavoriteIds = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return normalizeFavoriteIds(
      parsedValue.filter((value): value is string => typeof value === 'string'),
    );
  } catch {
    return [];
  }
};

export const writeFavoriteIds = (favoriteIds: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedFavoriteIds = normalizeFavoriteIds(favoriteIds);
  const nextSerializedValue = JSON.stringify(normalizedFavoriteIds);
  const currentSerializedValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (currentSerializedValue === nextSerializedValue) {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, nextSerializedValue);
  dispatchFavoritesUpdatedEvent(normalizedFavoriteIds);
};

export const toggleFavoriteId = (listingId: string): string[] => {
  const normalizedListingId = listingId.trim();
  if (!normalizedListingId) {
    return readFavoriteIds();
  }

  const currentFavoriteIds = readFavoriteIds();
  const nextFavoriteIds = currentFavoriteIds.includes(normalizedListingId)
    ? currentFavoriteIds.filter((favoriteId) => favoriteId !== normalizedListingId)
    : [
        normalizedListingId,
        ...currentFavoriteIds.filter((favoriteId) => favoriteId !== normalizedListingId),
      ];

  writeFavoriteIds(nextFavoriteIds);
  return nextFavoriteIds;
};

const buildApiError = (
  payload: unknown,
  fallbackMessage: string,
  status: number,
): FavoriteApiError => {
  const error = new Error(parseErrorMessage(payload, fallbackMessage)) as FavoriteApiError;
  error.status = status;
  return error;
};

const requestFavoriteIds = async (input: {
  path: string;
  method: 'GET' | 'PUT' | 'DELETE';
  fallbackMessage: string;
}): Promise<string[]> => {
  const response = await fetch(input.path, {
    method: input.method,
    cache: 'no-store',
    headers: {
      accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw buildApiError(payload, input.fallbackMessage, response.status);
  }

  return parseFavoriteIdsFromPayload(payload);
};

let syncFavoriteIdsPromise: Promise<string[]> | null = null;

const mergeLocalFavoriteIdsIntoAccount = async (
  localFavoriteIds: string[],
  accountFavoriteIds: string[],
): Promise<string[]> => {
  const accountFavoriteIdsSet = new Set(accountFavoriteIds);
  const missingLocalFavoriteIds = localFavoriteIds.filter(
    (favoriteId) => !accountFavoriteIdsSet.has(favoriteId),
  );

  if (missingLocalFavoriteIds.length === 0) {
    return accountFavoriteIds;
  }

  let mergedFavoriteIds = accountFavoriteIds;
  const unsyncedFavoriteIds: string[] = [];

  for (const missingFavoriteId of missingLocalFavoriteIds) {
    try {
      mergedFavoriteIds = await requestFavoriteIds({
        path: `${favoritesApiPath}/${missingFavoriteId}`,
        method: 'PUT',
        fallbackMessage: 'Impossibile sincronizzare i preferiti.',
      });
    } catch (error) {
      const status = (error as FavoriteApiError).status;
      if (status === 401) {
        throw error;
      }

      // Keep unsynced local ids to avoid losing favorites when account sync is temporarily unavailable.
      unsyncedFavoriteIds.push(missingFavoriteId);
    }
  }

  if (unsyncedFavoriteIds.length > 0) {
    return normalizeFavoriteIds([...mergedFavoriteIds, ...unsyncedFavoriteIds]);
  }

  return mergedFavoriteIds;
};

export const syncFavoriteIdsFromApi = async (): Promise<string[]> => {
  if (typeof window === 'undefined') {
    return [];
  }

  if (!syncFavoriteIdsPromise) {
    syncFavoriteIdsPromise = (async () => {
      try {
        const localFavoriteIds = readFavoriteIds();
        const accountFavoriteIds = await requestFavoriteIds({
          path: favoritesApiPath,
          method: 'GET',
          fallbackMessage: 'Impossibile caricare i preferiti.',
        });
        const mergedFavoriteIds = await mergeLocalFavoriteIdsIntoAccount(
          localFavoriteIds,
          accountFavoriteIds,
        );
        writeFavoriteIds(mergedFavoriteIds);
        return mergedFavoriteIds;
      } finally {
        syncFavoriteIdsPromise = null;
      }
    })();
  }

  try {
    return await syncFavoriteIdsPromise;
  } catch (error) {
    if ((error as FavoriteApiError).status === 401) {
      return readFavoriteIds();
    }
    throw error;
  }
};

export const toggleFavoriteIdWithApi = async (
  listingId: string,
  isCurrentlyFavorite: boolean,
): Promise<{ favoriteIds: string[]; persistedToAccount: boolean }> => {
  const normalizedListingId = listingId.trim();
  if (!normalizedListingId) {
    return {
      favoriteIds: readFavoriteIds(),
      persistedToAccount: false,
    };
  }

  try {
    const favoriteIds = await requestFavoriteIds({
      path: `${favoritesApiPath}/${normalizedListingId}`,
      method: isCurrentlyFavorite ? 'DELETE' : 'PUT',
      fallbackMessage: 'Impossibile aggiornare i preferiti.',
    });
    writeFavoriteIds(favoriteIds);
    return {
      favoriteIds,
      persistedToAccount: true,
    };
  } catch (error) {
    if ((error as FavoriteApiError).status === 401) {
      return {
        favoriteIds: toggleFavoriteId(normalizedListingId),
        persistedToAccount: false,
      };
    }
    throw error;
  }
};
