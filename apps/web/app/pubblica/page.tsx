import { CardContent } from '@adottaungatto/ui';
import { ListingEditor } from '../../components/listing-editor';
import { PageShell } from '../../components/page-shell';
import { requireWebSession } from '../../lib/auth';
import { fetchListingBreeds } from '../../lib/listings';

export default async function PublishPage() {
  await requireWebSession('/pubblica');
  const breeds = await fetchListingBreeds();

  return (
    <PageShell
      aside={
        <CardContent className="space-y-3 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Flusso attivo
          </p>
          <p className="text-sm leading-6 text-[var(--color-text)]">
            Creazione annuncio, catalogo razze, localita strutturata e upload foto sono collegati al
            backend reale.
          </p>
        </CardContent>
      }
      description="Crea una scheda completa con dati strutturati, localita precisa e foto gestite direttamente dal nuovo flusso listings."
      eyebrow="Area riservata"
      title="Pubblica annuncio"
    >
      <ListingEditor breeds={breeds} />
    </PageShell>
  );
}
