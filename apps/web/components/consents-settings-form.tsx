'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Toast } from '@adottaungatto/ui';
import { FileCheck2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { SESSION_EXPIRED_MESSAGE, fetchWithAuthRefresh } from '../lib/client-auth-fetch';
import type { UserConsent, UserConsentType } from '../lib/users';

type ToastState = {
  open: boolean;
  title: string;
  description?: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
};

type ConsentFormState = Record<UserConsentType, boolean>;

const CONSENT_DEFINITIONS: Array<{
  type: UserConsentType;
  title: string;
  description: string;
  version: string;
  required: boolean;
}> = [
  {
    type: 'privacy',
    title: 'Informativa privacy',
    description: 'Autorizza il trattamento dati secondo l informativa privacy vigente.',
    version: 'privacy-2026-03',
    required: true,
  },
  {
    type: 'terms',
    title: 'Termini di servizio',
    description: 'Conferma l accettazione delle condizioni di utilizzo della piattaforma.',
    version: 'terms-2026-03',
    required: true,
  },
  {
    type: 'marketing',
    title: 'Comunicazioni marketing',
    description: 'Permette di ricevere email su novita, campagne e iniziative di adozione.',
    version: 'marketing-2026-03',
    required: false,
  },
];

const requiredConsentTypes = new Set<UserConsentType>(
  CONSENT_DEFINITIONS.filter((definition) => definition.required).map(
    (definition) => definition.type,
  ),
);

const emptyConsentState = (): ConsentFormState => ({
  privacy: true,
  terms: true,
  marketing: false,
});

const isConsentType = (value: unknown): value is UserConsentType =>
  value === 'privacy' || value === 'terms' || value === 'marketing';

const toConsentState = (consents: UserConsent[]): ConsentFormState => {
  const nextState = emptyConsentState();
  for (const consent of consents) {
    nextState[consent.type] = requiredConsentTypes.has(consent.type)
      ? true
      : consent.granted === true;
  }

  return nextState;
};

const parseConsentsFromPayload = (payload: unknown): UserConsent[] | null => {
  if (!Array.isArray(payload)) {
    return null;
  }

  const parsed: UserConsent[] = [];
  for (const item of payload) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    if (!isConsentType(record.type)) {
      continue;
    }

    parsed.push({
      type: record.type,
      granted: record.granted === true,
      version: typeof record.version === 'string' ? record.version : null,
      grantedAt: typeof record.grantedAt === 'string' ? record.grantedAt : null,
      source: typeof record.source === 'string' ? record.source : null,
    });
  }

  return parsed;
};

export function ConsentsSettingsForm({
  initialConsents,
}: {
  initialConsents: UserConsent[];
}) {
  const idBase = useId();
  const [consents, setConsents] = useState<ConsentFormState>(() => toConsentState(initialConsents));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'info',
  });

  const payload = useMemo(
    () => ({
      consents: CONSENT_DEFINITIONS.map((definition) => ({
        type: definition.type,
        granted: definition.required ? true : consents[definition.type],
        version: definition.version,
        source: 'account_settings',
      })),
    }),
    [consents],
  );

  const onToggle = (type: UserConsentType, value: boolean) => {
    if (requiredConsentTypes.has(type) && value === false) {
      setToast({
        open: true,
        title: 'Consenso obbligatorio',
        description: 'Privacy e termini di servizio devono restare attivi.',
        variant: 'warning',
      });
      return;
    }

    setConsents((currentValue) => ({
      ...currentValue,
      [type]: value,
    }));
  };

  const saveConsents = async () => {
    setSaving(true);
    try {
      const response = await fetchWithAuthRefresh('/api/users/me/consents', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => null)) as {
        message?: string;
        consents?: unknown;
      } | null;

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(SESSION_EXPIRED_MESSAGE);
        }
        throw new Error(responsePayload?.message ?? 'Impossibile salvare i consensi.');
      }

      const parsedConsents = parseConsentsFromPayload(responsePayload?.consents);
      if (parsedConsents) {
        setConsents(toConsentState(parsedConsents));
      }

      setToast({
        open: true,
        title: 'Modifiche salvate',
        description: 'Salvato con successo.',
        variant: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Salvataggio non riuscito',
        description: error instanceof Error ? error.message : 'Impossibile salvare i consensi.',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
        <CardHeader className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)]">
            <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
            Privacy e consenso
          </div>
          <CardTitle>Gestione consensi account</CardTitle>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Ogni modifica viene tracciata con versione policy e timestamp per garantire audit
            storico.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            I consensi Privacy e Termini di servizio sono obbligatori e restano sempre attivi.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONSENT_DEFINITIONS.map((definition) => {
            const toggleId = `${idBase}-${definition.type}`;
            const descriptionId = `${toggleId}-description`;
            const statusId = `${toggleId}-status`;
            const checked = consents[definition.type];

            return (
              <label
                className={`flex items-start gap-4 rounded-[24px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-4 transition-shadow focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--color-surface)] ${
                  definition.required ? 'cursor-default' : 'cursor-pointer'
                }`}
                htmlFor={toggleId}
                key={definition.type}
              >
                <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[color:color-mix(in_srgb,var(--color-border)_88%,white_12%)] transition-colors">
                  <input
                    aria-checked={checked}
                    aria-describedby={`${descriptionId} ${statusId}`}
                    checked={checked}
                    className="peer sr-only"
                    disabled={definition.required}
                    id={toggleId}
                    onChange={(event) => onToggle(definition.type, event.target.checked)}
                    role="switch"
                    type="checkbox"
                  />
                  <span
                    className={`absolute left-1 h-4 w-4 rounded-full bg-white shadow-[0_4px_10px_rgb(15_23_42_/_0.18)] transition-transform ${
                      checked ? 'translate-x-5 bg-[var(--color-primary)]' : ''
                    }`}
                  />
                </span>
                <span className="space-y-1">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                    <FileCheck2 className="h-4 w-4 text-[var(--color-primary)]" />
                    {definition.title}
                    {definition.required ? (
                      <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        Obbligatorio
                      </span>
                    ) : null}
                  </span>
                  <span
                    className="block text-sm leading-6 text-[var(--color-text-muted)]"
                    id={descriptionId}
                  >
                    {definition.description}
                  </span>
                  <span className="block text-xs font-medium text-[var(--color-text-muted)]">
                    Versione policy: {definition.version}
                  </span>
                  <span aria-live="polite" className="sr-only" id={statusId}>
                    {definition.required
                      ? 'Consenso obbligatorio attivo'
                      : checked
                        ? 'Consenso attivo'
                        : 'Consenso disattivato'}
                  </span>
                </span>
              </label>
            );
          })}

          <div className="flex flex-wrap gap-3">
            <Button
              aria-busy={saving}
              className="h-11 rounded-full px-5"
              disabled={saving}
              onClick={() => void saveConsents()}
              type="button"
            >
              {saving ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva consensi'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Toast
        description={toast.description}
        onOpenChange={(open) => setToast((currentValue) => ({ ...currentValue, open }))}
        open={toast.open}
        title={toast.title}
        variant={toast.variant}
      />
    </>
  );
}
