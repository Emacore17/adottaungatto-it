import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { formatCurrencyAmount, formatDate } from '../lib/formatters';
import type { PublicListingSummary } from '../lib/listings';
import { LinkButton } from './link-button';

interface PublicListingsGridProps {
  listings: PublicListingSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export function PublicListingsGrid({
  listings,
  emptyTitle = 'Nessun annuncio disponibile.',
  emptyDescription = 'Collega la nuova esperienza di ricerca quando il dominio funzionale sara ridefinito.',
}: PublicListingsGridProps) {
  if (listings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
          <CardDescription>{emptyDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => {
        const locationLabel = listing.provinceSigla
          ? `${listing.comuneName} (${listing.provinceSigla})`
          : listing.comuneName;
        const priceLabel = formatCurrencyAmount(listing.priceAmount, listing.currency);

        return (
          <Card className="flex h-full flex-col" key={listing.id}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{listing.listingType}</Badge>
                <Badge variant="secondary">{locationLabel}</Badge>
              </div>
              <div className="space-y-2">
                <CardTitle>{listing.title}</CardTitle>
                <CardDescription>{listing.description}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    Prezzo
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{priceLabel}</p>
                </div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    Pubblicato
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
                    {formatDate(listing.publishedAt ?? listing.createdAt)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                {listing.ageText} · {listing.sex}
                {listing.breed ? ` · ${listing.breed}` : ''}
                {listing.distanceKm !== null ? ` · ${listing.distanceKm.toFixed(1)} km` : ''}
              </p>
            </CardContent>

            <CardFooter className="mt-auto">
              <LinkButton href={`/annunci/${listing.id}`} variant="outline">
                Apri dettaglio
              </LinkButton>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
