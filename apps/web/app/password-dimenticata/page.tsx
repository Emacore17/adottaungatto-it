import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';

export default function ForgotPasswordPage() {
  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Recupero accesso</Badge>
            <Badge variant="outline">Percorso essenziale</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Se non riesci a entrare, parti dal login o dai contatti: l obiettivo qui e evitare
            passaggi confusi e darti un punto chiaro da cui ripartire.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/login">Torna al login</LinkButton>
            <LinkButton href="/contatti" variant="outline">
              Supporto
            </LinkButton>
          </div>
        </div>
      }
      description="Una pagina breve per recuperare il contesto: cosa controllare prima e da quale percorso conviene ripartire se hai perso l'accesso."
      eyebrow="Password dimenticata"
      title="Recupera l'accesso al tuo account"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prima di tutto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Verifica di stare usando username e password corretti dalla pagina login.</span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Se sei gia dentro da un altro dispositivo, controlla impostazioni e sicurezza prima di uscire.</span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Usa i contatti se ti serve orientamento sul percorso corretto di recupero.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Percorsi utili</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Abbiamo mantenuto questa route corta e pulita proprio per evitare schermate tecniche o
              istruzioni ridondanti.
            </p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/login">Apri il login</LinkButton>
              <LinkButton href="/sicurezza" variant="outline">
                Sicurezza del sito
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
