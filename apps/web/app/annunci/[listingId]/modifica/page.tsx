import { CardContent } from '@adottaungatto/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingEditor } from '../../../../components/listing-editor';
import { WorkspacePageShell } from '../../../../components/workspace-page-shell';
import { requireWebSession } from '../../../../lib/auth';
import {
  fetchListingBreeds,
  fetchMyListingById,
  fetchMyListingMedia,
} from '../../../../lib/listings';

export const metadata: Metadata = {
  title: 'Modifica annuncio',
};

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
    <WorkspacePageShell
      aside={
        <CardContent className="space-y-3 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Annuncio #{listing.id}
          </p>
          <p className="text-sm leading-6 text-[var(--color-text)]">
            Aggiorna contenuti, localita e galleria da un unico editor, con anteprima e salvataggio
            sempre a portata di mano.
          </p>
        </CardContent>
      }
      description="Aggiorna tutti i campi dell'annuncio con una gerarchia piu chiara, navigazione per sezioni e controlli rapidi anche su mobile."
      eyebrow="Area riservata"
      title={`Modifica: ${listing.title}`}
    >
      <ListingEditor breeds={breeds} initialListing={listing} initialMedia={media} />
    </WorkspacePageShell>
  );
}
