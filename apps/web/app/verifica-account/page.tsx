import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import type { Metadata } from 'next';
import { LinkButton } from '../../components/link-button';
import { NativeLinkButton } from '../../components/native-link-button';
import { PageShell } from '../../components/page-shell';
import { requireWebSession } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Verifica account',
};

interface VerifyAccountPageProps {
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
      text: 'Se la verifica e ancora in attesa, abbiamo inviato una nuova email.',
    };
  }

  if (status === 'failed') {
    return {
      variant: 'danger' as const,
      text: 'Invio non riuscito. Riprova tra poco.',
    };
  }

  return null;
};

export default async function VerifyAccountPage({ searchParams }: VerifyAccountPageProps) {
  const session = await requireWebSession('/verifica-account');
  const emailVerified = session.user.emailVerified === true;
  const resolvedSearchParams = await searchParams;
  const statusMessage = mapStatusMessage(getFirstParamValue(resolvedSearchParams?.status));

  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={emailVerified ? 'success' : 'secondary'}>
              {emailVerified ? 'Email verificata' : 'Verifica in attesa'}
            </Badge>
            <Badge variant="outline">{session.user.email}</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            La verifica email e necessaria per pubblicare annunci e usare la messaggistica in modo
            completo e sicuro.
          </p>
        </div>
      }
      description="Controlla lo stato di verifica dell'email e completa il passaggio se necessario."
      eyebrow="Sicurezza account"
      title="Verifica il tuo account"
    >
      {emailVerified ? (
        <Card>
          <CardHeader>
            <CardTitle>Verifica completata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>
              Il tuo indirizzo email risulta verificato. Puoi usare tutte le funzioni del workspace.
            </p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/account">Vai al tuo account</LinkButton>
              <LinkButton href="/pubblica" variant="outline">
                Pubblica un annuncio
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Completa la verifica email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
              <p>
                Controlla la casella di posta e conferma il link di verifica inviato dal provider di
                autenticazione.
              </p>
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
              <div className="flex flex-wrap gap-2">
                <form action="/api/auth/email-verification/resend" method="post">
                  <Button type="submit">Invia di nuovo email verifica</Button>
                </form>
                <NativeLinkButton href="/api/auth/login?next=%2Fverifica-account" variant="outline">
                  Apri provider
                </NativeLinkButton>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dopo la conferma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
              <p>Quando hai completato il link ricevuto via email, ricarica questa pagina.</p>
              <div className="flex flex-wrap gap-2">
                <LinkButton href="/verifica-account">Aggiorna stato</LinkButton>
                <LinkButton href="/account" variant="outline">
                  Torna all account
                </LinkButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
