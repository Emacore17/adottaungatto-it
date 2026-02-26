import { Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';

export default function AdminServerErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[760px] items-center px-4 sm:px-6 lg:px-8">
      <Card className="w-full border-rose-200 bg-rose-50/90">
        <CardHeader>
          <CardTitle>500 admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-rose-900">
          <p>Errore temporaneo nel pannello amministrativo.</p>
          <Link href="/admin">
            <Button>Torna alla dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
