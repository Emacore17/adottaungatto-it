import { Badge, CardContent } from '@adottaungatto/ui';
import { notFound } from 'next/navigation';
import { MessageThreadList } from '../../../components/message-thread-list';
import { MessageThreadView } from '../../../components/message-thread-view';
import { PageShell } from '../../../components/page-shell';
import { requireWebSession } from '../../../lib/auth';
import { fetchMessageThread, fetchMessageThreads } from '../../../lib/messages';

interface MessageThreadPageProps {
  params: Promise<{
    threadId: string;
  }>;
}

export default async function MessageThreadPage({ params }: MessageThreadPageProps) {
  const { threadId } = await params;
  await requireWebSession(`/messaggi/${threadId}`);

  const [threadListPage, threadPage] = await Promise.all([
    fetchMessageThreads({ limit: 30, offset: 0 }).catch(() => ({
      threads: [],
      pagination: {
        limit: 30,
        offset: 0,
        total: 0,
        hasMore: false,
      },
      unreadMessages: 0,
    })),
    fetchMessageThread(threadId, { limit: 40 }).catch(() => null),
  ]);

  if (!threadPage) {
    notFound();
  }

  return (
    <PageShell
      aside={
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{threadListPage.threads.length} thread</Badge>
            <Badge variant="outline">{threadListPage.unreadMessages} non letti</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text)]">
            I messaggi sono disponibili solo ai due partecipanti coinvolti nella conversazione.
          </p>
        </CardContent>
      }
      description="Conversazione privata legata all’annuncio selezionato, con storico persistente e aggiornamento leggero lato client."
      eyebrow="Area riservata"
      title="Conversazione"
    >
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <MessageThreadList
          currentThreadId={threadPage.thread.id}
          threads={threadListPage.threads}
        />
        <MessageThreadView initialThreadPage={threadPage} />
      </div>
    </PageShell>
  );
}
