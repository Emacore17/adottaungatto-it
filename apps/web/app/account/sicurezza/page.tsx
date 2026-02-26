import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@adottaungatto/ui';
import { requireWebSession } from '../../../lib/auth';

export default async function AccountSecurityPage() {
  await requireWebSession('/account/sicurezza');

  return (
    <main className="mx-auto w-full max-w-[900px] space-y-5 px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Sicurezza account</Badge>
            <Badge variant="outline">2FA placeholder</Badge>
          </div>
          <CardTitle>Password e sessioni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2" htmlFor="security-current-password">
              <span className="text-xs font-medium text-[var(--color-text)]">Password attuale</span>
              <Input id="security-current-password" type="password" />
            </label>
            <label className="space-y-2" htmlFor="security-new-password">
              <span className="text-xs font-medium text-[var(--color-text)]">Nuova password</span>
              <Input id="security-new-password" type="password" />
            </label>
            <label className="space-y-2" htmlFor="security-confirm-password">
              <span className="text-xs font-medium text-[var(--color-text)]">
                Conferma password
              </span>
              <Input id="security-confirm-password" type="password" />
            </label>
          </div>
          <Button type="button">Aggiorna password (mock)</Button>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
            <p className="font-medium text-[var(--color-text)]">Autenticazione a due fattori</p>
            <p className="mt-1">Placeholder UI pronta: in attesa endpoint conferma OTP.</p>
            <Button className="mt-3" size="sm" type="button" variant="outline">
              Abilita 2FA (coming soon)
            </Button>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
            <p className="font-medium text-[var(--color-text)]">Sessioni attive</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--color-text-muted)]">
              <li>Chrome · Windows · adesso</li>
              <li>Safari · iPhone · ieri 21:10</li>
            </ul>
            <Button className="mt-3" size="sm" type="button" variant="outline">
              Termina tutte le sessioni (mock)
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
