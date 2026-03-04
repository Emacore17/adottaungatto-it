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
import { redirect } from 'next/navigation';
import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';
import { getWebSession } from '../../lib/auth';

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}

const getFirstParamValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const mapErrorMessage = (code: string | undefined) => {
  if (code === 'invalid_credentials') {
    return 'Credenziali non valide. Riprova.';
  }

  if (code === 'missing_credentials') {
    return 'Inserisci username e password.';
  }

  return undefined;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getWebSession().catch(() => null);
  if (session) {
    redirect('/account');
  }

  const resolvedSearchParams = await searchParams;
  const nextPath = getFirstParamValue(resolvedSearchParams?.next) ?? '/account';
  const errorMessage = mapErrorMessage(getFirstParamValue(resolvedSearchParams?.error));

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Accesso sicuro
            </p>
            <p className="text-sm text-[var(--color-text)]">
              Accedi per pubblicare annunci, rispondere ai messaggi e gestire le tue preferenze.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Sessione protetta</Badge>
            <Badge variant="outline">Redirect automatico</Badge>
          </div>
        </div>
      }
      description="Entra nel tuo account per pubblicare annunci, seguire i messaggi e aggiornare le impostazioni del profilo."
      eyebrow="Autenticazione"
      title="Accedi al tuo account"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Usa le credenziali del tuo account per continuare.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/login" className="space-y-4" method="post">
              <input name="next" type="hidden" value={nextPath} />
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="username">
                  Username
                </label>
                <Input id="username" name="username" placeholder="utente.demo" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  placeholder="demo1234"
                  required
                  type="password"
                />
              </div>
              {errorMessage ? (
                <p className="text-sm text-[var(--color-danger-fg)]">{errorMessage}</p>
              ) : null}
              <Button className="w-full" type="submit">
                Accedi
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accessi utili</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>Se non ricordi la password, puoi avviare il recupero oppure aprire la registrazione.</p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/registrati" variant="outline">
                Registrati
              </LinkButton>
              <LinkButton href="/password-dimenticata" variant="ghost">
                Password dimenticata
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
