'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

interface FavoriteHeartButtonProps {
  listingId: string;
}

const FAVORITES_STORAGE_KEY = 'adottaungatto:web:favorites';

const readFavorites = (): string[] => {
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

    return parsedValue.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};

const writeFavorites = (favoriteIds: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
};

export function FavoriteHeartButton({ listingId }: FavoriteHeartButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const buttonLabel = useMemo(
    () => (isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'),
    [isFavorite],
  );

  useEffect(() => {
    const favoriteIds = new Set(readFavorites());
    setIsFavorite(favoriteIds.has(listingId));

    const onStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }

      const refreshedFavorites = new Set(readFavorites());
      setIsFavorite(refreshedFavorites.has(listingId));
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [listingId]);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const favoriteIds = new Set(readFavorites());
    if (favoriteIds.has(listingId)) {
      favoriteIds.delete(listingId);
      setIsFavorite(false);
    } else {
      favoriteIds.add(listingId);
      setIsFavorite(true);
    }

    writeFavorites([...favoriteIds]);
  };

  return (
    <button
      aria-label={buttonLabel}
      aria-pressed={isFavorite}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e7ec] bg-white/90 text-[#101828] shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-colors hover:bg-white"
      onClick={handleToggle}
      type="button"
    >
      <svg
        aria-hidden="true"
        fill={isFavorite ? 'currentColor' : 'none'}
        focusable="false"
        height="20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="20"
      >
        <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L4.6 14.4 12 21.8l7.4-7.4 1.4-1.4a5.2 5.2 0 0 0 0-7.4Z" />
      </svg>
    </button>
  );
}
