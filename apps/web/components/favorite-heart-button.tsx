'use client';

import { Toast } from '@adottaungatto/ui';
import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  FAVORITES_STORAGE_KEY,
  FAVORITES_UPDATED_EVENT,
  readFavoriteIds,
  syncFavoriteIdsFromApi,
  toggleFavoriteIdWithApi,
} from '../lib/favorites-storage';

interface FavoriteHeartButtonProps {
  listingId: string;
}

type ToastState = {
  open: boolean;
  title: string;
  description?: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
};

export function FavoriteHeartButton({ listingId }: FavoriteHeartButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [hasShownGuestHint, setHasShownGuestHint] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'info',
  });
  const buttonLabel = useMemo(
    () => (isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'),
    [isFavorite],
  );

  useEffect(() => {
    let active = true;

    const applyFavoriteIds = (favoriteIds: string[]) => {
      if (!active) {
        return;
      }

      setIsFavorite(favoriteIds.includes(listingId));
    };

    const syncFromApi = () => {
      void syncFavoriteIdsFromApi()
        .then((syncedFavoriteIds) => {
          applyFavoriteIds(syncedFavoriteIds);
        })
        .catch(() => {
          // Ignore transient sync errors: current local state remains usable.
        });
    };

    applyFavoriteIds(readFavoriteIds());
    syncFromApi();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }

      applyFavoriteIds(readFavoriteIds());
    };

    const onFavoritesUpdated = () => {
      applyFavoriteIds(readFavoriteIds());
    };

    const onWindowFocus = () => {
      applyFavoriteIds(readFavoriteIds());
      syncFromApi();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onWindowFocus();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(FAVORITES_UPDATED_EVENT, onFavoritesUpdated as EventListener);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(FAVORITES_UPDATED_EVENT, onFavoritesUpdated as EventListener);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [listingId]);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isPending) {
      return;
    }

    const wasFavorite = isFavorite;
    setIsPending(true);
    setIsFavorite(!wasFavorite);

    void toggleFavoriteIdWithApi(listingId, wasFavorite)
      .then((result) => {
        const isNowFavorite = result.favoriteIds.includes(listingId);
        setIsFavorite(isNowFavorite);
        if (!result.persistedToAccount && !hasShownGuestHint) {
          setToast({
            open: true,
            title: isNowFavorite ? 'Aggiunto ai preferiti' : 'Rimosso dai preferiti',
            description:
              'Salvato solo su questo dispositivo. Accedi per sincronizzare i preferiti.',
            variant: 'info',
          });
          setHasShownGuestHint(true);
          return;
        }

        setToast({
          open: true,
          title: isNowFavorite ? 'Aggiunto ai preferiti' : 'Rimosso dai preferiti',
          description: isNowFavorite
            ? 'Puoi ritrovarlo nella pagina Preferiti.'
            : 'Puoi aggiungerlo di nuovo quando vuoi.',
          variant: 'success',
        });
      })
      .catch(() => {
        setIsFavorite(wasFavorite);
        setToast({
          open: true,
          title: 'Azione non riuscita',
          description: 'Impossibile aggiornare i preferiti in questo momento.',
          variant: 'danger',
        });
      })
      .finally(() => {
        setIsPending(false);
      });
  };

  return (
    <>
      <button
        aria-label={buttonLabel}
        aria-pressed={isFavorite}
        aria-busy={isPending}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-[var(--shadow-sm)] backdrop-blur-md transition-[color,background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${
          isFavorite
            ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] text-[var(--color-primary)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
        }`}
        disabled={isPending}
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

      <Toast
        description={toast.description}
        onOpenChange={(open) => setToast((currentValue) => ({ ...currentValue, open }))}
        open={toast.open}
        title={toast.title}
        variant={toast.variant}
      />
    </>
  );
}
