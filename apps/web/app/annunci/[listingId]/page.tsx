import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactActions } from '../../../components/contact-actions';
import { ListingCard } from '../../../components/listing-card';
import { ListingGallery } from '../../../components/listing-gallery';
import { fetchPublicListingById } from '../../../lib/listings';
import {
  findMockRecommendedListings,
  findMockReviewsBySeller,
  findMockSellerProfile,
} from '../../../mocks/listings';

interface PublicListingDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

const formatDate = (rawDate: string | null): string => {
  if (!rawDate) {
    return '-';
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

const formatPrice = (priceAmount: string | null, currency: string): string => {
  if (!priceAmount) {
    return 'Prezzo non indicato';
  }

  const numericPrice = Number.parseFloat(priceAmount);
  if (Number.isNaN(numericPrice)) {
    return `${priceAmount} ${currency}`;
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericPrice);
};

const resolveSellerUsername = (contactName: string | null, contactEmail: string | null) => {
  if (contactName && /^[a-z0-9_]+$/i.test(contactName)) {
    return contactName.toLowerCase();
  }

  if (contactEmail?.includes('@')) {
    return contactEmail.split('@')[0].toLowerCase();
  }

  return 'gattiroma';
};

export default async function PublicListingDetailPage({ params }: PublicListingDetailPageProps) {
  const { listingId } = await params;
  const listing = await fetchPublicListingById(listingId);

  if (!listing) {
    notFound();
  }

  const sortedMedia = [...listing.media].sort((left, right) => left.position - right.position);
  const sellerUsername = resolveSellerUsername(listing.contactName, listing.contactEmail);
  const sellerProfile = findMockSellerProfile(sellerUsername) ?? {
    username: sellerUsername,
    displayName: listing.contactName ?? 'Inserzionista',
    locationLabel: `${listing.comuneName} (${listing.provinceSigla})`,
    verified: false,
    ratingAverage: 4.5,
    reviewsCount: 12,
    responseRatePct: 88,
    responseTimeLabel: 'entro 6 ore',
    joinedAt: new Date().toISOString(),
    bio: 'Profilo in verifica. Dati completi disponibili a breve.',
  };
  const sellerReviews = findMockReviewsBySeller(sellerProfile.username).slice(0, 3);
  const recommendedListings = findMockRecommendedListings(listing.id);

  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 pb-24 sm:px-6 sm:pb-12 lg:px-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link className="font-medium text-[var(--color-text)] hover:underline" href="/cerca">
          Annunci
        </Link>
        <span>/</span>
        <span>{listing.title}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <Card className="rounded-3xl border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Pubblicato</Badge>
                <Badge variant="secondary">{listing.listingType}</Badge>
                <Badge variant="outline">Verificato</Badge>
              </div>
              <CardTitle className="text-2xl">{listing.title}</CardTitle>
              <p className="text-sm text-[var(--color-text-muted)]">
                {listing.comuneName} ({listing.provinceSigla}) - {listing.provinceName},{' '}
                {listing.regionName}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <ListingGallery media={sortedMedia} title={listing.title} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
                  <p>
                    Età:{' '}
                    <strong className="text-[var(--color-text)]">{listing.ageText || '-'}</strong>
                  </p>
                  <p>
                    Sesso:{' '}
                    <strong className="text-[var(--color-text)]">{listing.sex || '-'}</strong>
                  </p>
                  <p>
                    Razza:{' '}
                    <strong className="text-[var(--color-text)]">{listing.breed || '-'}</strong>
                  </p>
                  <p>
                    Prezzo:{' '}
                    <strong className="text-[var(--color-text)]">
                      {formatPrice(listing.priceAmount, listing.currency)}
                    </strong>
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
                  <p>
                    Pubblicato il:{' '}
                    <strong className="text-[var(--color-text)]">
                      {formatDate(listing.publishedAt)}
                    </strong>
                  </p>
                  <p>
                    Contatto email:{' '}
                    <strong className="text-[var(--color-text)]">
                      {listing.contactEmail ?? 'non disponibile'}
                    </strong>
                  </p>
                  <p>
                    Contatto telefono:{' '}
                    <strong className="text-[var(--color-text)]">
                      {listing.contactPhone ?? 'non disponibile'}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-sm whitespace-pre-line text-[var(--color-text)]">
                  {listing.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader>
              <CardTitle>Sicurezza anti-truffa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
              <ul className="list-disc space-y-1 pl-5">
                <li>Non inviare anticipi senza verifica identità inserzionista.</li>
                <li>Preferisci incontri in luoghi pubblici o presso strutture note.</li>
                <li>Usa sempre i canali messaggi della piattaforma per tracciabilità.</li>
              </ul>
              <Button type="button" variant="outline">
                Segnala annuncio
              </Button>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader>
              <CardTitle>Inserzionista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[var(--color-text)]">
                  {sellerProfile.displayName}
                </p>
                {sellerProfile.verified ? <Badge variant="success">Verificato</Badge> : null}
              </div>
              <p>{sellerProfile.locationLabel}</p>
              <p>
                Rating:{' '}
                <strong className="text-[var(--color-text)]">
                  {sellerProfile.ratingAverage.toFixed(1)} / 5
                </strong>{' '}
                ({sellerProfile.reviewsCount} recensioni)
              </p>
              <p>
                Risposte:{' '}
                <strong className="text-[var(--color-text)]">
                  {sellerProfile.responseRatePct}%
                </strong>{' '}
                · tempo medio {sellerProfile.responseTimeLabel}
              </p>
              <Link
                className="text-[var(--color-primary)]"
                href={`/profilo/${sellerProfile.username}`}
              >
                Apri profilo inserzionista
              </Link>
            </CardContent>
          </Card>

          <Card
            className="border-[var(--color-border)] bg-[var(--color-surface)]"
            id="contatta-inserzionista"
          >
            <CardHeader>
              <CardTitle>Contatta ora</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactActions
                contactEmail={listing.contactEmail}
                contactPhone={listing.contactPhone}
                listingId={listing.id}
              />
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader>
              <CardTitle>Recensioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sellerReviews.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Nessuna recensione disponibile. Sezione mock pronta per API reali.
                </p>
              ) : (
                sellerReviews.map((review) => (
                  <div
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                    key={review.id}
                  >
                    <p className="text-xs font-semibold text-[var(--color-text)]">
                      {review.author} · {review.rating}/5
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{review.comment}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2>Annunci consigliati</h2>
          <Link className="text-sm text-[var(--color-primary)]" href="/cerca">
            Apri ricerca completa
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {recommendedListings.map((recommendedListing) => (
            <ListingCard key={recommendedListing.id} listing={recommendedListing} />
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_-10px_24px_rgba(0,0,0,0.16)] md:hidden">
        <a
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]"
          href="#contatta-inserzionista"
        >
          Contatta inserzionista
        </a>
      </div>
    </main>
  );
}
