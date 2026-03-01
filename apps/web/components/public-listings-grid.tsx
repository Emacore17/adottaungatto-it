import { Card, CardDescription, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { formatCurrencyAmount, formatDate } from '../lib/formatters';
import type { PublicListingSummary } from '../lib/listings';
import { FavoriteHeartButton } from './favorite-heart-button';

interface PublicListingsGridProps {
  listings: PublicListingSummary[];
  layout?: 'grid' | 'list';
  emptyTitle?: string;
  emptyDescription?: string;
}

export function PublicListingsGrid({
  listings,
  layout = 'grid',
  emptyTitle = 'Nessun annuncio disponibile.',
  emptyDescription = 'Collega la nuova esperienza di ricerca quando il dominio funzionale sara ridefinito.',
}: PublicListingsGridProps) {
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

  const containerClassName =
    layout === 'list' ? 'grid gap-4 grid-cols-1' : 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3';
  const pillClassName =
    'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-[13px] font-semibold';

  return (
    <div className={containerClassName}>
      {listings.map((listing) => {
        const locationLabel = listing.provinceSigla
          ? `Gattile ${listing.comuneName}, ${listing.regionName} ${listing.provinceSigla}`
          : `Gattile ${listing.comuneName}, ${listing.regionName}`;
        const listingTypeRaw = listing.listingType?.trim() ?? '';
        const listingTypeNormalized = listingTypeRaw.toLowerCase();
        const listingTypeLabel = listingTypeRaw
          .replaceAll('_', ' ')
          .replace(/\b\w/g, (character) => character.toUpperCase());
        const isVendita = listingTypeNormalized.includes('vendit');
        const isAdozione = listingTypeNormalized.includes('adozion');
        const hasPrice = listing.priceAmount !== null && listing.priceAmount.trim().length > 0;
        const priceLabel = hasPrice
          ? formatCurrencyAmount(listing.priceAmount, listing.currency)
          : '';
        const footerActionLabel = isVendita
          ? hasPrice
            ? priceLabel
            : 'Vendita'
          : isAdozione
            ? 'Adozione'
            : listingTypeLabel || 'Annuncio';
        const titleLabel = listing.title.trim() || 'Bella Gattina Luna';
        const imageTitleLabel = titleLabel
          .replace(/^\[[^\]]+\]\s*/u, '')
          .replace(/\s*#\d+\s*$/u, '')
          .trim();
        const sexLabel = listing.sex.trim()
          ? `${listing.sex.trim()[0].toUpperCase()}${listing.sex.trim().slice(1)}`
          : '';
        const ageLabel = listing.ageText.trim();
        const breedLabel = listing.breed?.trim() ?? '';
        const publishedLabel = formatDate(listing.publishedAt ?? listing.createdAt);
        const imageStyle = listing.primaryMedia?.objectUrl
          ? {
              backgroundImage: `linear-gradient(135deg, var(--color-media-overlay-start) 0%, var(--color-media-overlay-end) 100%), url("${listing.primaryMedia.objectUrl}")`,
            }
          : {
              backgroundImage:
                'linear-gradient(135deg, var(--color-image-fallback-start) 0%, var(--color-image-fallback-mid) 45%, var(--color-image-fallback-end) 100%)',
            };

        return (
          <Link
            className="group block h-full focus-visible:outline-none"
            href={`/annunci/${listing.id}`}
            key={listing.id}
          >
            <article className="flex h-full min-h-[430px] flex-col overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-sm)] backdrop-blur-xl transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-lg)]">
              <div className="relative basis-3/5 overflow-hidden">
                <div
                  aria-label={imageTitleLabel || titleLabel}
                  className="h-full w-full bg-cover bg-center"
                  role="img"
                  style={imageStyle}
                />

                <div className="absolute right-4 top-4">
                  <FavoriteHeartButton listingId={listing.id} />
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--color-scrim)] via-black/12 to-transparent px-4 pb-4 pt-16">
                  <h3 className="line-clamp-2 text-center text-[22px] font-semibold leading-tight tracking-[-0.01em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                    {imageTitleLabel || titleLabel}
                  </h3>
                </div>
              </div>

              <div className="flex basis-2/5 flex-col bg-[var(--color-surface-elevated)] px-5 pb-5 pt-4 text-[var(--color-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)]">
                    <svg
                      aria-hidden="true"
                      fill="none"
                      focusable="false"
                      height="14"
                      viewBox="0 0 24 24"
                      width="14"
                    >
                      <path
                        d="M12 21s7-5.75 7-11a7 7 0 1 0-14 0c0 5.25 7 11 7 11Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="10" fill="currentColor" r="2.1" />
                    </svg>
                  </span>
                  <p className="line-clamp-1 text-[15px] font-medium tracking-[-0.01em]">
                    {locationLabel}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={pillClassName}>
                    <svg
                      aria-hidden="true"
                      fill="none"
                      focusable="false"
                      height="13"
                      viewBox="0 0 24 24"
                      width="13"
                    >
                      <circle cx="8" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="16" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.8" />
                      <path
                        d="M6 17c1.6-2 4.1-2.9 6-2.9s4.4.9 6 2.9"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                    1 gatto
                  </span>
                  {breedLabel ? (
                    <span className={pillClassName}>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        focusable="false"
                        height="13"
                        viewBox="0 0 24 24"
                        width="13"
                      >
                        <path
                          d="M8 8.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM16 8.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM5.8 13.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM18.2 13.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"
                          fill="currentColor"
                        />
                        <path
                          d="M12 19.5c-1.7 0-3-1.2-3-2.8 0-1.9 1.6-3.3 3-3.3s3 1.4 3 3.3c0 1.6-1.3 2.8-3 2.8Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      {breedLabel}
                    </span>
                  ) : null}
                  {sexLabel ? (
                    <span className={pillClassName}>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        focusable="false"
                        height="13"
                        viewBox="0 0 24 24"
                        width="13"
                      >
                        <circle cx="12" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.8" />
                        <path
                          d="M5.5 18c1.8-3.3 11.2-3.3 13 0"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      {sexLabel}
                    </span>
                  ) : null}
                  {ageLabel ? (
                    <span className={pillClassName}>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        focusable="false"
                        height="13"
                        viewBox="0 0 24 24"
                        width="13"
                      >
                        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                        <path
                          d="M12 7v5l3 2"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      {ageLabel}
                    </span>
                  ) : null}
                  {listingTypeLabel ? (
                    <span className={pillClassName}>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        focusable="false"
                        height="13"
                        viewBox="0 0 24 24"
                        width="13"
                      >
                        <path
                          d="M3 8.6A2.6 2.6 0 0 1 5.6 6h8.5a2.6 2.6 0 0 1 1.8.7l4 3.8a2.6 2.6 0 0 1 0 3.8l-4 3.8a2.6 2.6 0 0 1-1.8.7H5.6A2.6 2.6 0 0 1 3 16.2V8.6Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <circle cx="8" cy="12.4" fill="currentColor" r="1.3" />
                      </svg>
                      {listingTypeLabel}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-end justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                  <div className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[12px] font-medium">
                    <svg
                      aria-hidden="true"
                      fill="none"
                      focusable="false"
                      height="14"
                      viewBox="0 0 24 24"
                      width="14"
                    >
                      <rect
                        height="15"
                        rx="2.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        width="18"
                        x="3"
                        y="5"
                      />
                      <path
                        d="M8 3v4M16 3v4M3 10.5h18"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                    <span className="whitespace-nowrap">{publishedLabel}</span>
                  </div>

                  <div className="flex shrink-0 items-end gap-2">
                    <div className="text-right leading-tight">
                      <p className="whitespace-nowrap text-[16px] font-semibold">
                        {footerActionLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
