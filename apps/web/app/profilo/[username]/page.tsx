import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { notFound } from 'next/navigation';
import { ListingCard } from '../../../components/listing-card';
import {
  findMockListingsBySeller,
  findMockReviewsBySeller,
  findMockSellerProfile,
} from '../../../mocks/listings';

interface SellerProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

const formatDate = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(rawDate));

export default async function SellerProfilePage({ params }: SellerProfilePageProps) {
  const { username } = await params;
  const profile = findMockSellerProfile(username.toLowerCase());

  if (!profile) {
    notFound();
  }

  const reviews = findMockReviewsBySeller(profile.username);
  const listings = findMockListingsBySeller(profile.username);

  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={profile.verified ? 'success' : 'outline'}>
              {profile.verified ? 'Verificato' : 'In verifica'}
            </Badge>
            <Badge variant="secondary">{profile.username}</Badge>
          </div>
          <CardTitle>{profile.displayName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Rating</p>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {profile.ratingAverage.toFixed(1)} / 5
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {profile.reviewsCount} recensioni
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Performance
            </p>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {profile.responseRatePct}%
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Risposta media {profile.responseTimeLabel}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Membro da
            </p>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {formatDate(profile.joinedAt)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{profile.locationLabel}</p>
          </div>
          <p className="sm:col-span-3 text-sm text-[var(--color-text-muted)]">{profile.bio}</p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2>Annunci pubblicati</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2>Recensioni venditore</h2>
        {reviews.length === 0 ? (
          <Card className="border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardContent className="py-8 text-sm text-[var(--color-text-muted)]">
              Nessuna recensione disponibile.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((review) => (
              <Card
                className="border-[var(--color-border)] bg-[var(--color-surface)]"
                key={review.id}
              >
                <CardContent className="space-y-2 pt-5">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {review.author} · {review.rating}/5
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">{review.comment}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatDate(review.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
