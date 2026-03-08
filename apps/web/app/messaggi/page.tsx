import { Badge, CardContent } from '@adottaungatto/ui';
import type { Metadata } from 'next';
import { MessagesInboxOverview } from '../../components/messages-inbox-overview';
import { WorkspacePageShell } from '../../components/workspace-page-shell';
import { requireWebSession } from '../../lib/auth';
import { fetchMessageThreads } from '../../lib/messages';

export const metadata: Metadata = {
  title: 'Messaggi',
};

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

  return (
    <WorkspacePageShell
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
      <MessagesInboxOverview initialThreadPage={threadPage} />
    </WorkspacePageShell>
  );
}
