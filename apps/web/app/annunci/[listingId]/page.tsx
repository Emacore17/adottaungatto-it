import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FavoriteHeartButton } from '../../../components/favorite-heart-button';
import { LinkButton } from '../../../components/link-button';
import { ListingGallery } from '../../../components/listing-gallery';
import { ListingMessageComposer } from '../../../components/listing-message-composer';
import { ListingSponsoredBadge } from '../../../components/listing-sponsored-badge';
import { SectionReveal } from '../../../components/motion/section-reveal';
import { getWebSession } from '../../../lib/auth';
import { formatCurrencyAmount, formatDate } from '../../../lib/formatters';
import { fetchPublicListingById } from '../../../lib/listings';

interface ListingDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { listingId } = await params;
  const listing = await fetchPublicListingById(listingId).catch(() => null);

  if (!listing) {
    return {
      title: {
        absolute: 'Annuncio | adottaungatto-it',
      },
    };
  }

  return {
    title: {
      absolute: `${listing.title} | adottaungatto-it`,
    },
    description: listing.description?.slice(0, 160),
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { listingId } = await params;
  const [listing, session] = await Promise.all([
    fetchPublicListingById(listingId).catch(() => null),
    getWebSession().catch(() => null),
  ]);

  if (!listing) {
    notFound();
  }

  const listingTypeNormalized = listing.listingType.trim().toLowerCase();
  const listingTypeLabel = listing.listingType
    .trim()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
  const listingTypeBadgeVariant = listingTypeNormalized.includes('adozion')
    ? 'success'
    : listingTypeNormalized.includes('vendit')
      ? 'info'
      : listingTypeNormalized.includes('stallo')
        ? 'warning'
        : listingTypeNormalized.includes('segnalaz')
          ? 'secondary'
          : 'outline';
  const hasPrice = listing.priceAmount !== null && listing.priceAmount.trim().length > 0;
  const priceLabel =
    listingTypeNormalized.includes('adozion') || !hasPrice
      ? 'Adozione gratuita'
      : formatCurrencyAmount(listing.priceAmount, listing.currency);
  const breedLabel = listing.breed?.trim() || 'Non specificata';
  const sexLabel = listing.sex?.trim()
    ? `${listing.sex.trim()[0]?.toUpperCase() ?? ''}${listing.sex.trim().slice(1)}`
    : 'Non specificato';
  const ageLabel = listing.ageText?.trim() || 'Non specificata';
  const cityLabel = listing.comuneName.trim();
  const provinceNameLabel = listing.provinceName.trim();
  const provinceSiglaLabel = listing.provinceSigla.trim();
  const regionLabel = listing.regionName.trim();
  const locationBadgeLabel = provinceSiglaLabel
    ? `${cityLabel} (${provinceSiglaLabel})`
    : cityLabel || 'Italia';
  const cityProvinceLabel = provinceNameLabel
    ? `${cityLabel}, ${provinceNameLabel}${provinceSiglaLabel ? ` (${provinceSiglaLabel})` : ''}`
    : cityLabel;
  const locationFullLabel = [cityProvinceLabel, regionLabel].filter(Boolean).join(', ');
  const summaryItems = [
    { label: 'Prezzo', value: priceLabel },
    { label: 'Razza', value: breedLabel },
    { label: 'Sesso', value: sexLabel },
    { label: 'Eta', value: ageLabel },
  ];

  return (
    <div className="space-y-6">
      <SectionReveal>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/annunci" variant="outline">
            Torna agli annunci
          </LinkButton>
          {session ? (
            <LinkButton href="/messaggi" variant="secondary">
              Apri inbox
            </LinkButton>
          ) : null}
        </div>
      </SectionReveal>

      <SectionReveal delay={0.04}>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="order-1 space-y-4 lg:col-start-1 lg:row-start-1" data-test-listing-gallery>
            <ListingGallery listingId={listing.id} media={listing.media} title={listing.title} />
          </div>

          <Card
            className="order-2 bg-[var(--color-surface-overlay-strong)] lg:col-start-2 lg:row-start-1"
            data-test-listing-summary
          >
            <CardContent className="space-y-5 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={listingTypeBadgeVariant}>{listingTypeLabel || 'Annuncio'}</Badge>
                <Badge variant="secondary">{locationBadgeLabel}</Badge>
                {listing.isSponsored ? <ListingSponsoredBadge className="w-fit" /> : null}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-[var(--color-text)] sm:text-4xl">
                    {listing.title}
                  </h1>
                  <p className="flex items-center gap-2 text-sm leading-6 text-[var(--color-text-muted)]">
                    <MapPin
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
                    />
                    <span>{locationFullLabel}</span>
                  </p>
                </div>
                <div className="shrink-0">
                  <FavoriteHeartButton listingId={listing.id} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {summaryItems.map((item) => (
                  <div
                    className="rounded-[20px] bg-[var(--color-surface-muted)] px-4 py-3"
                    key={item.label}
                  >
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_64%,transparent)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                Pubblicato il {formatDate(listing.publishedAt ?? listing.createdAt)}
              </div>
            </CardContent>
          </Card>

          <Card className="order-3 lg:col-start-1 lg:row-start-2">
            <CardHeader>
              <CardTitle>Descrizione</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-[var(--color-text-muted)]">
              <p>{listing.description || 'Descrizione non disponibile.'}</p>
            </CardContent>
          </Card>

          <Card className="order-4 lg:col-start-2 lg:row-start-2">
            <CardHeader className="space-y-3">
              <CardTitle>Contatta l'inserzionista</CardTitle>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Usa la chat privata per fare domande, ricevere aggiornamenti e mantenere lo
                storico della conversazione.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[var(--color-text-muted)]">
              {listing.contactName ? (
                <p>
                  Referente: <span className="font-medium text-[var(--color-text)]">{listing.contactName}</span>
                </p>
              ) : null}

              {session ? (
                <ListingMessageComposer listingId={listing.id} />
              ) : (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                    Accedi con un account registrato per inviare un messaggio all'inserzionista e
                    continuare la conversazione dalla tua inbox privata.
                  </p>
                  <div className="pt-3">
                    <LinkButton href={`/login?next=${encodeURIComponent(`/annunci/${listing.id}`)}`}>
                      Accedi per contattare
                    </LinkButton>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </SectionReveal>
    </div>
  );
}
