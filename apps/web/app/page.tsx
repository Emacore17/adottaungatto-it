import { loadWebEnv } from '@adottaungatto/config';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../components/link-button';
import { PageShell } from '../components/page-shell';
import { PublicListingsGrid } from '../components/public-listings-grid';
import { fetchPublicListings } from '../lib/listings';
import { isMockModeEnabled } from '../lib/mock-mode';

export default async function Page() {
  const env = loadWebEnv();
  const listings = await fetchPublicListings({ limit: 3 }).catch(() => []);

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Contratti attivi
            </p>
            <p className="text-sm text-[var(--color-text)]">
              Auth, API proxy e listing data layer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">API {env.NEXT_PUBLIC_API_URL}</Badge>
            <Badge variant={isMockModeEnabled ? 'warning' : 'success'}>
              Mock {isMockModeEnabled ? 'on' : 'off'}
            </Badge>
          </div>
        </div>
      }
      description="Il frontend web e stato riportato a uno scaffold essenziale: shell minima, UI condivisa, motion centralizzato e riferimenti backend ancora al loro posto."
      eyebrow="Next.js scaffold"
      title="Frontend web azzerato e pronto da ricostruire."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Base operativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Le route principali sono ancora presenti ma alleggerite. Da qui si puo ripartire senza
              trascinarsi componenti verticali, mock UI e flussi non piu desiderati.
            </p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/annunci">Apri annunci</LinkButton>
              <LinkButton href="/login" variant="outline">
                Vai al login
              </LinkButton>
              <LinkButton href="/account" variant="secondary">
                Apri account
              </LinkButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regole del rebuild</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <li>Layout e navigazione ridotti a un unico shell leggibile.</li>
              <li>Motion concentrato nei wrapper condivisi, non sparso in ogni feature.</li>
              <li>Solo UI primitive e route handler utili restano nella base.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Preview integrazione annunci</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            La home continua a leggere gli annunci pubblici tramite il data layer esistente, ma la
            presentazione e tornata al minimo indispensabile.
          </p>
        </div>
        <PublicListingsGrid
          emptyDescription="Nessun dato pubblico disponibile al momento. Il backend resta collegabile tramite lo stesso layer."
          listings={listings}
        />
      </div>
    </PageShell>
  );
}
