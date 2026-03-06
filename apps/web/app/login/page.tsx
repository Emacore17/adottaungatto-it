import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { redirect } from 'next/navigation';
import { LinkButton } from '../../components/link-button';
import { NativeLinkButton } from '../../components/native-link-button';
import { PageShell } from '../../components/page-shell';
import { getWebSession, isWebSocialProviderEnabled } from '../../lib/auth';

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
    return 'Accesso annullato. Puoi riprovare quando vuoi.';
  }

  if (code === 'invalid_callback_state') {
    return 'Sessione di accesso non valida. Riprova dal pulsante di login.';
  }

  if (code === 'invalid_callback_nonce') {
    return 'Verifica di sicurezza fallita. Riprova il login.';
  }

  if (code === 'social_provider_unavailable') {
    return 'Accesso social non disponibile in questo ambiente.';
  }

  return undefined;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getWebSession().catch(() => null);
  if (session) {
    redirect(session.user.emailVerified === true ? '/account' : '/verifica-account');
  }

  const resolvedSearchParams = await searchParams;
  const nextPath = getFirstParamValue(resolvedSearchParams?.next) ?? '/account';
  const errorMessage = mapErrorMessage(getFirstParamValue(resolvedSearchParams?.error));
  const googleSocialEnabled = isWebSocialProviderEnabled('google');
  const loginHref = `/api/auth/login?next=${encodeURIComponent(nextPath)}`;
  const googleLoginHref = `/api/auth/login/google?next=${encodeURIComponent(nextPath)}`;

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
            <CardDescription>
              Continua con il provider sicuro per accedere al tuo account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {errorMessage ? (
                <p className="text-sm text-[var(--color-danger-fg)]">{errorMessage}</p>
              ) : null}
              <NativeLinkButton className="w-full" href={loginHref}>
                Continua con account
              </NativeLinkButton>
            </div>
            {googleSocialEnabled ? (
              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                <LinkButton className="w-full" href={googleLoginHref} variant="outline">
                  Continua con Google
                </LinkButton>
              </div>
            ) : null}
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
