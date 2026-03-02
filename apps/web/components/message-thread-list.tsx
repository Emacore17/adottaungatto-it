import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { formatDate } from '../lib/formatters';
import type { MessageThreadSummary } from '../lib/messages';

const buildCounterpartLabel = (thread: MessageThreadSummary) =>
  thread.viewerRole === 'owner'
    ? `Interessato: ${thread.otherParticipant.email}`
    : `Inserzionista: ${thread.otherParticipant.email}`;

const truncateText = (value: string, maxLength: number) => {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
};

export function MessageThreadList({
  threads,
  currentThreadId = null,
  emptyDescription = 'Quando avvierai una conversazione da un annuncio, la troverai qui.',
  title = 'Conversazioni',
}: {
  threads: MessageThreadSummary[];
  currentThreadId?: string | null;
  emptyDescription?: string;
  title?: string;
}) {
  return (
    <Card className="overflow-hidden border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
      <CardHeader className="border-b border-[var(--color-border)]/80 pb-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline">{threads.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {threads.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_60%,transparent)] px-4 py-5 text-sm leading-6 text-[var(--color-text-muted)]">
            {emptyDescription}
          </div>
        ) : (
          threads.map((thread) => {
            const isActive = currentThreadId === thread.id;
            return (
              <Link
                className={`block rounded-[24px] border px-4 py-4 transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-[1px] hover:border-[var(--color-border-strong)] hover:bg-[color:color-mix(in_srgb,var(--color-surface)_90%,white_10%)] hover:shadow-[0_16px_34px_rgb(66_40_49_/_0.08)] ${
                  isActive
                    ? 'border-[color:color-mix(in_srgb,var(--color-primary)_30%,var(--color-border)_70%)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white_8%)] shadow-[0_12px_24px_rgb(66_40_49_/_0.06)]'
                    : 'border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_58%,transparent)]'
                }`}
                href={`/messaggi/${thread.id}`}
                key={thread.id}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-1 text-sm font-semibold text-[var(--color-text)]">
                        {thread.listingTitle}
                      </p>
                      <p className="line-clamp-1 text-xs text-[var(--color-text-muted)]">
                        {buildCounterpartLabel(thread)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[0.72rem] font-medium text-[var(--color-text-muted)]">
                        {formatDate(thread.latestMessageAt)}
                      </p>
                      {thread.unreadCount > 0 ? (
                        <span className="mt-1 inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--color-primary-foreground)]">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                    {thread.latestMessage
                      ? truncateText(thread.latestMessage.body, 110)
                      : 'Nessun messaggio disponibile.'}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
