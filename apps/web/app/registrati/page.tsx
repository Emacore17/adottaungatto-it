import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@adottaungatto/ui';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-[860px] space-y-5 px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Registrazione premium</Badge>
            <Badge variant="outline">Mock onboarding UI</Badge>
          </div>
          <CardTitle>Crea il tuo account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2" htmlFor="register-first-name">
              <span className="text-xs font-medium text-[var(--color-text)]">Nome</span>
              <Input id="register-first-name" placeholder="Mario" />
            </label>
            <label className="space-y-2" htmlFor="register-last-name">
              <span className="text-xs font-medium text-[var(--color-text)]">Cognome</span>
              <Input id="register-last-name" placeholder="Rossi" />
            </label>
            <label className="space-y-2 sm:col-span-2" htmlFor="register-email">
              <span className="text-xs font-medium text-[var(--color-text)]">Email</span>
              <Input id="register-email" placeholder="mario@email.it" type="email" />
            </label>
            <label className="space-y-2" htmlFor="register-password">
              <span className="text-xs font-medium text-[var(--color-text)]">Password</span>
              <Input id="register-password" type="password" />
            </label>
            <label className="space-y-2" htmlFor="register-password-confirm">
              <span className="text-xs font-medium text-[var(--color-text)]">
                Conferma password
              </span>
              <Input id="register-password-confirm" type="password" />
            </label>
          </div>
          <label className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
            <input className="mt-0.5" type="checkbox" />
            <span>Accetto termini, privacy e policy anti-truffa.</span>
          </label>
          <Button className="w-full" type="button">
            Registrati (mock)
          </Button>
          <p className="text-xs text-[var(--color-text-muted)]">
            Flusso backend onboarding in arrivo. Intanto UI completa e navigabile.
          </p>
          <Link className="text-xs text-[var(--color-primary)] hover:underline" href="/login">
            Hai gia un account? Vai al login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
