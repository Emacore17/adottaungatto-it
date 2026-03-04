import { Badge, CardContent } from '@adottaungatto/ui';
import { notFound } from 'next/navigation';
import { MessageThreadWorkspace } from '../../../components/message-thread-workspace';
import { WorkspacePageShell } from '../../../components/workspace-page-shell';
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
    <WorkspacePageShell
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
      description="Conversazione privata legata all'annuncio selezionato, con storico persistente e aggiornamento realtime leggero."
      eyebrow="Area riservata"
      title="Conversazione"
    >
      <MessageThreadWorkspace
        initialThreadListPage={threadListPage}
        initialThreadPage={threadPage}
      />
    </WorkspacePageShell>
  );
}
