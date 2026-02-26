import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import Link from 'next/link';
import { requireWebSession } from '../../../../lib/auth';

interface ListingSubmittedPageProps {
  searchParams?: Promise<{
    id?: string | string[];
    uploaded?: string | string[];
    failed?: string | string[];
  }>;
}

const getFirstValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const parseSafeInteger = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export default async function ListingSubmittedPage({ searchParams }: ListingSubmittedPageProps) {
  await requireWebSession('/account/listings/submitted');
  const resolvedSearchParams = await searchParams;
  const listingId = getFirstValue(resolvedSearchParams?.id) ?? '-';
  const uploaded = parseSafeInteger(getFirstValue(resolvedSearchParams?.uploaded));
  const failed = parseSafeInteger(getFirstValue(resolvedSearchParams?.failed));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <Card className="w-full border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="success">invio completato</Badge>
            <Badge variant="outline">M2.6</Badge>
          </div>
          <CardTitle>Annuncio inviato in revisione</CardTitle>
          <CardDescription>
            Il tuo annuncio e stato registrato con stato iniziale <strong>pending review</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <p className="text-sm text-[var(--color-text)]">
              ID annuncio:{' '}
              <span className="font-mono font-medium text-[var(--color-text)]">{listingId}</span>
            </p>
            <p className="text-sm text-[var(--color-text)]">
              Immagini caricate:{' '}
              <span className="font-medium text-[var(--color-text)]">{uploaded}</span>
            </p>
            <p className="text-sm text-[var(--color-text)]">
              Immagini non caricate:{' '}
              <span className="font-medium text-[var(--color-text)]">{failed}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
              href="/account/listings"
            >
              I miei annunci
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
              href="/account/listings/new"
            >
              Crea un altro annuncio
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
              href="/account"
            >
              Torna all&apos;area utente
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
