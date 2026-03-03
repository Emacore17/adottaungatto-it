import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LinkButton } from '../../../components/link-button';
import { ListingFavoritePlaceholderButton } from '../../../components/listing-favorite-placeholder-button';
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
  const cityProvinceLabel = provinceNameLabel
    ? `${cityLabel}, ${provinceNameLabel}${provinceSiglaLabel ? ` (${provinceSiglaLabel})` : ''}`
    : cityLabel;
  const locationFullLabel = regionLabel
    ? `${cityProvinceLabel} · ${regionLabel}`
    : cityProvinceLabel;

  return (
    <div className="space-y-8">
      <SectionReveal>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="space-y-4">
            <ListingGallery listingId={listing.id} media={listing.media} title={listing.title} />

            <Card>
              <CardHeader>
                <CardTitle>Descrizione</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-[var(--color-text-muted)]">
                <p>{listing.description || 'Descrizione non disponibile.'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Il gatto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[var(--color-surface-muted)] p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Razza
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                      {breedLabel}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-muted)] p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Sesso
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                      {sexLabel}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-muted)] p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Eta
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                      {ageLabel}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-muted)] p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Prezzo
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                      {priceLabel}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card className="bg-[var(--color-surface-overlay-strong)]">
              <CardContent className="space-y-4 pt-6">
                <Badge className="w-fit" variant="secondary">
                  Dettaglio annuncio
                </Badge>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
                      {listing.title}
                    </h1>
                    <ListingFavoritePlaceholderButton className="shrink-0" />
                  </div>
                  {listing.isSponsored ? <ListingSponsoredBadge className="w-fit" /> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={listingTypeBadgeVariant}>{listingTypeLabel || 'Annuncio'}</Badge>
                  <Badge variant="secondary">
                    {listing.comuneName} ({listing.provinceSigla})
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Pubblicato
                  </p>
                  <p className="text-sm text-[var(--color-text)]">
                    {formatDate(listing.publishedAt ?? listing.createdAt)}
                  </p>
                </div>
                <div className="h-px bg-[var(--color-border)]" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contatti e navigazione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
                <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <MapPin
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
                  />
                  <span>{locationFullLabel}</span>
                </p>
                {listing.contactName ? <p>Referente: {listing.contactName}</p> : null}
                <p>
                  I recapiti diretti non vengono esposti pubblicamente: la conversazione passa dalla
                  chat interna per proteggere privacy e storico.
                </p>
                {session ? (
                  <ListingMessageComposer listingId={listing.id} />
                ) : (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                    <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                      Accedi con un account registrato per inviare un messaggio all’inserzionista e
                      continuare la chat dalla tua inbox privata.
                    </p>
                    <div className="pt-3">
                      <LinkButton
                        href={`/login?next=${encodeURIComponent(`/annunci/${listing.id}`)}`}
                      >
                        Accedi per contattare
                      </LinkButton>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <LinkButton href="/annunci" variant="outline">
                Torna alla lista
              </LinkButton>
              {session ? (
                <LinkButton href="/messaggi" variant="secondary">
                  Apri inbox
                </LinkButton>
              ) : null}
            </div>
          </div>
        </section>
      </SectionReveal>
    </div>
  );
}
