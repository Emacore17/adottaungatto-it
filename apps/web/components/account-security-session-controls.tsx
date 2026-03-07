'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { useMemo, useState } from 'react';
import { SESSION_EXPIRED_MESSAGE, fetchWithAuthRefresh } from '../lib/client-auth-fetch';
import type { UserLinkedIdentity, UserSessionRecord } from '../lib/users';

interface AccountSecuritySessionControlsProps {
  initialLinkedIdentities: UserLinkedIdentity[];
  initialSessions: UserSessionRecord[];
  enabledSocialProviders: string[];
}

const sortLinkedIdentities = (linkedIdentities: UserLinkedIdentity[]): UserLinkedIdentity[] =>
  [...linkedIdentities].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    const leftDate = left.lastSeenAt ? Date.parse(left.lastSeenAt) : 0;
    const rightDate = right.lastSeenAt ? Date.parse(right.lastSeenAt) : 0;
    return rightDate - leftDate;
  });

const sortSessions = (sessions: UserSessionRecord[]): UserSessionRecord[] =>
  [...sessions].sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) {
      return left.isCurrent ? -1 : 1;
    }

    const leftDate = left.lastSeenAt ? Date.parse(left.lastSeenAt) : 0;
    const rightDate = right.lastSeenAt ? Date.parse(right.lastSeenAt) : 0;
    return rightDate - leftDate;
  });

export function AccountSecuritySessionControls({
  initialLinkedIdentities,
  initialSessions,
  enabledSocialProviders,
}: AccountSecuritySessionControlsProps) {
  const [linkedIdentities, setLinkedIdentities] = useState<UserLinkedIdentity[]>(
    sortLinkedIdentities(initialLinkedIdentities),
  );
  const [sessions, setSessions] = useState<UserSessionRecord[]>(sortSessions(initialSessions));
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providersToLink = useMemo(
    () =>
      enabledSocialProviders.filter(
        (provider) => !linkedIdentities.some((identity) => identity.provider === provider),
      ),
    [enabledSocialProviders, linkedIdentities],
  );

  const startIdentityLink = async (provider: string) => {
    setError(null);
    setMessage(null);
    setPendingProvider(provider);

    try {
      const response = await fetchWithAuthRefresh(
        `/api/users/me/linked-identities/${encodeURIComponent(provider)}/start`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
        },
      );

      const payload = (await response.json().catch(() => ({}))) as {
        redirectUrl?: string;
        message?: string;
      };
      if (!response.ok || typeof payload.redirectUrl !== 'string' || payload.redirectUrl.length === 0) {
        setError(
          response.status === 401
            ? SESSION_EXPIRED_MESSAGE
            : payload.message ?? 'Impossibile avviare il collegamento identita.',
        );
        return;
      }

      window.location.assign(payload.redirectUrl);
    } catch {
      setError('Errore di rete durante l avvio del collegamento identita.');
    } finally {
      setPendingProvider(null);
    }
  };

  const unlinkIdentity = async (provider: string) => {
    setError(null);
    setMessage(null);
    setPendingProvider(provider);

    try {
      const response = await fetchWithAuthRefresh(
        `/api/users/me/linked-identities/${encodeURIComponent(provider)}`,
        {
          method: 'DELETE',
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        linkedIdentities?: UserLinkedIdentity[];
        message?: string;
      };

      if (!response.ok) {
        setError(
          response.status === 401
            ? SESSION_EXPIRED_MESSAGE
            : payload.message ?? 'Impossibile scollegare il provider selezionato.',
        );
        return;
      }

      setLinkedIdentities(sortLinkedIdentities(Array.isArray(payload.linkedIdentities) ? payload.linkedIdentities : []));
      setMessage(`Provider ${provider} scollegato.`);
    } catch {
      setError('Errore di rete durante lo scollegamento provider.');
    } finally {
      setPendingProvider(null);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setError(null);
    setMessage(null);
    setPendingSessionId(sessionId);

    try {
      const response = await fetchWithAuthRefresh(
        `/api/users/me/sessions/${encodeURIComponent(sessionId)}`,
        {
          method: 'DELETE',
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        sessions?: UserSessionRecord[];
        message?: string;
      };

      if (!response.ok) {
        setError(
          response.status === 401
            ? SESSION_EXPIRED_MESSAGE
            : payload.message ?? 'Impossibile revocare la sessione selezionata.',
        );
        return;
      }

      setSessions(sortSessions(Array.isArray(payload.sessions) ? payload.sessions : []));
      setMessage('Sessione revocata correttamente.');
    } catch {
      setError('Errore di rete durante la revoca sessione.');
    } finally {
      setPendingSessionId(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Identita collegate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
          {linkedIdentities.length === 0 ? (
            <p>Nessuna identita collegata disponibile.</p>
          ) : (
            linkedIdentities.map((identity) => (
              <div
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]/80 px-3 py-2"
                key={`${identity.provider}:${identity.providerSubject}`}
              >
                <p className="font-medium text-[var(--color-text)]">
                  {identity.provider}
                  {identity.isPrimary ? ' (principale)' : ''}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Ultimo accesso: {identity.lastSeenAt ?? 'n/d'}
                </p>
                {!identity.isPrimary ? (
                  <div className="mt-2">
                    <Button
                      disabled={pendingProvider === identity.provider}
                      onClick={() => {
                        void unlinkIdentity(identity.provider);
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {pendingProvider === identity.provider ? 'Scollegamento...' : 'Scollega'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}

          {providersToLink.length > 0 ? (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Collega un nuovo provider
              </p>
              <div className="flex flex-wrap gap-2">
                {providersToLink.map((provider) => (
                  <Button
                    disabled={pendingProvider === provider}
                    key={provider}
                    onClick={() => {
                      void startIdentityLink(provider);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {pendingProvider === provider
                      ? `Avvio ${provider}...`
                      : `Collega ${provider}`}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessioni attive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
          {sessions.length === 0 ? (
            <p>Nessuna sessione attiva rilevata.</p>
          ) : (
            sessions.map((session) => (
              <div
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]/80 px-3 py-2"
                key={session.sessionId}
              >
                <p className="font-medium text-[var(--color-text)]">
                  {session.clientId ?? 'client sconosciuto'}
                  {session.isCurrent ? ' (corrente)' : ''}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  IP: {session.ipAddress ?? 'n/d'} - Ultima attivita: {session.lastSeenAt ?? 'n/d'}
                </p>
                {!session.isCurrent ? (
                  <div className="mt-2">
                    <Button
                      disabled={pendingSessionId === session.sessionId}
                      onClick={() => {
                        void revokeSession(session.sessionId);
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {pendingSessionId === session.sessionId ? 'Revoca...' : 'Revoca sessione'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {message ? (
        <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 lg:col-span-2">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 lg:col-span-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
