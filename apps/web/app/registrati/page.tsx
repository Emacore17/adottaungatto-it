import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';

export default function RegisterPage() {
  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Account</Badge>
            <Badge variant="outline">Workspace personale</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Con un account puoi pubblicare, aggiornare i tuoi annunci e mantenere ordinate le
            conversazioni private.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/login">Accedi</LinkButton>
            <LinkButton href="/contatti" variant="outline">
              Hai bisogno di aiuto?
            </LinkButton>
          </div>
        </div>
      }
      description="La creazione account viene consolidata qui: intanto la pagina resta corta, chiara e focalizzata su cosa sblocca davvero l'accesso."
      eyebrow="Registrazione"
      title="Crea il tuo account"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cosa sblocchi con l account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>Le funzioni che richiedono autenticazione sono concentrate nel workspace personale.</p>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Pubblicazione e modifica dei tuoi annunci.</span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Conversazioni private collegate agli annunci che ti interessano.</span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Accesso ordinato a account, preferiti, messaggi e impostazioni.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Come partire adesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Se possiedi gia le credenziali, entra subito dal login. Se devi ancora attivare
              l&apos;accesso, usa i contatti per orientarti sul percorso piu adatto.
            </p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/login">Vai al login</LinkButton>
              <LinkButton href="/contatti" variant="outline">
                Contatti e supporto
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
