import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@adottaungatto/ui';
import Link from 'next/link';

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
  const resolvedSearchParams = await searchParams;
  const nextPath = getFirstParamValue(resolvedSearchParams?.next) ?? '/account';
  const errorMessage = mapErrorMessage(getFirstParamValue(resolvedSearchParams?.error));

  return (
    <main className="mx-auto grid w-full max-w-[1080px] gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)] lg:p-10">
        <Badge variant="info">Area utente premium</Badge>
        <h1 className="mt-4 text-4xl">Accedi e gestisci i tuoi annunci in tempo reale.</h1>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Dashboard annunci, preferiti, messaggi e sicurezza account in un unico workspace.
        </p>
        <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">
          <li>Stato moderazione sempre visibile</li>
          <li>Messaggi con inserzionisti in thread ordinati</li>
          <li>Controllo sicurezza e sessioni</li>
        </ul>
      </section>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
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
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link className="text-[var(--color-primary)] hover:underline" href="/registrati">
              Crea account
            </Link>
            <Link
              className="text-[var(--color-primary)] hover:underline"
              href="/password-dimenticata"
            >
              Password dimenticata
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
