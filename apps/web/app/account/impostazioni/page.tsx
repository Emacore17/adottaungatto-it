import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../../components/link-button';
import { MessagingPreferencesForm } from '../../../components/messaging-preferences-form';
import { PageShell } from '../../../components/page-shell';
import { requireWebSession } from '../../../lib/auth';

export default async function AccountSettingsPage() {
  const session = await requireWebSession('/account/impostazioni');
  const messageEmailNotificationsEnabled =
    session.user.preferences?.messageEmailNotificationsEnabled ?? true;

  return (
    <PageShell
      aside={
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Account</Badge>
            <Badge variant="outline">Messaggistica</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text)]">
            Gestisci le preferenze realmente supportate dal backend, senza impostazioni decorative o
            scollegate dal prodotto.
          </p>
        </CardContent>
      }
      description="Impostazioni essenziali del tuo account, limitate alle preferenze di messaggistica gia operative."
      eyebrow="Area riservata"
      title="Impostazioni account"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <MessagingPreferencesForm
          email={session.user.email}
          initialMessageEmailNotificationsEnabled={messageEmailNotificationsEnabled}
        />

        <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
          <CardHeader className="space-y-3">
            <CardTitle>Accesso rapido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <LinkButton href="/messaggi">Apri messaggi</LinkButton>
            <LinkButton href="/account" variant="outline">
              Torna alla dashboard
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
