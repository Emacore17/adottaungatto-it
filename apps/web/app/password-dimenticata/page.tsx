import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@adottaungatto/ui';
import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';

interface ForgotPasswordPageProps {
  searchParams?: Promise<{
    status?: string | string[];
  }>;
}

const getFirstParamValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const mapStatusMessage = (status: string | undefined) => {
  if (status === 'sent') {
    return {
      variant: 'success' as const,
      text: 'Se l account esiste, invieremo le istruzioni di recupero all indirizzo associato.',
    };
  }

  if (status === 'missing_identifier') {
    return {
      variant: 'danger' as const,
      text: 'Inserisci email o username per continuare.',
    };
  }

  return null;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const statusMessage = mapStatusMessage(getFirstParamValue(resolvedSearchParams?.status));

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Recupero credenziali</Badge>
            <Badge variant="outline">Risposta neutra</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Per sicurezza non confermiamo mai se un account esiste: vedrai sempre lo stesso
            messaggio di esito.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/login">Torna al login</LinkButton>
            <LinkButton href="/registrati" variant="outline">
              Crea account
            </LinkButton>
          </div>
        </div>
      }
      description="Inserisci email o username e avvia il recupero password con un flusso sicuro e anti-enumeration."
      eyebrow="Password dimenticata"
      title="Recupera l'accesso al tuo account"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invio istruzioni di recupero</CardTitle>
            <CardDescription>
              Usa email o username. Se l account esiste, riceverai un messaggio con i passaggi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action="/api/auth/password-recovery" className="space-y-4" method="post">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="identifier">
                  Email o username
                </label>
                <Input
                  autoComplete="username email"
                  id="identifier"
                  name="identifier"
                  placeholder="utente.demo oppure utente.demo@adottaungatto.local"
                  required
                />
              </div>

              {statusMessage ? (
                <p
                  className={
                    statusMessage.variant === 'success'
                      ? 'text-sm text-[var(--color-success-fg)]'
                      : 'text-sm text-[var(--color-danger-fg)]'
                  }
                >
                  {statusMessage.text}
                </p>
              ) : null}

              <Button type="submit">Invia istruzioni</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Come funziona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Compili il campo con email o username.</span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Il sistema prova il recupero senza esporre informazioni sull esistenza account.</span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                />
                <span>Se l account e valido, riceverai l email di reset.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
