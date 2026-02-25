import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { requireAdminRole } from '../../lib/auth';
import { fetchModerationQueue } from '../../lib/moderation';
import type { ModerationQueueItem } from '../../lib/moderation-types';
import { ModerationQueueClient } from './moderation-queue-client';

export default async function ModerationPage() {
  const session = await requireAdminRole('/moderation');
  let queueItems: ModerationQueueItem[] = [];
  let queueLimit = 20;
  let queueError: string | null = null;

  try {
    const queueResponse = await fetchModerationQueue(50);
    queueItems = queueResponse.items;
    queueLimit = queueResponse.limit;
  } catch {
    queueError =
      'Impossibile caricare la coda moderazione. Ricarica la pagina o riprova tra pochi istanti.';
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Card className="border-slate-300/70 bg-white/95">
        <CardHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="success">M2.9</Badge>
            <Badge variant="outline">admin protected</Badge>
            <Badge variant="outline">queue limit {queueLimit}</Badge>
          </div>
          <CardTitle>Coda moderazione</CardTitle>
          <CardDescription>
            Revisione annunci con motivazione obbligatoria e feedback immediato dell&apos;azione.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                User ID
              </p>
              <p className="font-mono text-xs text-slate-800">{session.user.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="font-mono text-xs text-slate-800">{session.user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ruoli</p>
              <p className="font-mono text-xs text-slate-800">{session.user.roles.join(', ')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pending
              </p>
              <p className="text-sm font-semibold text-slate-900">{queueItems.length}</p>
            </div>
          </div>

          {queueError ? (
            <div className="space-y-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <p>{queueError}</p>
              <a
                className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400 bg-white px-3 text-xs font-medium text-rose-800 transition-colors hover:bg-rose-100"
                href="/moderation"
              >
                Riprova ora
              </a>
            </div>
          ) : null}

          <ModerationQueueClient items={queueItems} />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <form action="/api/auth/logout" method="post">
              <Button className="w-full sm:w-auto" type="submit" variant="secondary">
                Logout
              </Button>
            </form>
            <a
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto"
              href="/analytics"
            >
              Apri KPI analytics
            </a>
            <a
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto"
              href="/moderation"
            >
              Aggiorna coda
            </a>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
