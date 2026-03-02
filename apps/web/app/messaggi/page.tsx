import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../components/link-button';
import { MessageThreadList } from '../../components/message-thread-list';
import { PageShell } from '../../components/page-shell';
import { requireWebSession } from '../../lib/auth';
import { fetchMessageThreads } from '../../lib/messages';

export default async function MessagesPage() {
  await requireWebSession('/messaggi');
  const threadPage = await fetchMessageThreads({ limit: 30, offset: 0 }).catch(() => ({
    threads: [],
    pagination: {
      limit: 30,
      offset: 0,
      total: 0,
      hasMore: false,
    },
    unreadMessages: 0,
  }));

  const latestThread = threadPage.threads[0] ?? null;

  return (
    <PageShell
      aside={
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{threadPage.threads.length} thread</Badge>
            <Badge variant="outline">{threadPage.unreadMessages} non letti</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text)]">
            La messaggistica e privata, visibile solo ai partecipanti del thread e collegata a un
            annuncio preciso.
          </p>
        </CardContent>
      }
      description="Qui trovi tutte le conversazioni aperte dagli annunci, con storico ordinato e accesso rapido alle chat attive."
      eyebrow="Area riservata"
      title="Messaggi"
    >
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <MessageThreadList threads={threadPage.threads} />

        {latestThread ? (
          <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
            <CardHeader className="space-y-4">
              <div className="space-y-2">
                <CardTitle>Conversazione piu recente</CardTitle>
                <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                  Riprendi subito l’ultima chat aperta oppure entra in inbox per sceglierne una
                  diversa.
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_60%,transparent)] px-4 py-4">
                <p className="text-base font-semibold text-[var(--color-text)]">
                  {latestThread.listingTitle}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {latestThread.viewerRole === 'owner' ? 'Interessato' : 'Inserzionista'}:{' '}
                  {latestThread.otherParticipant.email}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  {latestThread.latestMessage?.body ?? 'Nessun messaggio disponibile.'}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <LinkButton href={`/messaggi/${latestThread.id}`}>Apri conversazione</LinkButton>
              <LinkButton href="/annunci" variant="outline">
                Torna agli annunci
              </LinkButton>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
            <CardHeader className="space-y-4">
              <div className="space-y-2">
                <CardTitle>Nessuna conversazione attiva</CardTitle>
                <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                  Apri un annuncio e invia il primo messaggio per iniziare a usare la chat interna.
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <LinkButton href="/annunci">Esplora gli annunci</LinkButton>
              <LinkButton href="/account/annunci" variant="outline">
                I miei annunci
              </LinkButton>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
