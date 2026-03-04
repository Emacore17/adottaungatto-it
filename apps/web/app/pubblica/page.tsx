import { CardContent } from '@adottaungatto/ui';
import { ListingEditor } from '../../components/listing-editor';
import { WorkspacePageShell } from '../../components/workspace-page-shell';
import { requireWebSession } from '../../lib/auth';
import { fetchListingBreeds } from '../../lib/listings';

export default async function PublishPage() {
  await requireWebSession('/pubblica');
  const breeds = await fetchListingBreeds();

  return (
    <WorkspacePageShell
      aside={
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Prima di iniziare
          </p>
          <div className="space-y-3 text-sm leading-6 text-[var(--color-text)]">
            <p>Titolo, localita e foto sono le tre cose da completare per prime.</p>
            <p>Usa la navigazione interna per spostarti tra sezioni senza perdere il contesto.</p>
            <p>Puoi salvare la bozza anche se la scheda non e ancora completa.</p>
          </div>
        </CardContent>
      }
      description="Crea una scheda completa con sezioni piu leggibili, accesso rapido alle foto e salvataggio sempre raggiungibile."
      eyebrow="Area riservata"
      title="Pubblica annuncio"
    >
      <ListingEditor breeds={breeds} />
    </WorkspacePageShell>
  );
}
