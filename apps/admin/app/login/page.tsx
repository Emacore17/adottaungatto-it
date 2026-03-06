import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';

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
  if (code === 'auth_provider_unavailable') {
    return 'Servizio di accesso temporaneamente non disponibile. Riprova tra poco.';
  }

  if (code === 'auth_cancelled') {
    return 'Accesso annullato.';
  }

  if (code === 'invalid_callback_state') {
    return 'Sessione di accesso non valida. Riprova.';
  }

  if (code === 'invalid_callback_nonce') {
    return 'Verifica di sicurezza fallita. Riprova.';
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
          <form action="/api/auth/login" className="space-y-4" method="get">
            <input name="next" type="hidden" value={nextPath} />
            {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
            <Button className="w-full" type="submit">
              Continua con account admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
