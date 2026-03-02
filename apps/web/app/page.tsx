import { Badge, Card, CardDescription, CardHeader, CardTitle } from '@adottaungatto/ui';
import { Cat, MapPin, PawPrint, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

interface HeroMetaItemProps {
  icon: LucideIcon;
  label: string;
}

function HeroMetaItem({ icon: Icon, label }: HeroMetaItemProps) {
  return (
    <li className="home-hero-meta-item">
      <Icon aria-hidden="true" strokeWidth={1.8} />
      <span>{label}</span>
    </li>
  );
}

function HeroDecorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="home-hero-decoration home-hero-decoration-cat-right">
        <Cat className="home-hero-decoration-icon home-hero-float-slow" strokeWidth={1.5} />
      </div>
      <div className="home-hero-decoration home-hero-decoration-cat-left">
        <Cat className="home-hero-decoration-icon home-hero-float-reverse" strokeWidth={1.45} />
      </div>
      <div className="home-hero-decoration home-hero-decoration-paw-left-top">
        <PawPrint className="home-hero-decoration-icon home-hero-float-medium" strokeWidth={1.7} />
      </div>
      <div className="home-hero-decoration home-hero-decoration-paw-left-mid">
        <PawPrint className="home-hero-decoration-icon home-hero-float-slow" strokeWidth={1.7} />
      </div>
      <div className="home-hero-decoration home-hero-decoration-paw-right-high">
        <PawPrint className="home-hero-decoration-icon home-hero-float-fast" strokeWidth={1.7} />
      </div>
      <div className="home-hero-decoration home-hero-decoration-paw-right-low">
        <PawPrint className="home-hero-decoration-icon home-hero-float-medium" strokeWidth={1.7} />
      </div>
      <div className="home-hero-decoration home-hero-decoration-paw-bottom-center">
        <PawPrint className="home-hero-decoration-icon home-hero-float-reverse" strokeWidth={1.7} />
      </div>
    </div>
  );
}

export default async function Page() {
  const listings = await fetchPublicListings({ limit: 24 }).catch(() => []);
  const orderedListings = sortByLatest(listings);
  const featuredListings = orderedListings.slice(0, 9);
  const listingCountLabel =
    orderedListings.length > 0
      ? `${new Intl.NumberFormat('it-IT').format(orderedListings.length)} annunci pubblici`
      : 'Nuovi annunci pubblici';
  const heroMeta = [
    {
      icon: MapPin,
      label: 'Citta, provincia e regione',
    },
    {
      icon: SlidersHorizontal,
      label: 'Filtri rapidi e ordinati',
    },
    {
      icon: PawPrint,
      label: listingCountLabel,
    },
  ];

  return (
    <div className="-mt-[var(--shell-main-padding)] space-y-20 pb-4 sm:space-y-24">
      <section className="home-hero relative min-h-[calc(100svh-var(--shell-header-height))]">
        <HeroDecorations />

        <div className="relative mx-auto flex min-h-[calc(100svh-var(--shell-header-height))] max-w-5xl flex-col items-center justify-center gap-8 px-2 py-8 text-center sm:gap-10 sm:py-10">
          <div className="max-w-4xl space-y-6 sm:space-y-7">
            <div className="space-y-4 sm:space-y-5">
              <p className="home-hero-eyebrow">Adozioni, stalli e segnalazioni</p>
              <h1 className="mx-auto max-w-[12ch] text-[clamp(2.7rem,2rem+2.25vw,4.75rem)] font-semibold leading-[0.9] tracking-[-0.055em]">
                Trova il <span className="home-hero-title-accent">gatto</span>{' '}
                <span className="block">da accogliere.</span>
              </h1>
              <p className="mx-auto max-w-2xl text-[15px] leading-7 text-[var(--color-text-muted)] sm:text-lg sm:leading-8">
                Vicino a te, con filtri rapidi per citta, provincia, eta e tipologia di annuncio.
                Foto grandi, schede pulite e confronto immediato.
              </p>
            </div>

            <ul className="home-hero-meta">
              {heroMeta.map((item) => (
                <HeroMetaItem icon={item.icon} key={item.label} label={item.label} />
              ))}
            </ul>
          </div>

          <div className="w-full max-w-5xl">
            <Ricerca showHeader={false} />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <Badge className="w-fit" variant="secondary">
              In evidenza
            </Badge>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Annunci in evidenza</h2>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Profili selezionati da gattili e volontari per dare piu visibilita ai gatti che
                hanno bisogno di una vetrina piu curata.
              </p>
            </div>
          </div>

          <LinkButton href="/annunci" variant="outline">
            Vedi tutti gli annunci
          </LinkButton>
        </div>

        {featuredListings.length > 0 ? (
          <>
            <div className="hidden md:block">
              <FeaturedListingsCarousel autoPlayMs={null} visibleCount={3}>
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
              <FeaturedListingsCarousel autoPlayMs={null} visibleCount={1}>
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

      <section className="space-y-6" id="annunci-recenti">
        <div className="max-w-2xl space-y-2">
          <Badge className="w-fit" variant="outline">
            Tutti gli annunci
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">Annunci recenti da tutta Italia</h2>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Nuovi annunci pubblici ordinati per data di pubblicazione, con una lettura piu lineare
            su desktop e mobile.
          </p>
        </div>

        <PublicListingsGrid
          emptyDescription="Nessun annuncio pubblico disponibile al momento."
          listings={orderedListings}
        />
      </section>
    </div>
  );
}
