import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { shouldFallbackToMock } from '../../../../lib/mock-mode';
import { fetchModerationQueue } from '../../../../lib/moderation';
import { mockModerationListings } from '../../../../mocks/admin-data';

interface ModerationDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

const formatDate = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(rawDate),
  );

export default async function ModerationDetailPage({ params }: ModerationDetailPageProps) {
  const { listingId } = await params;

  let item = mockModerationListings.find((listing) => listing.id === listingId) ?? null;
  let source: 'api' | 'mock' = 'mock';

  try {
    const queue = await fetchModerationQueue(100);
    const queueItem = queue.items.find((candidate) => candidate.id === listingId) ?? null;
    if (queueItem) {
      item = {
        id: queueItem.id,
        listingTitle: queueItem.title,
        sellerUsername: queueItem.ownerEmail.split('@')[0] ?? 'seller',
        sellerVerified: true,
        submittedAt: queueItem.createdAt,
        city: queueItem.comuneName,
        province: queueItem.provinceSigla,
        reasonHint: 'Verifica policy contenuto e media.',
        media: [
          {
            id: `api-${queueItem.id}-media`,
            src: '/mock/cat-4.svg',
            alt: queueItem.title,
            width: 1200,
            height: 800,
          },
        ],
      };
      source = 'api';
    }
  } catch (error) {
    if (!shouldFallbackToMock(null)) {
      throw error;
    }
    source = 'mock';
  }

  if (!item) {
    return (
      <main className="space-y-4">
        <Card className="border-rose-200 bg-rose-50/90">
          <CardHeader>
            <CardTitle>Annuncio non trovato</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/moderazione">
              <Button>Torna alla coda</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={source === 'api' ? 'success' : 'warning'}>
              Source: {source.toUpperCase()}
            </Badge>
            <Badge variant="outline">listing #{item.id}</Badge>
          </div>
          <CardTitle>{item.listingTitle}</CardTitle>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle>Media annuncio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Image
              alt={item.media[0]?.alt ?? item.listingTitle}
              className="h-[360px] w-full rounded-xl object-cover"
              height={item.media[0]?.height ?? 900}
              src={item.media[0]?.src ?? '/mock/cat-1.svg'}
              width={item.media[0]?.width ?? 1200}
            />
            <p className="text-sm text-[var(--color-text-muted)]">
              Motivazione suggerita: {item.reasonHint}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle>Azioni moderazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>Inserzionista: {item.sellerUsername}</p>
            <p>
              Verificato:{' '}
              <strong className="text-[var(--color-text)]">
                {item.sellerVerified ? 'Si' : 'No'}
              </strong>
            </p>
            <p>
              Inviato il:{' '}
              <strong className="text-[var(--color-text)]">{formatDate(item.submittedAt)}</strong>
            </p>
            <p>
              Localita:{' '}
              <strong className="text-[var(--color-text)]">
                {item.city} ({item.province})
              </strong>
            </p>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
              defaultValue={item.reasonHint}
            />
            <div className="grid gap-2">
              <Button type="button">Approva annuncio</Button>
              <Button type="button" variant="danger">
                Rifiuta annuncio
              </Button>
              <Button type="button" variant="outline">
                Sospendi annuncio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
