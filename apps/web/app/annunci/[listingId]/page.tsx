import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { notFound } from 'next/navigation';
import { LinkButton } from '../../../components/link-button';
import { ListingMessageComposer } from '../../../components/listing-message-composer';
import { PageShell } from '../../../components/page-shell';
import { getWebSession } from '../../../lib/auth';
import { formatCurrencyAmount, formatDate } from '../../../lib/formatters';
import { fetchPublicListingById } from '../../../lib/listings';

interface ListingDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
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

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{listing.listingType}</Badge>
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
        </div>
      }
      description="Dettaglio pubblico minimale collegato ancora al data layer listings. Tutta la UX avanzata e stata rimossa per poter riprogettare da zero."
      eyebrow="Dettaglio annuncio"
      title={listing.title}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Descrizione</CardTitle>
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
            <p>
              Media collegate: {listing.media.length}. La nuova gallery verra reintrodotta solo
              quando il layout definitivo sara approvato.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contatti e navigazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
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
                  <LinkButton href={`/login?next=${encodeURIComponent(`/annunci/${listing.id}`)}`}>
                    Accedi per contattare
                  </LinkButton>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <LinkButton href="/annunci" variant="outline">
                Torna alla lista
              </LinkButton>
              {session ? (
                <LinkButton href="/messaggi" variant="secondary">
                  Apri inbox
                </LinkButton>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
