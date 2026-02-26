import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@adottaungatto/ui';
import Link from 'next/link';
import { requireWebSession } from '../../../../lib/auth';
import { fetchMyListingById } from '../../../../lib/listings';

interface ListingEditPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function ListingEditPage({ params }: ListingEditPageProps) {
  const { listingId } = await params;
  await requireWebSession(`/annunci/${listingId}/modifica`);

  const listing = await fetchMyListingById(listingId);

  return (
    <main className="mx-auto w-full max-w-[980px] space-y-5 px-4 pb-8 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Wizard modifica</Badge>
            <Badge variant="outline">Mock safe fallback</Badge>
          </div>
          <CardTitle>Modifica annuncio #{listingId}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--color-text-muted)]">
          <p>
            Endpoint edit non ancora disponibile. La UI resta operativa con salvataggio mock per non
            bloccare UX.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2" htmlFor="edit-listing-title">
              <span className="text-xs font-medium text-[var(--color-text)]">Titolo</span>
              <Input
                defaultValue={listing?.title ?? `Annuncio ${listingId}`}
                id="edit-listing-title"
              />
            </label>
            <label className="space-y-2" htmlFor="edit-listing-type">
              <span className="text-xs font-medium text-[var(--color-text)]">Tipo annuncio</span>
              <Input defaultValue={listing?.listingType ?? 'adozione'} id="edit-listing-type" />
            </label>
            <label className="space-y-2 sm:col-span-2" htmlFor="edit-listing-description">
              <span className="text-xs font-medium text-[var(--color-text)]">Descrizione</span>
              <textarea
                id="edit-listing-description"
                className="min-h-32 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                defaultValue={listing?.description ?? 'Aggiorna descrizione annuncio...'}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">Salva bozza mock</Button>
            <Button type="button" variant="outline">
              Invia nuova revisione
            </Button>
            <Link href={`/annunci/${listingId}`}>
              <Button type="button" variant="secondary">
                Torna al dettaglio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
