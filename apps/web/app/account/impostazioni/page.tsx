import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { ConsentsSettingsForm } from '../../../components/consents-settings-form';
import { LinkButton } from '../../../components/link-button';
import { MessagingPreferencesForm } from '../../../components/messaging-preferences-form';
import { ProfileSettingsForm } from '../../../components/profile-settings-form';
import { WorkspacePageShell } from '../../../components/workspace-page-shell';
import { requireWebSession } from '../../../lib/auth';
import { fetchMyConsents, fetchMyProfile } from '../../../lib/users';

export default async function AccountSettingsPage() {
  const session = await requireWebSession('/account/impostazioni');
  const messageEmailNotificationsEnabled =
    session.user.preferences?.messageEmailNotificationsEnabled ?? true;
  const [profile, consents] = await Promise.all([fetchMyProfile(), fetchMyConsents()]);

  return (
    <WorkspacePageShell
      aside={
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Account</Badge>
            <Badge variant="outline">Profilo, messaggistica e consensi</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text)]">
            Gestisci dati personali, avatar profilo, notifiche email e policy privacy da un unica
            schermata.
          </p>
        </CardContent>
      }
      description="Aggiorna profilo pubblico, preferenze chat e consensi versione policy mantenendo il workspace ordinato e coerente."
      eyebrow="Area riservata"
      title="Impostazioni account"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <ProfileSettingsForm email={session.user.email} initialProfile={profile} />
          <ConsentsSettingsForm initialConsents={consents} />
          <MessagingPreferencesForm
            email={session.user.email}
            initialMessageEmailNotificationsEnabled={messageEmailNotificationsEnabled}
          />
        </div>

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
    </WorkspacePageShell>
  );
}
