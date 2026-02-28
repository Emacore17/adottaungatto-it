import { Badge } from '@adottaungatto/ui';
import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';
import { PublicListingsGrid } from '../../components/public-listings-grid';
import { fetchPublicListings } from '../../lib/listings';
import { isMockModeEnabled } from '../../lib/mock-mode';

export default async function ListingsPage() {
  const listings = await fetchPublicListings({ limit: 12 }).catch(() => []);

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Data source
            </p>
            <p className="text-sm text-[var(--color-text)]">
              Endpoint pubblico listings + fallback mock opzionale.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{listings.length} elementi</Badge>
            <Badge variant={isMockModeEnabled ? 'warning' : 'secondary'}>
              Mock {isMockModeEnabled ? 'on' : 'off'}
            </Badge>
          </div>
        </div>
      }
      description="La pagina annunci e tornata a una lista pubblica essenziale. Niente filtri avanzati, drawer o fallback banner: solo il contratto dati e una presentazione minima."
      eyebrow="Catalogo pubblico"
      title="Annunci pubblici"
    >
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/pubblica">Pubblica annuncio</LinkButton>
        <LinkButton href="/login" variant="outline">
          Accedi
        </LinkButton>
      </div>
      <PublicListingsGrid
        emptyDescription="Quando il nuovo motore di ricerca sara ridisegnato, questa vista tornera a crescere sopra lo stesso layer dati."
        listings={listings}
      />
    </PageShell>
  );
}
