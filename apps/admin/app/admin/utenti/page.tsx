import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { mockUsers } from '../../../mocks/admin-data';

export default function AdminUsersPage() {
  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Mock fallback</Badge>
            <Badge variant="outline">/admin/utenti</Badge>
          </div>
          <CardTitle>Gestione utenti</CardTitle>
        </CardHeader>
      </Card>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardContent className="overflow-x-auto pt-5">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-3 py-2">User ID</th>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Ruolo</th>
                <th className="px-3 py-2">Verificato</th>
                <th className="px-3 py-2">Annunci</th>
                <th className="px-3 py-2">Segnalazioni</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
                <tr className="border-t border-[var(--color-border)]" key={user.id}>
                  <td className="px-3 py-2 font-mono text-xs">{user.id}</td>
                  <td className="px-3 py-2">{user.username}</td>
                  <td className="px-3 py-2">{user.role}</td>
                  <td className="px-3 py-2">{user.verified ? 'Si' : 'No'}</td>
                  <td className="px-3 py-2">{user.listingsCount}</td>
                  <td className="px-3 py-2">{user.reports}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
