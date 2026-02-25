import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { requireWebSession } from '../../lib/auth';

export default async function AccountPage() {
  const session = await requireWebSession('/account');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="success">session active</Badge>
            <Badge variant="outline">utente</Badge>
          </div>
          <CardTitle>Area utente</CardTitle>
          <CardDescription>Route privata protetta da sessione Keycloak.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">User ID</p>
            <p className="font-mono text-sm">{session.user.id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Email</p>
            <p className="font-mono text-sm">{session.user.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Ruoli</p>
            <p className="font-mono text-sm">{session.user.roles.join(', ')}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="secondary">
              Logout
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
