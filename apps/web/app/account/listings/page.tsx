import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import Link from 'next/link';
import { ListingStatusBadge } from '../../../components/listing-status-badge';
import { requireWebSession } from '../../../lib/auth';
import { fetchMyListings } from '../../../lib/listings';

const formatDateTime = (rawDate: string) => {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const buildListingTypeLabel = (value: string) => {
  if (!value) {
    return '-';
  }

  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ');
};

export default async function MyListingsPage() {
  await requireWebSession('/account/listings');
  const listings = await fetchMyListings();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl px-6 py-10">
      <div className="w-full space-y-6">
        <Card className="border-slate-300/70 bg-white/95">
          <CardHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">M2.7</Badge>
              <Badge variant="success">I miei annunci</Badge>
            </div>
            <CardTitle>Elenco annunci utente</CardTitle>
            <CardDescription>
              Visualizza stato corrente, dettagli base privati e accesso rapido alla creazione.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              href="/account/listings/new"
            >
              Nuovo annuncio
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
              href="/account"
            >
              Torna all&apos;area utente
            </Link>
          </CardContent>
        </Card>

        {listings.length === 0 ? (
          <Card className="border-slate-300/70 bg-white">
            <CardContent className="space-y-4 py-8">
              <p className="text-base font-medium text-slate-900">Nessun annuncio presente.</p>
              <p className="text-sm text-slate-600">
                Crea il primo annuncio per iniziare il flusso di moderazione e pubblicazione.
              </p>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                href="/account/listings/new"
              >
                Crea ora
              </Link>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {listings.map((listing) => (
              <Card className="border-slate-300/70 bg-white" key={listing.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{listing.title}</CardTitle>
                      <CardDescription>
                        Creato il {formatDateTime(listing.createdAt)} · Tipo{' '}
                        {buildListingTypeLabel(listing.listingType)}
                      </CardDescription>
                    </div>
                    <ListingStatusBadge status={listing.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-3 text-sm text-slate-700">{listing.description}</p>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-600">
                      ETA: <span className="font-medium text-slate-900">{listing.ageText}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      SESSO: <span className="font-medium text-slate-900">{listing.sex}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      GEO ID: R{listing.regionId} · P{listing.provinceId} · C{listing.comuneId}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700"
                      href={`/account/listings/${listing.id}`}
                    >
                      Dettaglio privato
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
