'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { LoaderCircle, LocateFixed, MapPin, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicListingSummary } from '../lib/listings';
import { LinkButton } from './link-button';
import { PublicListingsGrid } from './public-listings-grid';

type NearbyStatus = 'checking' | 'idle' | 'locating' | 'loading' | 'ready' | 'denied' | 'error';

type Coordinates = {
  lat: number;
  lon: number;
};

const nearbyListingsLimit = 6;
const geolocationOptions: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 5 * 60 * 1000,
  timeout: 8000,
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const isPublicListingSummary = (value: unknown): value is PublicListingSummary => {
  const record = asRecord(value);
  return typeof record.id === 'string' && typeof record.title === 'string';
};

const buildNearbyHref = (coordinates: Coordinates | null) => {
  if (!coordinates) {
    return '/annunci';
  }

  const query = new URLSearchParams({
    sort: 'relevance',
    referenceLat: String(coordinates.lat),
    referenceLon: String(coordinates.lon),
  });
  return `/annunci?${query.toString()}`;
};

interface NearbyStatePanelProps {
  actionHref: string;
  actionLabel: string;
  description: string;
  loading?: boolean;
  onPrimaryAction?: () => void;
  primaryActionIcon?: 'locate' | 'retry' | 'pin';
  primaryActionLabel?: string;
  title: string;
}

function NearbyStatePanel({
  actionHref,
  actionLabel,
  description,
  loading = false,
  onPrimaryAction,
  primaryActionIcon = 'locate',
  primaryActionLabel,
  title,
}: NearbyStatePanelProps) {
  const Icon =
    primaryActionIcon === 'retry' ? RefreshCcw : primaryActionIcon === 'pin' ? MapPin : LocateFixed;

  return (
    <Card className="overflow-hidden rounded-[30px] border-[color:color-mix(in_srgb,var(--color-border)_78%,white_22%)] bg-[color:color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] shadow-[0_18px_52px_rgb(66_40_49_/_0.08)]">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[color:color-mix(in_srgb,var(--color-border)_76%,white_24%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_72%,white_28%)] text-[var(--color-primary)] shadow-[0_10px_24px_rgb(66_40_49_/_0.06)]">
            {loading ? (
              <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <LocateFixed aria-hidden="true" className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-[1.08rem]">{title}</CardTitle>
            <CardDescription className="max-w-2xl text-[0.95rem] leading-6">
              {description}
            </CardDescription>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[15rem] sm:items-end">
          {onPrimaryAction && primaryActionLabel ? (
            <Button
              className="w-full gap-2 sm:w-auto"
              onClick={onPrimaryAction}
              variant="secondary"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {primaryActionLabel}
            </Button>
          ) : null}
          <LinkButton className="w-full sm:w-auto" href={actionHref} variant="outline">
            {actionLabel}
          </LinkButton>
        </div>
      </CardContent>
    </Card>
  );
}

export function NearbyListingsSection() {
  const isMountedRef = useRef(true);
  const [status, setStatus] = useState<NearbyStatus>('checking');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [listings, setListings] = useState<PublicListingSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNearbyListings = useCallback(async (nextCoordinates: Coordinates) => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const query = new URLSearchParams({
        limit: String(nearbyListingsLimit),
        sort: 'relevance',
        referenceLat: String(nextCoordinates.lat),
        referenceLon: String(nextCoordinates.lon),
      });
      const response = await fetch(`/api/listings/search?${query.toString()}`, {
        cache: 'no-store',
      });
      const payload = asRecord(await response.json());

      if (!response.ok) {
        throw new Error(
          typeof payload.message === 'string'
            ? payload.message
            : 'Impossibile caricare gli annunci vicini.',
        );
      }

      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!isMountedRef.current) {
        return;
      }

      setListings(
        items.filter((item): item is PublicListingSummary => isPublicListingSummary(item)),
      );
      setStatus('ready');
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : 'Impossibile caricare gli annunci vicini in questo momento.',
      );
      setStatus('error');
    }
  }, []);

  const requestNearbyListings = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMessage('La geolocalizzazione non e supportata da questo browser.');
      setStatus('error');
      return;
    }

    setStatus('locating');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) {
          return;
        }

        const nextCoordinates = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lon: Number(position.coords.longitude.toFixed(6)),
        };

        setCoordinates(nextCoordinates);
        void fetchNearbyListings(nextCoordinates);
      },
      (error) => {
        if (!isMountedRef.current) {
          return;
        }

        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage(
            'Consenti la posizione nel browser per vedere gli annunci ordinati per vicinanza.',
          );
          setStatus('denied');
          return;
        }

        setErrorMessage('Non sono riuscito a leggere la tua posizione. Riprova tra poco.');
        setStatus('error');
      },
      geolocationOptions,
    );
  }, [fetchNearbyListings]);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }

    if (!navigator.geolocation) {
      setErrorMessage('La geolocalizzazione non e supportata da questo browser.');
      setStatus('error');
      return;
    }

    if (!navigator.permissions?.query) {
      setStatus('idle');
      return;
    }

    let cancelled = false;

    void navigator.permissions
      .query({ name: 'geolocation' })
      .then((permissionStatus) => {
        if (cancelled || !isMountedRef.current) {
          return;
        }

        if (permissionStatus.state === 'granted') {
          requestNearbyListings();
          return;
        }

        if (permissionStatus.state === 'denied') {
          setErrorMessage(
            'Consenti la posizione nel browser per vedere gli annunci ordinati per vicinanza.',
          );
          setStatus('denied');
          return;
        }

        setStatus('idle');
      })
      .catch(() => {
        if (!cancelled && isMountedRef.current) {
          setStatus('idle');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestNearbyListings]);

  const allNearbyHref = buildNearbyHref(coordinates);
  const readyListingsCountLabel =
    listings.length > 0
      ? `${new Intl.NumberFormat('it-IT').format(listings.length)} annunci ordinati per distanza`
      : 'Posizione attiva';
  const sectionDescription =
    status === 'ready'
      ? 'Annunci pubblici ordinati per distanza dalla tua posizione attuale.'
      : 'Usa la tua posizione per vedere prima i gatti piu vicini alla tua zona.';

  return (
    <section className="space-y-6" id="annunci-vicini">
      <div className="flex flex-col gap-4 rounded-[30px] border border-[color:color-mix(in_srgb,var(--color-border)_82%,white_18%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_82%,white_18%)] px-5 py-5 shadow-[0_18px_58px_rgb(66_40_49_/_0.08)] sm:px-7 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit" variant="outline">
              Vicino a te
            </Badge>
            {coordinates ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--color-border)_76%,white_24%)] bg-[color:color-mix(in_srgb,var(--color-surface-elevated)_72%,transparent)] px-3 py-1 text-[12px] font-semibold text-[var(--color-text-muted)]">
                <LocateFixed
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-[var(--color-primary)]"
                />
                {readyListingsCountLabel}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Annunci piu vicini a te</h2>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">{sectionDescription}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {coordinates && status !== 'loading' && status !== 'locating' ? (
            <Button className="gap-2" onClick={requestNearbyListings} size="sm" variant="secondary">
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />
              Aggiorna posizione
            </Button>
          ) : null}
          <LinkButton className="w-full sm:w-auto" href={allNearbyHref} variant="outline">
            {coordinates ? 'Vedi tutti vicino a te' : 'Vedi tutti gli annunci'}
          </LinkButton>
        </div>
      </div>

      {status === 'ready' && listings.length > 0 ? (
        <PublicListingsGrid
          emptyDescription="Nessun annuncio pubblico disponibile al momento."
          listings={listings}
          showDistance
        />
      ) : null}

      {status === 'ready' && listings.length === 0 ? (
        <NearbyStatePanel
          actionHref={allNearbyHref}
          actionLabel="Apri la pagina annunci"
          description="Ho ordinato i risultati in base alla tua posizione, ma al momento questa sezione non ha annunci da mostrarti."
          onPrimaryAction={requestNearbyListings}
          primaryActionIcon="retry"
          primaryActionLabel="Aggiorna posizione"
          title="Nessun annuncio disponibile vicino a te."
        />
      ) : null}

      {status === 'checking' || status === 'locating' || status === 'loading' ? (
        <NearbyStatePanel
          actionHref="/annunci"
          actionLabel="Apri tutti gli annunci"
          description="Appena ho la posizione, ordino gli annunci pubblici in base alla distanza e ti mostro prima i piu vicini."
          loading
          title={
            status === 'locating'
              ? 'Sto rilevando la tua posizione...'
              : 'Sto preparando gli annunci piu vicini...'
          }
        />
      ) : null}

      {status === 'idle' ? (
        <NearbyStatePanel
          actionHref="/annunci"
          actionLabel="Apri tutti gli annunci"
          description="Attiva la posizione per vedere in home gli annunci ordinati per vicinanza e poi aprire la pagina completa con lo stesso contesto."
          onPrimaryAction={requestNearbyListings}
          primaryActionIcon="locate"
          primaryActionLabel="Usa la mia posizione"
          title="Mostra prima i gatti vicino a te."
        />
      ) : null}

      {status === 'denied' || status === 'error' ? (
        <NearbyStatePanel
          actionHref="/annunci"
          actionLabel="Apri tutti gli annunci"
          description={
            errorMessage ?? 'Riprova oppure apri il catalogo completo degli annunci disponibili.'
          }
          onPrimaryAction={requestNearbyListings}
          primaryActionIcon={status === 'denied' ? 'pin' : 'retry'}
          primaryActionLabel={
            status === 'denied' ? 'Riprova con la posizione' : 'Ricarica risultati vicini'
          }
          title={
            status === 'denied'
              ? 'Posizione non disponibile.'
              : 'Impossibile mostrare gli annunci vicini.'
          }
        />
      ) : null}
    </section>
  );
}
