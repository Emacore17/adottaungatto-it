import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import type { Metadata } from 'next';
import { LinkButton } from '../../components/link-button';
import { WorkspacePageShell } from '../../components/workspace-page-shell';
import { requireWebSession } from '../../lib/auth';
import { fetchMyListings } from '../../lib/listings';

export const metadata: Metadata = {
  title: 'Il tuo account',
};

export default async function AccountPage() {
  const session = await requireWebSession('/account');
  const listings = await fetchMyListings().catch(() => []);
  const roleLabel = session.user.roles.length > 0 ? session.user.roles.join(', ') : 'utente';

  return (
    <WorkspacePageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Sessione attiva</Badge>
            <Badge variant="outline">{roleLabel}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Account
            </p>
            <p className="text-sm font-medium text-[var(--color-text)]">{session.user.email}</p>
          </div>
        </div>
      }
      description="Gestisci annunci, accesso e preferenze da un unico punto, con collegamenti rapidi alle aree che usi di piu."
      eyebrow="Area riservata"
      title="Il tuo account"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Annunci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold text-[var(--color-text)]">{listings.length}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Schede create dal tuo account e pronte da consultare o aggiornare.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
            <p>La tua sessione e attiva e ti permette di entrare nelle aree riservate.</p>
            <p>Da qui puoi continuare verso annunci, messaggi e impostazioni.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferenze</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
            <p>Aggiorna le notifiche di messaggistica e mantieni ordinato il tuo profilo.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/account/annunci">I miei annunci</LinkButton>
        <LinkButton href="/pubblica" variant="outline">
          Pubblica
        </LinkButton>
        <LinkButton href="/preferiti" variant="secondary">
          Preferiti
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
    </WorkspacePageShell>
  );
}
