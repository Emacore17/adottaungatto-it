import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@adottaungatto/ui';
import { requireWebSession } from '../../../lib/auth';

export default async function AccountSettingsPage() {
  const session = await requireWebSession('/account/impostazioni');

  return (
    <main className="mx-auto w-full max-w-[900px] space-y-5 px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Impostazioni account</Badge>
            <Badge variant="outline">UI pronta · backend progressivo</Badge>
          </div>
          <CardTitle>Dati profilo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2" htmlFor="settings-display-name">
              <span className="text-xs font-medium text-[var(--color-text)]">
                Nome visualizzato
              </span>
              <Input defaultValue={session.user.email.split('@')[0]} id="settings-display-name" />
            </label>
            <label className="space-y-2" htmlFor="settings-email">
              <span className="text-xs font-medium text-[var(--color-text)]">Email</span>
              <Input defaultValue={session.user.email} id="settings-email" type="email" />
            </label>
            <label className="space-y-2" htmlFor="settings-phone">
              <span className="text-xs font-medium text-[var(--color-text)]">Telefono</span>
              <Input defaultValue="+39 333 0000000" id="settings-phone" />
            </label>
            <label className="space-y-2" htmlFor="settings-city">
              <span className="text-xs font-medium text-[var(--color-text)]">Citta</span>
              <Input defaultValue="Roma" id="settings-city" />
            </label>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-sm font-medium text-[var(--color-text)]">Preferenze notifiche</p>
            <div className="mt-2 space-y-2 text-sm text-[var(--color-text-muted)]">
              <label className="flex items-center gap-2">
                <input defaultChecked type="checkbox" />
                <span>Ricevi notifiche messaggi</span>
              </label>
              <label className="flex items-center gap-2">
                <input defaultChecked type="checkbox" />
                <span>Aggiornamenti stato annuncio</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>Newsletter novita piattaforma</span>
              </label>
            </div>
          </div>

          <Button type="button">Salva modifiche (mock)</Button>
        </CardContent>
      </Card>
    </main>
  );
}
