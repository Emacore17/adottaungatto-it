export const FAVORITES_STORAGE_KEY = 'adottaungatto:web:favorites';
export const FAVORITES_UPDATED_EVENT = 'adottaungatto:favorites-updated';

const normalizeFavoriteIds = (favoriteIds: string[]) =>
  Array.from(
    new Set(
      favoriteIds
        .map((favoriteId) => favoriteId.trim())
        .filter((favoriteId) => favoriteId.length > 0),
    ),
  );

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
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(normalizedFavoriteIds));
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
    : [normalizedListingId, ...currentFavoriteIds.filter((favoriteId) => favoriteId !== normalizedListingId)];

  writeFavoriteIds(nextFavoriteIds);
  return nextFavoriteIds;
};
