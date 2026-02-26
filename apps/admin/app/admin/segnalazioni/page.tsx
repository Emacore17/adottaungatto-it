import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { mockReports } from '../../../mocks/admin-data';

const formatDate = (rawDate: string) =>
  new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(rawDate),
  );

export default function AdminReportsPage() {
  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Mock fallback</Badge>
            <Badge variant="outline">/admin/segnalazioni</Badge>
          </div>
          <CardTitle>Segnalazioni utenti</CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {mockReports.map((report) => (
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]" key={report.id}>
            <CardContent className="space-y-2 py-4 text-sm text-[var(--color-text-muted)]">
              <p className="font-semibold text-[var(--color-text)]">
                Segnalazione #{report.id} Â· listing {report.listingId}
              </p>
              <p>Motivo: {report.reason}</p>
              <p>
                Stato: <strong className="text-[var(--color-text)]">{report.status}</strong> Â·{' '}
                {formatDate(report.createdAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
