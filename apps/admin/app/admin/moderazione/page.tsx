import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { shouldFallbackToMock } from '../../../lib/mock-mode';
import { fetchModerationQueue } from '../../../lib/moderation';
import { mockModerationListings } from '../../../mocks/admin-data';

const formatDate = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(rawDate),
  );

export default async function AdminModerationPage() {
  let source: 'api' | 'mock' = 'api';
  let items = mockModerationListings.map((listing) => ({
    id: listing.id,
    title: listing.listingTitle,
    ownerEmail: `${listing.sellerUsername}@adottaungatto.it`,
    comuneName: listing.city,
    provinceSigla: listing.province,
    regionName: 'Italia',
    mediaCount: listing.media.length,
    createdAt: listing.submittedAt,
    status: 'pending_review',
  }));

  try {
    const queue = await fetchModerationQueue(50);
    items = queue.items;
    source = 'api';
  } catch (error) {
    source = shouldFallbackToMock(null) ? 'mock' : 'mock';
    if (!shouldFallbackToMock(null)) {
      throw error;
    }
  }

  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={source === 'api' ? 'success' : 'warning'}>
              Queue source: {source === 'api' ? 'API' : 'MOCK'}
            </Badge>
            <Badge variant="outline">coda moderazione</Badge>
          </div>
          <CardTitle>Moderazione annunci</CardTitle>
        </CardHeader>
      </Card>

      {items.length === 0 ? (
        <Card className="border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="space-y-2 py-10 text-center">
            <p className="text-base font-semibold text-[var(--color-text)]">Coda vuota</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Nessun annuncio da revisionare in questo momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card className="border-[var(--color-border)] bg-[var(--color-surface)]" key={item.id}>
              <CardContent className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--color-text)]">{item.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {item.comuneName} ({item.provinceSigla}) Â· {item.ownerEmail}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Media {item.mediaCount} Â· inviato {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/moderazione/${item.id}`}>
                    <Button size="sm">Apri dettaglio</Button>
                  </Link>
                  <Button size="sm" variant="outline">
                    Approva rapido
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
