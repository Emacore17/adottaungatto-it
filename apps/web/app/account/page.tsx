import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';
import { requireWebSession } from '../../lib/auth';
import { fetchMyListings } from '../../lib/listings';

export default async function AccountPage() {
  const session = await requireWebSession('/account');
  const listings = await fetchMyListings().catch(() => []);
  const roleLabel = session.user.roles.length > 0 ? session.user.roles.join(', ') : 'utente';

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Sessione attiva</Badge>
            <Badge variant="outline">{roleLabel}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Utente
            </p>
            <p className="text-sm font-medium text-[var(--color-text)]">{session.user.email}</p>
          </div>
        </div>
      }
      description="L'account e stato ridotto a un cruscotto essenziale che conferma autenticazione, sessione e collegamento ai dati privati."
      eyebrow="Area riservata"
      title="Dashboard account"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Annunci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold text-[var(--color-text)]">{listings.length}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Record recuperati tramite l'endpoint autenticato dei miei annunci.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Autenticazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
            <p>Cookie di sessione e lookup `/v1/users/me` ancora attivi.</p>
            <p>Le route protette usano ancora `requireWebSession()`.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prossimo rebuild</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
            <p>
              Reintrodurre dashboard, messaggi e impostazioni solo come flussi separati e chiari.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/account/annunci">I miei annunci</LinkButton>
        <LinkButton href="/pubblica" variant="outline">
          Pubblica
        </LinkButton>
        <LinkButton href="/account/impostazioni" variant="secondary">
          Impostazioni
        </LinkButton>
      </div>

      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="secondary">
          Logout
        </Button>
      </form>
    </PageShell>
  );
}
