import { Card, CardDescription, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { formatCurrencyAmount, formatDate } from '../lib/formatters';
import type { PublicListingSummary } from '../lib/listings';
import { FavoriteHeartButton } from './favorite-heart-button';

interface PublicListingsGridProps {
  listings: PublicListingSummary[];
  layout?: 'grid' | 'list';
  variant?: 'default' | 'featured';
  showDistance?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

const placeholderMediaFileNames = [
  'gattino-1.jpg',
  'gattino-2.webp',
  'gattino-3.png',
  'gattino-4.png',
  'gattino-5.jpeg',
  'gattino-6.jpg',
  'gattino-7.jpg',
  'gattino-8.jpg',
] as const;

const resolvePlaceholderMediaFileName = (listingId: string) => {
  let hash = 0;
  for (let index = 0; index < listingId.length; index += 1) {
    hash = (hash + listingId.charCodeAt(index) * (index + 1)) % 2_147_483_647;
  }

  return placeholderMediaFileNames[Math.abs(hash) % placeholderMediaFileNames.length];
};

const resolveCardImageUrl = (primaryImageUrl: string, fallbackFileName: string) => {
  if (primaryImageUrl.length === 0) {
    return `/mock-media/${fallbackFileName}`;
  }

  const isRemoteImage =
    primaryImageUrl.startsWith('http://') || primaryImageUrl.startsWith('https://');
  if (!isRemoteImage) {
    return primaryImageUrl;
  }

  const params = new URLSearchParams({
    src: primaryImageUrl,
    fallbackFile: fallbackFileName,
  });
  return `/api/listings/media-proxy?${params.toString()}`;
};

export function PublicListingsGrid({
  listings,
  layout = 'grid',
  variant = 'default',
  showDistance = false,
  emptyTitle = 'Nessun annuncio disponibile.',
  emptyDescription = 'Torna piu tardi oppure apri il catalogo completo per vedere gli ultimi annunci disponibili.',
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
    layout === 'list' ? 'grid grid-cols-1 gap-4' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';
  const isFeaturedVariant = variant === 'featured';
  const pillClassName = isFeaturedVariant
    ? 'inline-flex items-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--color-border)_72%,white_28%)] bg-[color:color-mix(in_srgb,var(--color-surface-elevated)_64%,transparent)] px-2.5 py-1 text-[12px] font-semibold shadow-[0_8px_22px_rgb(66_40_49_/_0.04)]'
    : 'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-[12px] font-semibold';
  const articleClassName = isFeaturedVariant
    ? 'flex h-full min-h-[320px] flex-col overflow-hidden rounded-[28px] border border-[color:color-mix(in_srgb,var(--color-border)_70%,white_30%)] bg-[color:color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] shadow-none transition-[border-color,transform] duration-300 group-hover:border-[var(--color-border-strong)] sm:min-h-[350px]'
    : 'flex h-full min-h-[330px] flex-col overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[0_16px_42px_rgb(66_40_49_/_0.09)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 group-hover:border-[var(--color-border-strong)] group-hover:shadow-[0_24px_62px_rgb(66_40_49_/_0.14)] sm:min-h-[360px]';
  const contentClassName = isFeaturedVariant
    ? 'flex basis-2/5 flex-col bg-[color:color-mix(in_srgb,var(--color-surface-elevated)_76%,transparent)] px-4 pb-3 pt-3 text-[var(--color-text)] backdrop-blur-[6px] sm:px-4 sm:pb-4 sm:pt-3'
    : 'flex basis-2/5 flex-col bg-[var(--color-surface-elevated)] px-4 pb-3 pt-3 text-[var(--color-text)] sm:px-4 sm:pb-4 sm:pt-3';
  const locationIconClassName = isFeaturedVariant
    ? 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--color-border)_76%,white_24%)] bg-[color:color-mix(in_srgb,var(--color-surface-elevated)_72%,transparent)] shadow-[0_10px_24px_rgb(66_40_49_/_0.05)]'
    : 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)]';
  const footerClassName = isFeaturedVariant
    ? 'mt-2.5 flex items-end justify-between gap-2 border-t border-[color:color-mix(in_srgb,var(--color-border)_68%,white_32%)] pt-2.5'
    : 'mt-2.5 flex items-end justify-between gap-2 border-t border-[var(--color-border)] pt-2.5';
  const distanceClassName = isFeaturedVariant
    ? 'inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--color-border)_72%,white_28%)] bg-[color:color-mix(in_srgb,var(--color-surface-elevated)_70%,transparent)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-text-muted)]'
    : 'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-text-muted)]';

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
        const catCount = Math.max(1, listing.catCount);
        const catCountLabel = `${catCount} ${catCount === 1 ? 'gatto' : 'gatti'}`;
        const ageLabel = listing.ageText.trim();
        const breedLabel = listing.breed?.trim() ?? '';
        const publishedLabel = formatDate(listing.publishedAt ?? listing.createdAt);
        const distanceLabel =
          showDistance && typeof listing.distanceKm === 'number'
            ? `${new Intl.NumberFormat('it-IT', {
                maximumFractionDigits: listing.distanceKm >= 10 ? 0 : 1,
                minimumFractionDigits: 0,
              }).format(listing.distanceKm)} km`
            : null;
        const primaryImageUrl = listing.primaryMedia?.objectUrl?.trim() ?? '';
        const placeholderFileName = resolvePlaceholderMediaFileName(listing.id);
        const imageUrl = resolveCardImageUrl(primaryImageUrl, placeholderFileName);
        const imageStyle = {
          backgroundImage: `linear-gradient(135deg, var(--color-media-overlay-start) 0%, var(--color-media-overlay-end) 100%), url("${imageUrl}")`,
        };

        return (
          <article className={`${articleClassName} group relative`} key={listing.id}>
            <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
              <FavoriteHeartButton listingId={listing.id} />
            </div>

            <Link
              aria-label={`Apri annuncio: ${titleLabel}`}
              className="relative block basis-3/5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
              href={`/annunci/${listing.id}`}
            >
              <div
                aria-label={imageTitleLabel || titleLabel}
                className="h-full w-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.06] group-hover:brightness-[1.03] group-hover:saturate-[1.06]"
                role="img"
                style={imageStyle}
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--color-scrim)] via-black/12 to-transparent px-4 pb-4 pt-16">
                <h3 className="line-clamp-2 text-center text-[18px] font-semibold leading-tight tracking-[-0.01em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:text-[20px]">
                  {imageTitleLabel || titleLabel}
                </h3>
              </div>
            </Link>

            <div className={contentClassName}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={locationIconClassName}>
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
                  <p className="line-clamp-1 min-w-0 text-[13px] font-medium tracking-[-0.01em]">
                    {locationLabel}
                  </p>
                </div>

                {distanceLabel ? (
                  <span className={distanceClassName}>
                    <svg
                      aria-hidden="true"
                      fill="none"
                      focusable="false"
                      height="12"
                      viewBox="0 0 24 24"
                      width="12"
                    >
                      <path
                        d="M12 3v3.5M12 17.5v3.5M4.5 12H1M23 12h-3.5M5.8 5.8l2.5 2.5M18.2 18.2l-2.5-2.5M18.2 5.8l-2.5 2.5M5.8 18.2l2.5-2.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                    {distanceLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex max-h-[4.2rem] flex-wrap items-center gap-2 overflow-hidden">
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
                  {catCountLabel}
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

              <div className={footerClassName}>
                <div className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-medium">
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
                  <div className="space-y-1 text-right leading-tight">
                    <p className="whitespace-nowrap text-[14px] font-semibold">
                      {footerActionLabel}
                    </p>
                    <Link
                      className="inline-flex items-center justify-end text-[0.78rem] font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                      href={`/annunci/${listing.id}`}
                    >
                      Apri annuncio
                    </Link>
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
