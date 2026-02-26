'use client';

import { Card, CardContent, Skeleton } from '@adottaungatto/ui';
import { useEffect, useMemo, useState } from 'react';
import { ListingCard } from '../../components/listing-card';
import {
  getMockFavoriteItems,
  seedMockFavorites,
  toggleMockFavorite,
} from '../../lib/mock-client-store';
import { mockFavoriteListingIds } from '../../mocks/engagement';
import { mockListings } from '../../mocks/listings';

export default function FavoritesPage() {
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    seedMockFavorites(mockFavoriteListingIds);
    setFavoriteIds(getMockFavoriteItems().map((item) => item.listingId));
    const timeout = window.setTimeout(() => setLoading(false), 250);
    return () => window.clearTimeout(timeout);
  }, []);

  const favoriteListings = useMemo(
    () => mockListings.filter((listing) => favoriteIds.includes(listing.id)),
    [favoriteIds],
  );

  const onToggleFavorite = (listingId: string) => {
    const next = toggleMockFavorite(listingId);
    setFavoriteIds(next.map((item) => item.listingId));
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1280px] space-y-4 px-4 pb-12 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-60" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-[380px] w-full" />
          <Skeleton className="h-[380px] w-full" />
          <Skeleton className="h-[380px] w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-4 px-4 pb-12 sm:px-6 lg:px-8">
      <h1>I tuoi preferiti</h1>
      {favoriteListings.length === 0 ? (
        <Card className="border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="space-y-2 py-10 text-center">
            <p className="text-base font-semibold text-[var(--color-text)]">
              Nessun annuncio salvato
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Aggiungi annunci ai preferiti dalla ricerca per ritrovarli subito qui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favoriteListings.map((listing) => (
            <ListingCard
              isFavorite
              key={listing.id}
              listing={listing}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </main>
  );
}
