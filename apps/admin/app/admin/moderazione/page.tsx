import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { ModerationQueueClient } from '../../moderation/moderation-queue-client';
import { fetchModerationQueue } from '../../../lib/moderation';
import type { ModerationQueueItem } from '../../../lib/moderation-types';

export default async function AdminModerationPage() {
  let source: 'api' | 'unavailable' = 'api';
  let items: ModerationQueueItem[] = [];

  try {
    const queue = await fetchModerationQueue(50);
    items = queue.items;
  } catch {
    source = 'unavailable';
  }

  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={source === 'api' ? 'success' : 'warning'}>
              Queue source: {source === 'api' ? 'API' : 'NON DISPONIBILE'}
            </Badge>
            <Badge variant="outline">coda moderazione</Badge>
          </div>
          <CardTitle>Moderazione annunci</CardTitle>
        </CardHeader>
      </Card>

      {source === 'api' ? (
        <ModerationQueueClient items={items} />
      ) : (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="space-y-4 py-6 text-sm text-[var(--color-text-muted)]">
            <p>
              La coda moderazione mostra solo dati reali API. In questo momento non e stato
              possibile caricare la queue.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin">
                <Button size="sm" type="button">
                  Torna alla dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
