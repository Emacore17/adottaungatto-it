import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@adottaungatto/ui';

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
    return 'Credenziali non valide.';
  }

  if (code === 'missing_credentials') {
    return 'Inserisci username e password.';
  }

  return undefined;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getFirstParamValue(resolvedSearchParams?.next) ?? '/admin';
  const errorMessage = mapErrorMessage(getFirstParamValue(resolvedSearchParams?.error));

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[1080px] items-center gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-lg)]">
        <Badge variant="info">Admin control center</Badge>
        <h1 className="mt-4 text-4xl">Moderazione, policy e audit in un unico pannello.</h1>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Accesso riservato a ruoli moderator/admin con UI ottimizzata per operazioni ad alta
          densita.
        </p>
      </section>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle>Accesso admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" className="space-y-4" method="post">
            <input name="next" type="hidden" value={nextPath} />
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="username">
                Username
              </label>
              <Input id="username" name="username" placeholder="moderatore.demo" required />
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
            {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
            <Button className="w-full" type="submit">
              Entra nel pannello
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
