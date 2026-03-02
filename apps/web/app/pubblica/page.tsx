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
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Prima di iniziare
          </p>
          <div className="space-y-3 text-sm leading-6 text-[var(--color-text)]">
            <p>
              Titolo specifico, descrizione concreta e localita precisa migliorano subito la scheda.
            </p>
            <p>
              Carica almeno una foto nitida e scegli la copertina migliore gia in fase di bozza.
            </p>
            <p>
              Ogni salvataggio usa il backend reale: puoi riprendere la modifica in qualsiasi
              momento.
            </p>
          </div>
        </CardContent>
      }
      description="Crea una scheda completa con dati strutturati, localita precisa e foto gestite in un flusso piu chiaro e affidabile."
      eyebrow="Area riservata"
      title="Pubblica annuncio"
    >
      <ListingEditor breeds={breeds} />
    </PageShell>
  );
}
