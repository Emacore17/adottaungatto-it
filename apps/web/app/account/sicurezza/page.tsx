import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../../components/link-button';
import { WorkspacePageShell } from '../../../components/workspace-page-shell';
import { requireWebSession } from '../../../lib/auth';

export default async function AccountSecurityPage() {
  const session = await requireWebSession('/account/sicurezza');
  const roleLabel = session.user.roles.length > 0 ? session.user.roles.join(', ') : 'utente';

  return (
    <WorkspacePageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Sessione attiva</Badge>
            <Badge variant="outline">{roleLabel}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Accesso attuale
            </p>
            <p className="text-sm font-medium text-[var(--color-text)]">{session.user.email}</p>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Questa area raccoglie i controlli essenziali gia utili oggi: sessione, logout e link
            rapidi verso le impostazioni del tuo account.
          </p>
        </div>
      }
      description="Una pagina di sicurezza essenziale, senza promesse superflue: vedi lo stato dell'accesso, tieni sotto controllo il tuo account e chiudi la sessione quando serve."
      eyebrow="Area riservata"
      title="Sicurezza account"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sessione e accesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>Le aree private restano disponibili solo quando la tua sessione e valida.</p>
            <p>
              L accesso in corso e collegato a <span className="font-medium text-[var(--color-text)]">{session.user.email}</span>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messaggi e notifiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>Le conversazioni restano nella tua inbox privata e le notifiche email sono gestibili dalle impostazioni.</p>
            <p>Se condividi il dispositivo, fai logout quando hai finito di consultare messaggi e annunci.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buone pratiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>Usa la chat interna per restare nel contesto corretto di ogni annuncio.</p>
            <p>Evita di lasciare aperta la sessione su browser condivisi o non controllati.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/account/impostazioni">Apri impostazioni</LinkButton>
        <LinkButton href="/messaggi" variant="outline">
          Messaggi
        </LinkButton>
        <LinkButton href="/account" variant="secondary">
          Dashboard
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
