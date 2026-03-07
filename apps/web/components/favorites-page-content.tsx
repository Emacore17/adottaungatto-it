'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { PublicListingSummary } from '../lib/listings';
import {
  FAVORITES_STORAGE_KEY,
  FAVORITES_UPDATED_EVENT,
  readFavoriteIds,
  syncFavoriteIdsFromApi,
  writeFavoriteIds,
} from '../lib/favorites-storage';
import { LinkButton } from './link-button';
import { PublicListingsList } from './public-listings-list';

type FavoritesStatus = 'loading' | 'ready' | 'error';

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const isPublicListingSummary = (value: unknown): value is PublicListingSummary => {
  const record = asRecord(value);
  return typeof record.id === 'string' && typeof record.title === 'string';
};

const readMissingIds = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const buildFavoritesApiHref = (favoriteIds: string[]) => {
  const query = new URLSearchParams();
  for (const favoriteId of favoriteIds) {
    query.append('id', favoriteId);
  }

  return `/api/favorites/listings?${query.toString()}`;
};

export function FavoritesPageContent() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [listings, setListings] = useState<PublicListingSummary[]>([]);
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [status, setStatus] = useState<FavoritesStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshFavoriteIds = useCallback(() => {
    setFavoriteIds(readFavoriteIds());
    void syncFavoriteIdsFromApi()
      .then((favoriteIdsFromApi) => {
        setFavoriteIds(favoriteIdsFromApi);
      })
      .catch(() => {
        // Keep current local cache if server sync fails.
      });
  }, []);

  useEffect(() => {
    refreshFavoriteIds();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }

      refreshFavoriteIds();
    };

    const onFavoritesUpdated = () => {
      refreshFavoriteIds();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(FAVORITES_UPDATED_EVENT, onFavoritesUpdated as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(FAVORITES_UPDATED_EVENT, onFavoritesUpdated as EventListener);
    };
  }, [refreshFavoriteIds]);

  useEffect(() => {
    setListings((currentListings) =>
      currentListings.filter((listing) => favoriteIds.includes(listing.id)),
    );
    setMissingIds((currentMissingIds) =>
      currentMissingIds.filter((favoriteId) => favoriteIds.includes(favoriteId)),
    );

    if (favoriteIds.length === 0) {
      setListings([]);
      setMissingIds([]);
      setStatus('ready');
      setErrorMessage(null);
      return;
    }

    const abortController = new AbortController();
    let active = true;

    setStatus('loading');
    setErrorMessage(null);

    void (async () => {
      try {
        const response = await fetch(buildFavoritesApiHref(favoriteIds), {
          cache: 'no-store',
          signal: abortController.signal,
        });
        const payload = asRecord(await response.json().catch(() => null));

        if (!response.ok) {
          throw new Error(
            typeof payload.message === 'string'
              ? payload.message
              : 'Impossibile caricare i preferiti.',
          );
        }

        const nextListings = Array.isArray(payload.listings)
          ? payload.listings.filter((item): item is PublicListingSummary => isPublicListingSummary(item))
          : [];
        const nextMissingIds = readMissingIds(payload.missingIds);

        if (!active) {
          return;
        }

        setListings(nextListings);
        setMissingIds(nextMissingIds);
        setStatus('ready');

        if (nextMissingIds.length > 0) {
          writeFavoriteIds(favoriteIds.filter((favoriteId) => !nextMissingIds.includes(favoriteId)));
        }
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) {
          return;
        }

        setStatus('error');
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : 'Impossibile caricare i preferiti in questo momento.',
        );
      }
    })();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [favoriteIds]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{favoriteIds.length} salvati</Badge>
              {status === 'loading' ? <Badge variant="outline">Aggiornamento</Badge> : null}
              {missingIds.length > 0 ? (
                <Badge variant="warning">{missingIds.length} non piu disponibili</Badge>
              ) : null}
            </div>
            <div className="space-y-2">
              <CardTitle>I tuoi annunci salvati</CardTitle>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                I cuori salvati da catalogo e dettaglio compaiono qui in modo persistente sul tuo
                account, pronti da riaprire anche da dispositivi diversi.
              </p>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <CardTitle>Azioni rapide</CardTitle>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Continua a esplorare il catalogo o torna al workspace per gestire annunci e
                messaggi.
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <LinkButton href="/annunci">Esplora annunci</LinkButton>
            <LinkButton href="/account" variant="outline">
              Torna all'account
            </LinkButton>
          </CardContent>
        </Card>
      </div>

      {status === 'loading' && listings.length === 0 ? (
        <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
          <CardContent className="flex items-center gap-3 py-8 text-sm text-[var(--color-text-muted)]">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Sto caricando i preferiti salvati.
          </CardContent>
        </Card>
      ) : null}

      {status === 'error' ? (
        <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
          <CardHeader className="space-y-3">
            <CardTitle>Impossibile aggiornare i preferiti</CardTitle>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              {errorMessage ?? 'Riprova tra poco oppure torna al catalogo.'}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                refreshFavoriteIds();
              }}
              type="button"
              variant="secondary"
            >
              Riprova
            </Button>
            <LinkButton href="/annunci" variant="outline">
              Vai al catalogo
            </LinkButton>
          </CardContent>
        </Card>
      ) : null}

      {status === 'ready' && favoriteIds.length === 0 ? (
        <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
          <CardHeader className="space-y-3">
            <CardTitle>Nessun preferito salvato</CardTitle>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              Usa il cuore nelle card o nel dettaglio annuncio per costruire una raccolta rapida da
              consultare in seguito.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <LinkButton href="/annunci">Scopri gli annunci</LinkButton>
            <LinkButton href="/messaggi" variant="outline">
              Apri messaggi
            </LinkButton>
          </CardContent>
        </Card>
      ) : null}

      {listings.length > 0 ? <PublicListingsList listings={listings} /> : null}
    </div>
  );
}
