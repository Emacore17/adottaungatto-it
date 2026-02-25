import { loadWebEnv } from '@adottaungatto/config';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { ListingCreateForm } from '../../../../components/listing-create-form';
import { requireWebSession } from '../../../../lib/auth';

export default async function ListingCreatePage() {
  const env = loadWebEnv();
  const session = await requireWebSession('/account/listings/new');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl px-4 py-8 pb-28 sm:px-6 sm:py-10 sm:pb-10">
      <div className="w-full space-y-6">
        <Card className="border-slate-300/70 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="success">utente autenticato</Badge>
              <Badge variant="outline">M2.6</Badge>
            </div>
            <CardTitle>Crea nuovo annuncio</CardTitle>
            <CardDescription>
              Compila il form completo e invia in moderazione. Stato iniziale: pending review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-slate-600">Utente</p>
            <p className="font-mono text-sm text-slate-900">{session.user.email}</p>
          </CardContent>
        </Card>

        <ListingCreateForm
          apiBaseUrl={env.NEXT_PUBLIC_API_URL}
          defaultContactEmail={session.user.email}
        />
      </div>
    </main>
  );
}
