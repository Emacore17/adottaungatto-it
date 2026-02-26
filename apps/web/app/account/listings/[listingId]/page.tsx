import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListingStatusBadge } from '../../../../components/listing-status-badge';
import { requireWebSession } from '../../../../lib/auth';
import { fetchMyListingById } from '../../../../lib/listings';

interface ListingDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

const formatDateTime = (rawDate: string | null) => {
  if (!rawDate) {
    return '-';
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { listingId } = await params;
  await requireWebSession(`/account/listings/${listingId}`);
  const listing = await fetchMyListingById(listingId);

  if (!listing) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl px-6 py-10">
      <div className="w-full space-y-6">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">Dettaglio privato</Badge>
              <ListingStatusBadge status={listing.status} />
            </div>
            <CardTitle>{listing.title}</CardTitle>
            <CardDescription>ID annuncio {listing.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm text-[var(--color-text)]">{listing.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-border)] p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Profilo gatto
                </p>
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  Tipo:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    {listing.listingType}
                  </span>
                </p>
                <p className="text-sm text-[var(--color-text)]">
                  Età:{' '}
                  <span className="font-medium text-[var(--color-text)]">{listing.ageText}</span>
                </p>
                <p className="text-sm text-[var(--color-text)]">
                  Sesso: <span className="font-medium text-[var(--color-text)]">{listing.sex}</span>
                </p>
                <p className="text-sm text-[var(--color-text)]">
                  Razza:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    {listing.breed ?? '-'}
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-[var(--color-border)] p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Contatto e area
                </p>
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  Nome:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    {listing.contactName ?? '-'}
                  </span>
                </p>
                <p className="text-sm text-[var(--color-text)]">
                  Telefono:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    {listing.contactPhone ?? '-'}
                  </span>
                </p>
                <p className="text-sm text-[var(--color-text)]">
                  Email:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    {listing.contactEmail ?? '-'}
                  </span>
                </p>
                <p className="text-sm text-[var(--color-text)]">
                  Area:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    R{listing.regionId} · P{listing.provinceId} · C{listing.comuneId}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-border)] p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Timeline
                </p>
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  Creato:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    {formatDateTime(listing.createdAt)}
                  </span>
                </p>
                <p className="text-sm text-[var(--color-text)]">
                  Aggiornato:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    {formatDateTime(listing.updatedAt)}
                  </span>
                </p>
                <p className="text-sm text-[var(--color-text)]">
                  Pubblicato:{' '}
                  <span className="font-medium text-[var(--color-text)]">
                    {formatDateTime(listing.publishedAt)}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Prezzo
                </p>
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  {listing.priceAmount
                    ? `${listing.priceAmount} ${listing.currency}`
                    : 'Non indicato'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
                href="/account/listings"
              >
                Torna ai miei annunci
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
                href="/account/listings/new"
              >
                Nuovo annuncio
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
