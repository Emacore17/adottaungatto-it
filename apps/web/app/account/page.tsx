import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { requireWebSession } from '../../lib/auth';
import { fetchMyListings } from '../../lib/listings';

export default async function AccountPage() {
  const session = await requireWebSession('/account');
  const listings = await fetchMyListings().catch(() => []);

  return (
    <main className="mx-auto w-full max-w-[1180px] space-y-5 px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Sessione attiva</Badge>
            <Badge variant="outline">{session.user.roles.join(', ')}</Badge>
          </div>
          <CardTitle>Dashboard account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Email</p>
            <p className="text-sm font-semibold text-[var(--color-text)]">{session.user.email}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Annunci creati</p>
            <p className="text-xl font-semibold text-[var(--color-text)]">{listings.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Messaggi</p>
            <p className="text-xl font-semibold text-[var(--color-text)]">3 thread attivi (mock)</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/pubblica">
          <Card className="h-full border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardContent className="space-y-2 pt-6">
              <p className="text-sm font-semibold text-[var(--color-text)]">Pubblica annuncio</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Wizard completo con upload immagini e invio moderazione.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/annunci">
          <Card className="h-full border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardContent className="space-y-2 pt-6">
              <p className="text-sm font-semibold text-[var(--color-text)]">I miei annunci</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Stato pubblicazione e accesso rapido alla modifica.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/impostazioni">
          <Card className="h-full border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardContent className="space-y-2 pt-6">
              <p className="text-sm font-semibold text-[var(--color-text)]">Impostazioni</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Profilo pubblico, preferenze notifiche, privacy.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/sicurezza">
          <Card className="h-full border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardContent className="space-y-2 pt-6">
              <p className="text-sm font-semibold text-[var(--color-text)]">Sicurezza</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Password, sessioni e placeholder 2FA.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="secondary">
          Logout
        </Button>
      </form>
    </main>
  );
}
