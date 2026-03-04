'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Toast } from '@adottaungatto/ui';
import { LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';

type ToastState = {
  open: boolean;
  title: string;
  description?: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
};

export function MessagingPreferencesForm({
  email,
  initialMessageEmailNotificationsEnabled,
}: {
  email: string;
  initialMessageEmailNotificationsEnabled: boolean;
}) {
  const toggleId = useId();
  const toggleDescriptionId = `${toggleId}-description`;
  const toggleStatusId = `${toggleId}-status`;
  const [messageEmailNotificationsEnabled, setMessageEmailNotificationsEnabled] = useState(
    initialMessageEmailNotificationsEnabled,
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'info',
  });

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageEmailNotificationsEnabled,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Impossibile salvare le preferenze.');
      }

      setToast({
        open: true,
        title: 'Preferenze aggiornate',
        description: 'Le notifiche della chat sono state salvate correttamente.',
        variant: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Salvataggio non riuscito',
        description: error instanceof Error ? error.message : 'Impossibile salvare le preferenze.',
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
            Preferenze messaggistica
          </div>
          <CardTitle>Notifiche email sui nuovi messaggi</CardTitle>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Quando un altro utente ti scrive su un annuncio, possiamo avvisarti all&apos;indirizzo{' '}
            <span className="font-medium text-[var(--color-text)]">{email}</span>.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex cursor-pointer items-start gap-4 rounded-[24px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-4 transition-shadow focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--color-surface)]">
            <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[color:color-mix(in_srgb,var(--color-border)_88%,white_12%)] transition-colors">
              <input
                aria-checked={messageEmailNotificationsEnabled}
                aria-describedby={`${toggleDescriptionId} ${toggleStatusId}`}
                checked={messageEmailNotificationsEnabled}
                className="peer sr-only"
                id={toggleId}
                onChange={(event) => setMessageEmailNotificationsEnabled(event.target.checked)}
                role="switch"
                type="checkbox"
              />
              <span
                className={`absolute left-1 h-4 w-4 rounded-full bg-white shadow-[0_4px_10px_rgb(15_23_42_/_0.18)] transition-transform ${
                  messageEmailNotificationsEnabled ? 'translate-x-5 bg-[var(--color-primary)]' : ''
                }`}
              />
            </span>
            <span className="space-y-1">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <Mail className="h-4 w-4 text-[var(--color-primary)]" />
                Avvisami via email per i nuovi messaggi
              </span>
              <span
                className="block text-sm leading-6 text-[var(--color-text-muted)]"
                id={toggleDescriptionId}
              >
                Se disattivi questa opzione, la chat interna continua a funzionare ma non riceverai
                email di notifica.
              </span>
              <span aria-live="polite" className="sr-only" id={toggleStatusId}>
                {messageEmailNotificationsEnabled
                  ? 'Notifiche email attive'
                  : 'Notifiche email disattivate'}
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button
              aria-busy={saving}
              className="h-11 rounded-full px-5"
              disabled={saving}
              onClick={() => void savePreferences()}
              type="button"
            >
              {saving ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva preferenze'
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
