import { Badge, Card, CardDescription, CardHeader, CardTitle } from '@adottaungatto/ui';
import { FeaturedListingsCarousel } from '../components/featured-listings-carousel';
import { LinkButton } from '../components/link-button';
import { PublicListingsGrid } from '../components/public-listings-grid';
import Ricerca from '../components/ricerca';
import { type PublicListingSummary, fetchPublicListings } from '../lib/listings';

const parseListingTimestamp = (listing: PublicListingSummary) => {
  const value = new Date(listing.publishedAt ?? listing.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
};

const sortByLatest = (listings: PublicListingSummary[]) => {
  return [...listings].sort((a, b) => parseListingTimestamp(b) - parseListingTimestamp(a));
};

export default async function Page() {
  const listings = await fetchPublicListings({ limit: 24 }).catch(() => []);
  const orderedListings = sortByLatest(listings);
  const featuredListings = orderedListings.slice(0, 9);

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Trova il tuo prossimo gatto.
        </h1>
        <p className="mx-auto max-w-2xl text-base text-[var(--color-text-muted)] sm:text-lg">
          Cerca per localita, razza e tipologia per trovare il profilo giusto in pochi secondi.
        </p>
      </section>

      <section>
        <Ricerca showHeader={false} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Badge className="w-fit" variant="secondary">
              In evidenza
            </Badge>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Annunci in evidenza</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Scorri automaticamente i profili in evidenza.
              </p>
            </div>
          </div>

          <LinkButton href="/annunci" variant="outline">
            Apri tutti gli annunci
          </LinkButton>
        </div>

        {featuredListings.length > 0 ? (
          <>
            <div className="hidden md:block">
              <FeaturedListingsCarousel autoPlayMs={5200} visibleCount={3}>
                {featuredListings.map((listing) => (
                  <PublicListingsGrid
                    key={`featured-desktop-${listing.id}`}
                    layout="list"
                    listings={[listing]}
                  />
                ))}
              </FeaturedListingsCarousel>
            </div>

            <div className="md:hidden">
              <FeaturedListingsCarousel autoPlayMs={4200} visibleCount={1}>
                {featuredListings.map((listing) => (
                  <PublicListingsGrid
                    key={`featured-mobile-${listing.id}`}
                    layout="list"
                    listings={[listing]}
                  />
                ))}
              </FeaturedListingsCarousel>
            </div>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Nessun annuncio in evidenza al momento.</CardTitle>
              <CardDescription>
                Riprova tra poco oppure apri il catalogo completo per vedere tutti i profili
                disponibili.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <Badge className="w-fit" variant="outline">
            Tutti gli annunci
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">Catalogo completo</h2>
        </div>

        <PublicListingsGrid
          emptyDescription="Nessun annuncio pubblico disponibile al momento."
          listings={orderedListings}
        />
      </section>
    </div>
  );
}
