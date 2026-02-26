import { loadWebEnv } from '@adottaungatto/config';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { ListingCreateForm } from '../../components/listing-create-form';
import { requireWebSession } from '../../lib/auth';

export default async function PublishListingPage() {
  const env = loadWebEnv();
  const session = await requireWebSession('/pubblica');

  return (
    <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Wizard pubblicazione</Badge>
            <Badge variant="outline">step 1 di 3</Badge>
          </div>
          <CardTitle>Pubblica annuncio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-[var(--color-text-muted)] sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="font-medium text-[var(--color-text)]">1. Dati base</p>
            <p>Titolo, descrizione, profilo gatto e luogo.</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="font-medium text-[var(--color-text)]">2. Media</p>
            <p>Carica foto ottimizzate e scegli la primaria.</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="font-medium text-[var(--color-text)]">3. Revisione</p>
            <p>Invio in moderazione con conferma e tracking stato.</p>
          </div>
          <p className="sm:col-span-3">
            Accesso come <strong className="text-[var(--color-text)]">{session.user.email}</strong>
          </p>
        </CardContent>
      </Card>

      <ListingCreateForm
        apiBaseUrl={env.NEXT_PUBLIC_API_URL}
        defaultContactEmail={session.user.email}
      />
    </main>
  );
}
