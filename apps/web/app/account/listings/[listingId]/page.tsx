import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { notFound } from 'next/navigation';
import { LinkButton } from '../../../../components/link-button';
import { PageShell } from '../../../../components/page-shell';
import { requireWebSession } from '../../../../lib/auth';
import { formatCurrencyAmount, formatDate } from '../../../../lib/formatters';
import { fetchMyListingById } from '../../../../lib/listings';

interface ListingDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function AccountListingDetailPage({ params }: ListingDetailPageProps) {
  const { listingId } = await params;
  await requireWebSession(`/account/listings/${listingId}`);

  const listing = await fetchMyListingById(listingId);
  if (!listing) {
    notFound();
  }

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{listing.status}</Badge>
            <Badge variant="secondary">{listing.listingType}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Aggiornato
            </p>
            <p className="text-sm text-[var(--color-text)]">{formatDate(listing.updatedAt)}</p>
          </div>
        </div>
      }
      description="Dettaglio privato minimo per confermare che la route e ancora collegata ai dati autenticati."
      eyebrow="Account"
      title={listing.title}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Contenuto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--color-text-muted)]">
            <p>{listing.description || 'Descrizione non disponibile.'}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Prezzo
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
                  {formatCurrencyAmount(listing.priceAmount, listing.currency)}
                </p>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Profilo
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
                  {listing.ageText} · {listing.sex}
                  {listing.breed ? ` · ${listing.breed}` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>
              Localita tecnica: {listing.regionId}/{listing.provinceId}/{listing.comuneId}
            </p>
            <p>Creato {formatDate(listing.createdAt)}</p>
            <p>Ultimo aggiornamento {formatDate(listing.updatedAt)}</p>
            {listing.contactEmail ? <p>Contatto: {listing.contactEmail}</p> : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <LinkButton href="/account/annunci" variant="outline">
                Torna alla lista
              </LinkButton>
              <LinkButton href={`/annunci/${listing.id}/modifica`}>Apri edit route</LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
