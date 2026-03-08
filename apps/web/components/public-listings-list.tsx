import { Card, CardDescription, CardHeader, CardTitle } from '@adottaungatto/ui';
import { CalendarDays, ChevronRight, CircleDollarSign, MapPin } from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyAmount, formatDate } from '../lib/formatters';
import { buildListingImageAlt } from '../lib/listing-image-alt';
import type { PublicListingSummary } from '../lib/listings';
import { FavoriteHeartButton } from './favorite-heart-button';
import { LinkButton } from './link-button';
import { ListingMediaPreview } from './listing-media-preview';
import { ListingSponsoredBadge } from './listing-sponsored-badge';

interface PublicListingsListProps {
  backToListingsHref?: string | null;
  emptyDescription?: string;
  emptyTitle?: string;
  listings: PublicListingSummary[];
}

const formatListingTypeLabel = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const formatDistanceLabel = (value: number | null) => {
  if (typeof value !== 'number') {
    return null;
  }

  return `${new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
    minimumFractionDigits: 0,
  }).format(value)} km`;
};

export function PublicListingsList({
  backToListingsHref = null,
  emptyDescription = 'Prova a modificare i filtri oppure amplia la ricerca.',
  emptyTitle = 'Nessun annuncio trovato.',
  listings,
}: PublicListingsListProps) {
  if (listings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
          <CardDescription>{emptyDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {listings.map((listing) => {
        const titleLabel = listing.title.trim() || 'Annuncio gatto';
        const descriptionLabel =
          listing.description.trim() || "Apri l'annuncio per leggere tutti i dettagli.";
        const breedLabel = listing.breed?.trim() ?? '';
        const normalizedSex = listing.sex.trim().toLowerCase();
        const sexLabel = normalizedSex
          ? `${normalizedSex.charAt(0).toUpperCase()}${normalizedSex.slice(1)}`
          : '';
        const catCount = Math.max(1, listing.catCount);
        const catCountLabel = `${catCount} ${catCount === 1 ? 'gatto' : 'gatti'}`;
        const ageLabel = listing.ageText.trim();
        const listingTypeValue = listing.listingType.trim();
        const listingTypeLabel = formatListingTypeLabel(listingTypeValue);
        const listingTypeNormalized = listingTypeValue.toLowerCase();
        const publishedLabel = formatDate(listing.publishedAt ?? listing.createdAt);
        const locationLabel = listing.provinceSigla
          ? `${listing.comuneName}, ${listing.provinceName} (${listing.provinceSigla})`
          : `${listing.comuneName}, ${listing.regionName}`;
        const distanceLabel = formatDistanceLabel(listing.distanceKm);
        const priceLabel =
          listingTypeNormalized.includes('adozion') ||
          !listing.priceAmount ||
          listing.priceAmount.trim().length === 0
            ? 'Adozione gratuita'
            : formatCurrencyAmount(listing.priceAmount, listing.currency);
        const previewMedia =
          listing.previewMedia && listing.previewMedia.length > 0
            ? listing.previewMedia
            : listing.primaryMedia
              ? [listing.primaryMedia]
              : [];
        const imageAlt = buildListingImageAlt({ title: titleLabel, breed: breedLabel || null });
        const listingDetailHref = backToListingsHref
          ? `/annunci/${listing.id}?backTo=${encodeURIComponent(backToListingsHref)}`
          : `/annunci/${listing.id}`;

        return (
          <article
            className={`group relative overflow-hidden rounded-[30px] border bg-[color:color-mix(in_srgb,var(--color-surface-elevated)_90%,white_10%)] shadow-[0_16px_44px_rgb(66_40_49_/_0.08)] transition-[border-color,box-shadow] duration-300 hover:border-[var(--color-border-strong)] hover:shadow-[0_24px_62px_rgb(66_40_49_/_0.12)] ${
              listing.isSponsored
                ? 'border-[color:color-mix(in_srgb,var(--color-primary)_35%,var(--color-border)_65%)]'
                : 'border-[var(--color-border)]'
            }`}
            key={listing.id}
          >
            {listing.isSponsored ? (
              <ListingSponsoredBadge className="absolute left-4 top-4 z-20" />
            ) : null}

            <div className="grid grid-cols-1 md:min-h-[232px] md:grid-cols-[minmax(250px,30%)_minmax(0,1fr)]">
              <Link
                className="relative isolate block h-full overflow-hidden rounded-t-[29px] border-b border-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 md:rounded-l-[29px] md:rounded-t-none md:border-b-0 md:border-r"
                href={listingDetailHref}
              >
                <ListingMediaPreview
                  imageAlt={imageAlt}
                  listingId={listing.id}
                  media={previewMedia}
                  mediaCount={listing.mediaCount}
                />
              </Link>

              <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2.5">
                    <h3 className="line-clamp-2 text-[1.12rem] font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-[1.25rem] md:text-[1.45rem]">
                      <Link
                        className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
                        href={listingDetailHref}
                      >
                        {titleLabel}
                      </Link>
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-[var(--color-text-muted)]">
                      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-xs font-semibold">
                        <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{locationLabel}</span>
                      </span>
                      {distanceLabel ? (
                        <span className="inline-flex items-center rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-xs font-semibold">
                          {distanceLabel}
                        </span>
                      ) : null}
                    </div>

                    <p className="line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)] md:text-[0.95rem]">
                      {descriptionLabel}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <FavoriteHeartButton listingId={listing.id} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                    {listingTypeLabel}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                    {catCountLabel}
                  </span>
                  {breedLabel ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                      {breedLabel}
                    </span>
                  ) : null}
                  {sexLabel ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                      {sexLabel}
                    </span>
                  ) : null}
                  {ageLabel ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                      {ageLabel}
                    </span>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays aria-hidden="true" className="h-4 w-4" />
                      {publishedLabel}
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-[var(--color-text)]">
                      <CircleDollarSign
                        aria-hidden="true"
                        className="h-4 w-4 text-[var(--color-primary)]"
                      />
                      {priceLabel}
                    </span>
                  </div>

                  <div className="flex w-full items-center gap-3 sm:w-auto">
                    <LinkButton
                      className="h-11 w-full justify-center rounded-full px-5 sm:w-auto"
                      href={listingDetailHref}
                    >
                      Vedi annuncio
                      <ChevronRight aria-hidden="true" className="ml-1 h-4 w-4" />
                    </LinkButton>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
