'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  FAVORITES_STORAGE_KEY,
  FAVORITES_UPDATED_EVENT,
  readFavoriteIds,
  toggleFavoriteId,
} from '../lib/favorites-storage';

interface FavoriteHeartButtonProps {
  listingId: string;
}

export function FavoriteHeartButton({ listingId }: FavoriteHeartButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const buttonLabel = useMemo(
    () => (isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'),
    [isFavorite],
  );

  useEffect(() => {
    const favoriteIds = new Set(readFavoriteIds());
    setIsFavorite(favoriteIds.has(listingId));

    const onStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }

      const refreshedFavorites = new Set(readFavoriteIds());
      setIsFavorite(refreshedFavorites.has(listingId));
    };

    const onFavoritesUpdated = () => {
      const refreshedFavorites = new Set(readFavoriteIds());
      setIsFavorite(refreshedFavorites.has(listingId));
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(FAVORITES_UPDATED_EVENT, onFavoritesUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(FAVORITES_UPDATED_EVENT, onFavoritesUpdated as EventListener);
    };
  }, [listingId]);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const nextFavoriteIds = toggleFavoriteId(listingId);
    setIsFavorite(nextFavoriteIds.includes(listingId));
  };

  return (
    <button
      aria-label={buttonLabel}
      aria-pressed={isFavorite}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-[var(--shadow-sm)] backdrop-blur-md transition-[color,background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${
        isFavorite
          ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] text-[var(--color-primary)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
      }`}
      onClick={handleToggle}
      title={buttonLabel}
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
