import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@adottaungatto/ui';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] space-y-5 px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Recupero password</Badge>
            <Badge variant="outline">Placeholder operativo</Badge>
          </div>
          <CardTitle>Resetta la password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Inserisci l email associata al tuo account: riceverai un link di reset.
          </p>
          <label className="space-y-2" htmlFor="forgot-email">
            <span className="text-xs font-medium text-[var(--color-text)]">Email account</span>
            <Input id="forgot-email" placeholder="nome@email.it" type="email" />
          </label>
          <Button className="w-full" type="button">
            Invia link reset (mock)
          </Button>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link className="text-[var(--color-primary)] hover:underline" href="/login">
              Torna al login
            </Link>
            <Link className="text-[var(--color-primary)] hover:underline" href="/contatti">
              Contatta supporto
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
