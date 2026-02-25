import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPublicListingById } from '../../../lib/listings';

interface PublicListingDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

const formatDate = (rawDate: string | null): string => {
  if (!rawDate) {
    return '-';
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

const formatPrice = (priceAmount: string | null, currency: string): string => {
  if (!priceAmount) {
    return 'Prezzo non indicato';
  }

  const numericPrice = Number.parseFloat(priceAmount);
  if (Number.isNaN(numericPrice)) {
    return `${priceAmount} ${currency}`;
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericPrice);
};

export default async function PublicListingDetailPage({ params }: PublicListingDetailPageProps) {
  const { listingId } = await params;
  const listing = await fetchPublicListingById(listingId);

  if (!listing) {
    notFound();
  }

  const sortedMedia = [...listing.media].sort((left, right) => left.position - right.position);
  const heroMedia = sortedMedia.find((media) => media.isPrimary) ?? sortedMedia[0] ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl px-4 py-8 pb-28 sm:px-6 sm:py-10 sm:pb-10">
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Link className="font-medium text-slate-900 hover:underline" href="/annunci">
            Annunci
          </Link>
          <span>/</span>
          <span>{listing.title}</span>
        </div>

        <Card className="border-slate-300/70 bg-white/95">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Pubblicato</Badge>
              <Badge variant="secondary">{listing.listingType}</Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl">{listing.title}</CardTitle>
            <CardDescription>
              {listing.comuneName} ({listing.provinceSigla}) - {listing.provinceName},{' '}
              {listing.regionName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {heroMedia ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <Image
                    alt={`Foto principale annuncio ${listing.title}`}
                    className="aspect-[4/3] w-full object-cover sm:aspect-[16/10] lg:aspect-[16/9]"
                    height={heroMedia.height ?? 960}
                    priority
                    sizes="(max-width: 1024px) 100vw, 960px"
                    src={heroMedia.objectUrl}
                    width={heroMedia.width ?? 1280}
                  />
                </div>
                {sortedMedia.length > 1 ? (
                  <div className="flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
                    {sortedMedia.map((media) => (
                      <Image
                        alt={`Immagine annuncio ${listing.title} posizione ${media.position}`}
                        className="h-20 w-28 shrink-0 snap-start rounded-lg object-cover sm:h-24 sm:w-full"
                        height={media.height ?? 240}
                        key={media.id}
                        loading="lazy"
                        sizes="(max-width: 640px) 112px, (max-width: 1024px) 33vw, 25vw"
                        src={media.objectUrl}
                        width={media.width ?? 320}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                Nessuna foto disponibile
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Profilo annuncio
                </p>
                <p className="text-sm text-slate-700">Eta: {listing.ageText || '-'}</p>
                <p className="text-sm text-slate-700">Sesso: {listing.sex || '-'}</p>
                <p className="text-sm text-slate-700">Razza: {listing.breed || '-'}</p>
                <p className="text-sm text-slate-700">
                  Prezzo: {formatPrice(listing.priceAmount, listing.currency)}
                </p>
                <p className="text-sm text-slate-700">
                  Pubblicato il: {formatDate(listing.publishedAt)}
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contatto inserzionista
                </p>
                <p className="text-sm text-slate-700">
                  {listing.contactName
                    ? `Referente: ${listing.contactName}`
                    : 'Referente non indicato'}
                </p>
                <p className="text-sm text-slate-700">
                  {listing.contactPhone
                    ? `Telefono: ${listing.contactPhone}`
                    : 'Telefono non disponibile'}
                </p>
                <p className="text-sm text-slate-700">
                  {listing.contactEmail
                    ? `Email: ${listing.contactEmail}`
                    : 'Email non disponibile'}
                </p>
                <div className="pt-2">
                  <Button className="hidden w-full md:inline-flex" disabled>
                    Contatta inserzionista (prossimo step)
                  </Button>
                  <p className="text-xs text-slate-500 md:hidden">
                    Usa il pulsante fisso in basso per avviare il contatto.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm whitespace-pre-line text-slate-800">{listing.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto w-full max-w-5xl">
          <Button className="w-full" disabled>
            Contatta inserzionista (prossimo step)
          </Button>
        </div>
      </div>
    </main>
  );
}
