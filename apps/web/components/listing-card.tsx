'use client';

import type { ListingCardData } from '@adottaungatto/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  motionPresets,
} from '@adottaungatto/ui';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface ListingCardProps {
  listing: ListingCardData;
  onToggleFavorite?: (listingId: string) => void;
  isFavorite?: boolean;
}

const formatCurrency = (price: number | null, currency: string) => {
  if (price === null) {
    return 'Prezzo non indicato';
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDate = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(rawDate));

const getListingTypeSearchHref = (listingType: string) => {
  const normalized = listingType.trim().toLowerCase();
  if (!normalized) {
    return '/cerca';
  }

  return `/cerca?listingType=${encodeURIComponent(normalized)}`;
};

const formatListingTypeLabel = (listingType: string) => {
  const normalized = listingType.trim().toLowerCase();
  if (normalized === 'adozione') {
    return 'Adozione';
  }
  if (normalized === 'stallo') {
    return 'Stallo';
  }
  if (normalized === 'segnalazione') {
    return 'Segnalazione';
  }
  return listingType;
};

export function ListingCard({ listing, onToggleFavorite, isFavorite = false }: ListingCardProps) {
  const primaryMedia = listing.media.find((media) => media.isPrimary) ?? listing.media[0];
  const listingTypeHref = getListingTypeSearchHref(listing.listingType);

  return (
    <motion.article
      transition={motionPresets.hoverLift.transition}
      whileHover={motionPresets.hoverLift.whileHover}
      whileTap={motionPresets.hoverLift.whileTap}
    >
      <Card className="h-full overflow-hidden rounded-3xl border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="relative">
          <Image
            alt={primaryMedia.alt}
            className="h-52 w-full object-cover"
            height={primaryMedia.height}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            src={primaryMedia.src}
            width={primaryMedia.width}
          />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Link
              aria-label={`Filtra annunci per ${formatListingTypeLabel(listing.listingType)}`}
              className="inline-flex"
              href={listingTypeHref}
            >
              <Badge
                className="cursor-pointer border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)] text-[var(--color-text)] hover:border-[var(--color-primary)]/50"
                variant="secondary"
              >
                {formatListingTypeLabel(listing.listingType)}
              </Badge>
            </Link>
            {listing.isVerifiedSeller ? <Badge variant="success">Verificato</Badge> : null}
          </div>
        </div>

        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-lg">{listing.title}</CardTitle>
            {onToggleFavorite ? (
              <button
                aria-label={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)]"
                onClick={() => onToggleFavorite(listing.id)}
                type="button"
              >
                {isFavorite ? 'Salvato' : 'Preferito'}
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {listing.city} ({listing.province}) - {listing.region}
            {listing.distanceKm !== null ? ` - ${listing.distanceKm.toFixed(1)} km` : ''}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="line-clamp-3 text-sm text-[var(--color-text-muted)]">
            {listing.description}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
            <span>Età: {listing.ageText}</span>
            <span>Sesso: {listing.sex}</span>
            <span className="col-span-2">
              Prezzo:{' '}
              <strong className="text-[var(--color-text)]">
                {formatCurrency(listing.priceAmount, listing.currency)}
              </strong>
            </span>
            <span className="col-span-2">Pubblicato: {formatDate(listing.publishedAt)}</span>
          </div>
          <div className="flex gap-2">
            <Link className="w-full" href={`/annunci/${listing.slug}`}>
              <Button className="w-full">Apri dettaglio</Button>
            </Link>
            <Link className="hidden sm:block" href={`/profilo/${listing.sellerUsername}`}>
              <Button variant="outline">Inserzionista</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}
