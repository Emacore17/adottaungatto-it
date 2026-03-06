import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { redirect } from 'next/navigation';
import { LinkButton } from '../../components/link-button';
import { NativeLinkButton } from '../../components/native-link-button';
import { PageShell } from '../../components/page-shell';
import { getWebSession, isWebSocialProviderEnabled } from '../../lib/auth';

interface RegisterPageProps {
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
  if (code === 'social_provider_unavailable') {
    return 'Registrazione social non disponibile in questo ambiente.';
  }

  return undefined;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await getWebSession().catch(() => null);
  if (session) {
    redirect(session.user.emailVerified === true ? '/account' : '/verifica-account');
  }

  const resolvedSearchParams = await searchParams;
  const nextPath = getFirstParamValue(resolvedSearchParams?.next) ?? '/verifica-account';
  const errorMessage = mapErrorMessage(getFirstParamValue(resolvedSearchParams?.error));
  const googleSocialEnabled = isWebSocialProviderEnabled('google');
  const registerHref = `/api/auth/register?next=${encodeURIComponent(nextPath)}`;
  const googleRegisterHref = `/api/auth/register/google?next=${encodeURIComponent(nextPath)}`;

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
            <LinkButton href="/verifica-account" variant="outline">
              Stato verifica
            </LinkButton>
            <LinkButton href="/contatti" variant="outline">
              Hai bisogno di aiuto?
            </LinkButton>
          </div>
        </div>
      }
      description="Avvia la registrazione reale tramite provider autenticazione e completa la verifica email per sbloccare il workspace."
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
            <CardTitle>Registrazione in un passaggio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Il flusso si apre sul provider di autenticazione: crea account, verifica email e
              torna automaticamente su AdottaUnGatto.
            </p>
            {errorMessage ? <p className="text-sm text-[var(--color-danger-fg)]">{errorMessage}</p> : null}
            <NativeLinkButton className="w-fit" href={registerHref}>
              Continua con registrazione
            </NativeLinkButton>
            {googleSocialEnabled ? (
              <LinkButton className="w-fit" href={googleRegisterHref} variant="outline">
                Registrati con Google
              </LinkButton>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/login" variant="outline">
                Ho gia un account
              </LinkButton>
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
