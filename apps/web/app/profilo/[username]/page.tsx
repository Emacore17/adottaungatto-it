import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { ShieldCheck, Star } from 'lucide-react';
import { LinkButton } from '../../../components/link-button';
import { PageShell } from '../../../components/page-shell';
import { PublicListingsList } from '../../../components/public-listings-list';
import { formatDate } from '../../../lib/formatters';
import { mapMockListingToPublicSummary } from '../../../lib/listings';
import {
  findMockListingsBySeller,
  findMockReviewsBySeller,
  findMockSellerProfile,
} from '../../../mocks/listings';

interface PublicProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const listings = findMockListingsBySeller(username);
  const reviews = findMockReviewsBySeller(username);
  const existingProfile = findMockSellerProfile(username);
  const profile =
    existingProfile ??
    (listings.length > 0
      ? {
          username,
          displayName: `Profilo @${username}`,
          locationLabel: `${listings[0].city}, ${listings[0].region}`,
          verified: false,
          ratingAverage: 0,
          reviewsCount: reviews.length,
          responseRatePct: 0,
          responseTimeLabel: 'non disponibile',
          joinedAt: '',
          bio: 'Questo profilo ha annunci pubblici ma non mostra ancora una presentazione estesa.',
        }
      : null);

  const publicListings = listings.map((listing) => mapMockListingToPublicSummary(listing));
  const hasProfile = profile !== null;

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Profilo pubblico</Badge>
            {profile?.verified ? <Badge variant="success">Verificato</Badge> : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[20px] bg-[var(--color-surface-muted)] px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Localita
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                {profile?.locationLabel ?? 'Non disponibile'}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface-muted)] px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Tempo di risposta
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                {profile?.responseTimeLabel ?? 'Non disponibile'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/annunci">Esplora annunci</LinkButton>
            <LinkButton href="/contatti" variant="outline">
              Contatti
            </LinkButton>
          </div>
        </div>
      }
      description={
        hasProfile
          ? profile.bio
          : `Non risultano annunci pubblici o informazioni estese per @${username} in questo momento.`
      }
      eyebrow="Profilo pubblico"
      title={hasProfile ? profile.displayName : `Profilo @${username}`}
    >
      {hasProfile ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardHeader>
                <CardTitle>Panoramica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
                <p>
                  Questo profilo raccoglie annunci e reputazione pubblica in una vista unica, piu
                  leggibile e facile da confrontare.
                </p>
                {profile.joinedAt ? (
                  <p>
                    Attivo dal{' '}
                    <span className="font-medium text-[var(--color-text)]">
                      {formatDate(profile.joinedAt)}
                    </span>
                    .
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Affidabilita</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
                <div className="flex flex-wrap items-center gap-2">
                  {profile.verified ? (
                    <span className="inline-flex items-center gap-2 font-medium text-[var(--color-text)]">
                      <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                      Profilo verificato
                    </span>
                  ) : (
                    <span>Profilo senza badge di verifica pubblico.</span>
                  )}
                </div>
                <p>
                  {profile.ratingAverage > 0
                    ? `${profile.ratingAverage.toFixed(1)} su 5 su ${profile.reviewsCount} recensioni.`
                    : 'Nessuna valutazione pubblica disponibile al momento.'}
                </p>
                {profile.responseRatePct > 0 ? (
                  <p>Tasso di risposta: {profile.responseRatePct}%.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                Annunci pubblici
              </h2>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Tutti i profili pubblicati da questo account in un elenco piu semplice da scorrere.
              </p>
            </div>
            <PublicListingsList
              emptyDescription="Questo profilo non ha annunci pubblici visibili al momento."
              emptyTitle="Nessun annuncio attivo."
              listings={publicListings}
            />
          </section>

          {reviews.length > 0 ? (
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                  Recensioni recenti
                </h2>
                <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                  Un riepilogo sintetico delle valutazioni pubbliche disponibili.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">{review.author}</CardTitle>
                        <div className="flex items-center gap-1 text-[var(--color-primary)]">
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              aria-hidden="true"
                              className={`h-4 w-4 ${index < review.rating ? 'fill-current' : 'opacity-25'}`}
                              key={`${review.id}-${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                        {formatDate(review.createdAt)}
                      </p>
                    </CardHeader>
                    <CardContent className="text-sm leading-6 text-[var(--color-text-muted)]">
                      {review.comment}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nessun contenuto pubblico disponibile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Questo profilo non mostra ancora annunci o informazioni pubbliche consultabili.
            </p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/annunci">Vai al catalogo</LinkButton>
              <LinkButton href="/preferiti" variant="outline">
                Preferiti
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
