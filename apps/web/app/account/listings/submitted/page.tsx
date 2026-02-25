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
      <Card className="w-full border-slate-300/70 bg-white/95">
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
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-700">
              ID annuncio: <span className="font-mono font-medium text-slate-900">{listingId}</span>
            </p>
            <p className="text-sm text-slate-700">
              Immagini caricate: <span className="font-medium text-slate-900">{uploaded}</span>
            </p>
            <p className="text-sm text-slate-700">
              Immagini non caricate: <span className="font-medium text-slate-900">{failed}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
              href="/account/listings"
            >
              I miei annunci
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              href="/account/listings/new"
            >
              Crea un altro annuncio
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
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
