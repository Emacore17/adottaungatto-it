import { CardContent } from '@adottaungatto/ui';
import { notFound } from 'next/navigation';
import { ListingEditor } from '../../../../components/listing-editor';
import { PageShell } from '../../../../components/page-shell';
import { requireWebSession } from '../../../../lib/auth';
import {
  fetchListingBreeds,
  fetchMyListingById,
  fetchMyListingMedia,
} from '../../../../lib/listings';

interface EditListingPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { listingId } = await params;
  await requireWebSession(`/annunci/${listingId}/modifica`);
  const [listing, breeds, media] = await Promise.all([
    fetchMyListingById(listingId),
    fetchListingBreeds(),
    fetchMyListingMedia(listingId).catch(() => []),
  ]);

  if (!listing) {
    notFound();
  }

  return (
    <PageShell
      aside={
        <CardContent className="space-y-3 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Annuncio #{listing.id}
          </p>
          <p className="text-sm leading-6 text-[var(--color-text)]">
            Modifica contenuti, foto e copertina mantenendo il collegamento diretto ai dati gia
            presenti nel tuo account.
          </p>
        </CardContent>
      }
      description="Aggiorna tutti i campi dell'annuncio, riorganizza la galleria e scegli la foto copertina direttamente dalla pagina di modifica."
      eyebrow="Area riservata"
      title={`Modifica: ${listing.title}`}
    >
      <ListingEditor breeds={breeds} initialListing={listing} initialMedia={media} />
    </PageShell>
  );
}
