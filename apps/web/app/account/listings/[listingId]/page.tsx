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
        <Card className="border-slate-300/70 bg-white/95">
          <CardHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">Dettaglio privato</Badge>
              <ListingStatusBadge status={listing.status} />
            </div>
            <CardTitle>{listing.title}</CardTitle>
            <CardDescription>ID annuncio {listing.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">{listing.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Profilo gatto
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Tipo: <span className="font-medium text-slate-900">{listing.listingType}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Eta: <span className="font-medium text-slate-900">{listing.ageText}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Sesso: <span className="font-medium text-slate-900">{listing.sex}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Razza: <span className="font-medium text-slate-900">{listing.breed ?? '-'}</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Contatto e area
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Nome:{' '}
                  <span className="font-medium text-slate-900">{listing.contactName ?? '-'}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Telefono:{' '}
                  <span className="font-medium text-slate-900">{listing.contactPhone ?? '-'}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Email:{' '}
                  <span className="font-medium text-slate-900">{listing.contactEmail ?? '-'}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Area:{' '}
                  <span className="font-medium text-slate-900">
                    R{listing.regionId} · P{listing.provinceId} · C{listing.comuneId}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Timeline
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Creato:{' '}
                  <span className="font-medium text-slate-900">
                    {formatDateTime(listing.createdAt)}
                  </span>
                </p>
                <p className="text-sm text-slate-700">
                  Aggiornato:{' '}
                  <span className="font-medium text-slate-900">
                    {formatDateTime(listing.updatedAt)}
                  </span>
                </p>
                <p className="text-sm text-slate-700">
                  Pubblicato:{' '}
                  <span className="font-medium text-slate-900">
                    {formatDateTime(listing.publishedAt)}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prezzo</p>
                <p className="mt-2 text-sm text-slate-700">
                  {listing.priceAmount
                    ? `${listing.priceAmount} ${listing.currency}`
                    : 'Non indicato'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                href="/account/listings"
              >
                Torna ai miei annunci
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
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
