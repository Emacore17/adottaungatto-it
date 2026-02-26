import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { mockAuditLog } from '../../../mocks/admin-data';

const formatDate = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(rawDate),
  );

export default function AuditLogPage() {
  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Audit mock</Badge>
            <Badge variant="outline">/admin/audit-log</Badge>
          </div>
          <CardTitle>Audit log moderazione</CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {mockAuditLog.map((record) => (
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]" key={record.id}>
            <CardContent className="space-y-2 py-4 text-sm text-[var(--color-text-muted)]">
              <p className="font-semibold text-[var(--color-text)]">
                {record.actor} Â· {record.action.toUpperCase()} listing {record.targetId}
              </p>
              <p>{record.reason}</p>
              <p className="text-xs">{formatDate(record.createdAt)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
