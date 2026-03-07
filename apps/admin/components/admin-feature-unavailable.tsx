import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import Link from 'next/link';

interface AdminFeatureUnavailableProps {
  title: string;
  description: string;
  routeLabel: string;
}

export function AdminFeatureUnavailable({
  title,
  description,
  routeLabel,
}: AdminFeatureUnavailableProps) {
  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Temporaneamente non disponibile</Badge>
            <Badge variant="outline">{routeLabel}</Badge>
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--color-text-muted)]">
          <p>{description}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/moderazione">
              <Button size="sm" type="button">
                Apri moderazione
              </Button>
            </Link>
            <Link href="/admin">
              <Button size="sm" type="button" variant="outline">
                Torna alla dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
