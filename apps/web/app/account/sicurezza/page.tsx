import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import type { Metadata } from 'next';
import { AccountPhoneVerificationForms } from '../../../components/account-phone-verification-forms';
import { AccountSecuritySessionControls } from '../../../components/account-security-session-controls';
import { LinkButton } from '../../../components/link-button';
import { WorkspacePageShell } from '../../../components/workspace-page-shell';
import { isWebSocialProviderEnabled, requireWebSession } from '../../../lib/auth';
import { fetchMyLinkedIdentities, fetchMyProfile, fetchMySessions } from '../../../lib/users';

export const metadata: Metadata = {
  title: 'Sicurezza account',
};

interface AccountSecurityPageProps {
  searchParams?: Promise<{
    phoneVerification?: string | string[];
    devCode?: string | string[];
    retryAfterSeconds?: string | string[];
  }>;
}

const getFirstParamValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const parsePositiveIntegerParam = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const formatRetryAfter = (retryAfterSeconds: number): string => {
  if (retryAfterSeconds < 60) {
    return `${retryAfterSeconds} secondi`;
  }

  const minutes = Math.ceil(retryAfterSeconds / 60);
  if (minutes === 1) {
    return 'circa 1 minuto';
  }

  return `circa ${minutes} minuti`;
};

const resolvePhoneVerificationMessage = (
  status: string | undefined,
  retryAfterSeconds?: number,
): { variant: 'success' | 'warning'; text: string } | null => {
  if (status === 'requested') {
    return {
      variant: 'success',
      text: 'Codice OTP inviato. Inseriscilo per completare la verifica telefono.',
    };
  }

  if (status === 'verified') {
    return {
      variant: 'success',
      text: 'Numero di telefono verificato con successo.',
    };
  }

  if (status === 'invalid_code') {
    return {
      variant: 'warning',
      text: 'Codice non valido. Riprova o richiedi un nuovo codice.',
    };
  }

  if (status === 'expired') {
    return {
      variant: 'warning',
      text: 'Codice scaduto. Richiedi un nuovo codice OTP.',
    };
  }

  if (status === 'rate_limited') {
    return {
      variant: 'warning',
      text: retryAfterSeconds
        ? `Hai superato il numero di tentativi consentiti. Riprova tra ${formatRetryAfter(retryAfterSeconds)}.`
        : 'Hai superato il numero di tentativi consentiti. Attendi e riprova.',
    };
  }

  if (status === 'request_required') {
    return {
      variant: 'warning',
      text: 'Richiedi prima un codice OTP per il numero selezionato.',
    };
  }

  if (status === 'missing_code') {
    return {
      variant: 'warning',
      text: 'Inserisci il codice OTP prima di confermare la verifica.',
    };
  }

  if (status === 'invalid_phone') {
    return {
      variant: 'warning',
      text: 'Numero non valido. Usa il formato E.164, ad esempio +393331112233.',
    };
  }

  if (status === 'delivery_unavailable') {
    return {
      variant: 'warning',
      text: 'Invio OTP temporaneamente non disponibile. Riprova tra poco.',
    };
  }

  if (status === 'request_failed' || status === 'confirm_failed' || status === 'missing_phone') {
    return {
      variant: 'warning',
      text: 'Operazione non completata. Controlla il numero e riprova.',
    };
  }

  return null;
};

export default async function AccountSecurityPage({ searchParams }: AccountSecurityPageProps) {
  const session = await requireWebSession('/account/sicurezza');
  const [profile, linkedIdentities, sessions] = await Promise.all([
    fetchMyProfile(),
    fetchMyLinkedIdentities(),
    fetchMySessions(),
  ]);
  const resolvedSearchParams = await searchParams;
  const verificationStatus = getFirstParamValue(resolvedSearchParams?.phoneVerification);
  const devCode = getFirstParamValue(resolvedSearchParams?.devCode);
  const retryAfterSeconds = parsePositiveIntegerParam(
    getFirstParamValue(resolvedSearchParams?.retryAfterSeconds),
  );
  const verificationMessage = resolvePhoneVerificationMessage(
    verificationStatus,
    retryAfterSeconds,
  );
  const phoneIsVerified = Boolean(profile.phoneVerifiedAt && profile.phoneE164);
  const roleLabel = session.user.roles.length > 0 ? session.user.roles.join(', ') : 'utente';
  const enabledSocialProviders = ['google'].filter((provider) =>
    isWebSocialProviderEnabled(provider),
  );

  return (
    <WorkspacePageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Sessione attiva</Badge>
            <Badge variant="outline">{roleLabel}</Badge>
            {phoneIsVerified ? (
              <Badge variant="success">Telefono verificato</Badge>
            ) : (
              <Badge variant="warning">Telefono non verificato</Badge>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Accesso attuale
            </p>
            <p className="text-sm font-medium text-[var(--color-text)]">{session.user.email}</p>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Questa area raccoglie i controlli essenziali gia utili oggi: sessione, logout e link
            rapidi verso le impostazioni del tuo account.
          </p>
        </div>
      }
      description="Una pagina di sicurezza essenziale, senza promesse superflue: vedi lo stato dell'accesso, tieni sotto controllo il tuo account e chiudi la sessione quando serve."
      eyebrow="Area riservata"
      title="Sicurezza account"
    >
      {verificationMessage ? (
        <p
          className={
            verificationMessage.variant === 'success'
              ? 'rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300'
              : 'rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300'
          }
        >
          {verificationMessage.text}
        </p>
      ) : null}
      {devCode ? (
        <p className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
          Codice OTP locale (solo sviluppo): <span className="font-semibold">{devCode}</span>
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Verifica telefono</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Numero attuale:{' '}
              <span className="font-medium text-[var(--color-text)]">
                {profile.phoneE164 ?? 'non impostato'}
              </span>
            </p>
            <p>
              Stato verifica:{' '}
              <span className="font-medium text-[var(--color-text)]">
                {phoneIsVerified ? 'verificato' : 'da verificare'}
              </span>
            </p>

            <AccountPhoneVerificationForms defaultPhoneE164={profile.phoneE164} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessione e accesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>Le aree private restano disponibili solo quando la tua sessione e valida.</p>
            <p>
              L accesso in corso e collegato a{' '}
              <span className="font-medium text-[var(--color-text)]">{session.user.email}</span>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messaggi e notifiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Le conversazioni restano nella tua inbox privata e le notifiche email sono gestibili
              dalle impostazioni.
            </p>
            <p>
              Se condividi il dispositivo, fai logout quando hai finito di consultare messaggi e
              annunci.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buone pratiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>Usa la chat interna per restare nel contesto corretto di ogni annuncio.</p>
            <p>Evita di lasciare aperta la sessione su browser condivisi o non controllati.</p>
          </CardContent>
        </Card>
      </div>

      <AccountSecuritySessionControls
        enabledSocialProviders={enabledSocialProviders}
        initialLinkedIdentities={linkedIdentities}
        initialSessions={sessions}
      />

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/account/impostazioni">Apri impostazioni</LinkButton>
        <LinkButton href="/messaggi" variant="outline">
          Messaggi
        </LinkButton>
        <LinkButton href="/account" variant="secondary">
          Dashboard
        </LinkButton>
      </div>

      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="secondary">
          Logout
        </Button>
      </form>
    </WorkspacePageShell>
  );
}
