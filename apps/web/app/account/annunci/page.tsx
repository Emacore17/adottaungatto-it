import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../../components/link-button';
import { PageShell } from '../../../components/page-shell';
import { requireWebSession } from '../../../lib/auth';
import { formatDate } from '../../../lib/formatters';
import { fetchMyListings } from '../../../lib/listings';

export default async function AccountListingsPage() {
  await requireWebSession('/account/annunci');
  const listings = await fetchMyListings().catch(() => []);

  return (
    <PageShell
      aside={
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Endpoint preservato
          </p>
          <p className="text-sm text-[var(--color-text)]">GET `/v1/listings/me`</p>
          <LinkButton href="/pubblica" variant="outline">
            Nuovo annuncio
          </LinkButton>
        </div>
      }
      description="Vista minimale dei record autenticati. Niente wizard, filtri o componenti verticali: solo dati e collegamenti essenziali."
      eyebrow="Area riservata"
      title="I miei annunci"
    >
      {listings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessun annuncio disponibile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>Il nuovo flusso di pubblicazione non e ancora stato ricostruito.</p>
            <LinkButton href="/pubblica">Apri la route di pubblicazione</LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{listing.status}</Badge>
                    <Badge variant="secondary">{listing.listingType}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[var(--color-text)]">
                      {listing.title}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {listing.ageText} · {listing.sex}
                      {listing.breed ? ` · ${listing.breed}` : ''}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Aggiornato {formatDate(listing.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <LinkButton href={`/account/listings/${listing.id}`} variant="outline">
                    Apri dettaglio
                  </LinkButton>
                  <LinkButton href={`/annunci/${listing.id}/modifica`}>Apri edit route</LinkButton>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
