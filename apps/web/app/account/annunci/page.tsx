import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { ListingStatusBadge } from '../../../components/listing-status-badge';
import { requireWebSession } from '../../../lib/auth';
import { fetchMyListings } from '../../../lib/listings';

const formatDate = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(rawDate),
  );

export default async function AccountListingsPage() {
  await requireWebSession('/account/annunci');
  const listings = await fetchMyListings().catch(() => []);

  return (
    <main className="mx-auto w-full max-w-[1180px] space-y-5 px-4 pb-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>I miei annunci</h1>
        <Link href="/pubblica">
          <Button>Nuovo annuncio</Button>
        </Link>
      </div>

      {listings.length === 0 ? (
        <Card className="border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="space-y-2 py-10 text-center">
            <p className="text-base font-semibold text-[var(--color-text)]">
              Nessun annuncio trovato
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Crea il primo annuncio con il wizard pubblicazione.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((listing) => (
            <Card
              className="border-[var(--color-border)] bg-[var(--color-surface)]"
              key={listing.id}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{listing.title}</CardTitle>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Creato il {formatDate(listing.createdAt)}
                    </p>
                  </div>
                  <ListingStatusBadge status={listing.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-3 text-sm text-[var(--color-text-muted)]">
                  {listing.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{listing.listingType}</Badge>
                  <Badge variant="secondary">{listing.ageText}</Badge>
                  <Badge variant="secondary">{listing.sex}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/account/listings/${listing.id}`}>
                    <Button size="sm" variant="outline">
                      Dettaglio privato
                    </Button>
                  </Link>
                  <Link href={`/annunci/${listing.id}/modifica`}>
                    <Button size="sm">Modifica annuncio</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
