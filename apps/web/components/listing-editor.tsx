'use client';

import { Button, Card, CardContent, CardHeader, Input, Toast, cn } from '@adottaungatto/ui';
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  MapPinned,
  Star,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ListingBreedOption, MyListing, MyListingMedia } from '../lib/listings';

type AgeUnit = 'months' | 'years';

type RegionOption = {
  id: string;
  istatCode: string;
  name: string;
};

type ProvinceOption = {
  id: string;
  regionId: string;
  istatCode: string;
  name: string;
  sigla: string;
};

type ComuneOption = {
  id: string;
  regionId: string;
  provinceId: string;
  istatCode: string;
  name: string;
  codeCatastale: string | null;
};

type QueuedMediaItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type ToastState = {
  open: boolean;
  title: string;
  description?: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
};

type ListingFormState = {
  title: string;
  description: string;
  listingType: string;
  priceAmount: string;
  currency: string;
  ageValue: string;
  ageUnit: AgeUnit;
  sex: string;
  breed: string;
  regionId: string;
  provinceId: string;
  comuneId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

type ListingApiPayload = {
  listing: MyListing;
};

type ListingMediaApiPayload = {
  media: MyListingMedia[] | MyListingMedia;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

const listingTypeOptions = [
  { value: 'adozione', label: 'Adozione' },
  { value: 'stallo', label: 'Stallo' },
  { value: 'segnalazione', label: 'Segnalazione' },
] as const;

const sexOptions = [
  { value: 'maschio', label: 'Maschio' },
  { value: 'femmina', label: 'Femmina' },
] as const;

const fieldClassName =
  'h-11 rounded-[18px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white_8%)] px-4 text-sm text-[var(--color-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]';

const textareaClassName = cn(fieldClassName, 'min-h-[150px] h-auto resize-y py-3 leading-6');

const parseAgeFromMonths = (ageMonths: number | null | undefined) => {
  if (typeof ageMonths !== 'number' || !Number.isFinite(ageMonths) || ageMonths < 0) {
    return {
      ageValue: '',
      ageUnit: 'months' as AgeUnit,
    };
  }

  if (ageMonths > 0 && ageMonths % 12 === 0) {
    return {
      ageValue: String(ageMonths / 12),
      ageUnit: 'years' as AgeUnit,
    };
  }

  return {
    ageValue: String(ageMonths),
    ageUnit: 'months' as AgeUnit,
  };
};

const parseAgeFromText = (value: string | null | undefined) => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) {
    return {
      ageValue: '',
      ageUnit: 'months' as AgeUnit,
    };
  }

  const yearsMatch = normalized.match(/(\d+)\s*(anno|anni)\b/);
  if (yearsMatch?.[1]) {
    return {
      ageValue: yearsMatch[1],
      ageUnit: 'years' as AgeUnit,
    };
  }

  const monthsMatch = normalized.match(/(\d+)\s*(mese|mesi)\b/);
  if (monthsMatch?.[1]) {
    return {
      ageValue: monthsMatch[1],
      ageUnit: 'months' as AgeUnit,
    };
  }

  return {
    ageValue: '',
    ageUnit: 'months' as AgeUnit,
  };
};

const createInitialFormState = (listing: MyListing | null | undefined): ListingFormState => {
  const parsedAge =
    listing?.ageMonths !== null && listing?.ageMonths !== undefined
      ? parseAgeFromMonths(listing.ageMonths)
      : parseAgeFromText(listing?.ageText);

  return {
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    listingType: listing?.listingType ?? 'adozione',
    priceAmount: listing?.priceAmount ?? '',
    currency: listing?.currency ?? 'EUR',
    ageValue: parsedAge.ageValue,
    ageUnit: parsedAge.ageUnit,
    sex: listing?.sex ?? 'maschio',
    breed: listing?.breed ?? '',
    regionId: listing?.regionId ?? '',
    provinceId: listing?.provinceId ?? '',
    comuneId: listing?.comuneId ?? '',
    contactName: listing?.contactName ?? '',
    contactPhone: listing?.contactPhone ?? '',
    contactEmail: listing?.contactEmail ?? '',
  };
};

const parseApiError = (payload: unknown, fallbackMessage: string) => {
  if (typeof payload !== 'object' || payload === null) {
    return fallbackMessage;
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.issues) && record.issues.length > 0) {
    const firstIssue = record.issues[0];
    if (
      typeof firstIssue === 'object' &&
      firstIssue !== null &&
      typeof (firstIssue as Record<string, unknown>).message === 'string'
    ) {
      return String((firstIssue as Record<string, unknown>).message);
    }
  }

  if (Array.isArray(record.message) && typeof record.message[0] === 'string') {
    return String(record.message[0]);
  }

  if (typeof record.message === 'string') {
    return record.message;
  }

  return fallbackMessage;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Impossibile leggere il file ${file.name}.`));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(`Impossibile leggere il file ${file.name}.`));
        return;
      }

      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });

const fetchJson = async <TPayload,>(input: RequestInfo | URL, init?: RequestInit) => {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as TPayload | null;
  if (!response.ok) {
    throw new Error(
      parseApiError(payload, `Richiesta fallita con stato ${response.status.toString()}.`),
    );
  }

  return payload ?? ({} as TPayload);
};

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">{title}</h2>
      <p className="text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

function FieldLabel({
  children,
  htmlFor,
  optional = false,
}: {
  children: string;
  htmlFor?: string;
  optional?: boolean;
}) {
  return (
    <label
      className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
      htmlFor={htmlFor}
    >
      <span>{children}</span>
      {optional ? (
        <span className="text-[0.68rem] normal-case tracking-normal">facoltativo</span>
      ) : null}
    </label>
  );
}

function EmptyStateMessage({ children }: { children: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-4 text-sm leading-6 text-[var(--color-text-muted)]">
      {children}
    </div>
  );
}

export function ListingEditor({
  breeds,
  initialListing = null,
  initialMedia = [],
}: {
  breeds: ListingBreedOption[];
  initialListing?: MyListing | null;
  initialMedia?: MyListingMedia[];
}) {
  const router = useRouter();
  const fileInputId = useId();
  const queuedMediaRef = useRef<QueuedMediaItem[]>([]);
  const [form, setForm] = useState<ListingFormState>(() => createInitialFormState(initialListing));
  const [currentListingId, setCurrentListingId] = useState<string | null>(
    initialListing?.id ?? null,
  );
  const [currentListingStatus, setCurrentListingStatus] = useState<string>(
    initialListing?.status ?? 'draft',
  );
  const [media, setMedia] = useState<MyListingMedia[]>(initialMedia);
  const [queuedMedia, setQueuedMedia] = useState<QueuedMediaItem[]>([]);
  const [queuedCoverId, setQueuedCoverId] = useState<string | null>(null);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [comuni, setComuni] = useState<ComuneOption[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [comuniLoading, setComuniLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaActionId, setMediaActionId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'info',
  });

  const isEditMode = currentListingId !== null;
  const existingPrimaryMediaId = useMemo(
    () => media.find((item) => item.isPrimary)?.id ?? null,
    [media],
  );
  const effectiveCoverLabel = queuedCoverId
    ? 'La copertina verra applicata tra le nuove foto caricate.'
    : existingPrimaryMediaId
      ? 'La foto di copertina attuale e gia salvata.'
      : 'Se non scegli una copertina, verra usata la prima foto caricata.';
  const listingStatusLabel = currentListingStatus.replaceAll('_', ' ');

  useEffect(() => {
    queuedMediaRef.current = queuedMedia;
  }, [queuedMedia]);

  useEffect(() => {
    return () => {
      for (const item of queuedMediaRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    setForm(createInitialFormState(initialListing));
    setCurrentListingId(initialListing?.id ?? null);
    setCurrentListingStatus(initialListing?.status ?? 'draft');
    setMedia(initialMedia);
    setQueuedMedia((currentValue) => {
      for (const item of currentValue) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
    setQueuedCoverId(null);
    setValidationError(null);
  }, [initialListing, initialMedia]);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    let cancelled = false;
    setRegionsLoading(true);

    void fetchJson<{ regions: RegionOption[] }>(`${apiBaseUrl}/v1/geography/regions`, {
      cache: 'no-store',
    })
      .then((payload) => {
        if (!cancelled) {
          setRegions(Array.isArray(payload?.regions) ? payload.regions : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRegions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRegionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiBaseUrl || !form.regionId) {
      setProvinces([]);
      return;
    }

    let cancelled = false;
    setProvincesLoading(true);

    void fetchJson<{ provinces: ProvinceOption[] }>(
      `${apiBaseUrl}/v1/geography/provinces?regionId=${encodeURIComponent(form.regionId)}`,
      { cache: 'no-store' },
    )
      .then((payload) => {
        if (!cancelled) {
          setProvinces(Array.isArray(payload?.provinces) ? payload.provinces : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProvinces([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProvincesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.regionId]);

  useEffect(() => {
    if (!apiBaseUrl || !form.provinceId) {
      setComuni([]);
      return;
    }

    let cancelled = false;
    setComuniLoading(true);

    void fetchJson<{ comuni: ComuneOption[] }>(
      `${apiBaseUrl}/v1/geography/comuni?provinceId=${encodeURIComponent(form.provinceId)}`,
      { cache: 'no-store' },
    )
      .then((payload) => {
        if (!cancelled) {
          setComuni(Array.isArray(payload?.comuni) ? payload.comuni : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setComuni([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setComuniLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.provinceId]);

  const handleFieldChange = (field: keyof ListingFormState) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const nextValue = event.target.value;
      setForm((currentValue) => ({
        ...currentValue,
        [field]: nextValue,
      }));
      setValidationError(null);
    };
  };

  const handleRegionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRegionId = event.target.value;
    setForm((currentValue) => ({
      ...currentValue,
      regionId: nextRegionId,
      provinceId: '',
      comuneId: '',
    }));
    setValidationError(null);
  };

  const handleProvinceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextProvinceId = event.target.value;
    setForm((currentValue) => ({
      ...currentValue,
      provinceId: nextProvinceId,
      comuneId: '',
    }));
    setValidationError(null);
  };

  const refreshMedia = async (listingId: string) => {
    const payload = await fetchJson<{ media: MyListingMedia[] }>(
      `/api/listings/${listingId}/media`,
      {
        cache: 'no-store',
      },
    );
    setMedia(Array.isArray(payload?.media) ? payload.media : []);
  };

  const resetQueuedMedia = () => {
    setQueuedMedia((currentValue) => {
      for (const item of currentValue) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
    setQueuedCoverId(null);
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const nextItems = files.map((file) => ({
      id: `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setQueuedMedia((currentValue) => {
      const mergedItems = [...currentValue, ...nextItems];
      if (!queuedCoverId && !existingPrimaryMediaId) {
        setQueuedCoverId(mergedItems[0]?.id ?? null);
      }
      return mergedItems;
    });

    event.target.value = '';
  };

  const removeQueuedMedia = (queuedId: string) => {
    setQueuedMedia((currentValue) => {
      const targetItem = currentValue.find((item) => item.id === queuedId);
      if (targetItem) {
        URL.revokeObjectURL(targetItem.previewUrl);
      }

      const nextValue = currentValue.filter((item) => item.id !== queuedId);
      if (queuedCoverId === queuedId) {
        setQueuedCoverId(nextValue[0]?.id ?? null);
      }
      return nextValue;
    });
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!currentListingId) {
      return;
    }

    setMediaActionId(mediaId);
    setValidationError(null);

    try {
      await fetchJson<ListingMediaApiPayload>(
        `/api/listings/${currentListingId}/media/${mediaId}`,
        {
          method: 'DELETE',
        },
      );
      await refreshMedia(currentListingId);
      setToast({
        open: true,
        title: 'Foto rimossa',
        description: "La galleria dell'annuncio e stata aggiornata.",
        variant: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Operazione non riuscita',
        description: error instanceof Error ? error.message : 'Impossibile rimuovere la foto.',
        variant: 'danger',
      });
    } finally {
      setMediaActionId(null);
    }
  };

  const handleSetCoverMedia = async (mediaId: string) => {
    if (!currentListingId) {
      return;
    }

    setMediaActionId(mediaId);
    setValidationError(null);

    try {
      await fetchJson<ListingMediaApiPayload>(
        `/api/listings/${currentListingId}/media/${mediaId}/cover`,
        {
          method: 'PATCH',
        },
      );
      setQueuedCoverId(null);
      await refreshMedia(currentListingId);
      setToast({
        open: true,
        title: 'Copertina aggiornata',
        description: "La nuova foto principale e gia visibile nell'annuncio.",
        variant: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Copertina non aggiornata',
        description: error instanceof Error ? error.message : 'Impossibile impostare la copertina.',
        variant: 'danger',
      });
    } finally {
      setMediaActionId(null);
    }
  };

  const handleSubmit = async () => {
    setValidationError(null);

    const title = form.title.trim();
    const description = form.description.trim();
    const ageValue = form.ageValue.trim();
    const ageInteger = ageValue ? Number.parseInt(ageValue, 10) : Number.NaN;
    const priceValue = form.priceAmount.trim();
    const priceAmount =
      priceValue.length === 0 ? null : Number.parseFloat(priceValue.replace(',', '.'));

    if (!title) {
      setValidationError('Inserisci un titolo chiaro per il tuo annuncio.');
      return;
    }

    if (!description || description.length < 40) {
      setValidationError('La descrizione deve contenere almeno 40 caratteri utili.');
      return;
    }

    if (!form.regionId || !form.provinceId || !form.comuneId) {
      setValidationError('Seleziona regione, provincia e comune.');
      return;
    }

    if (!ageValue || !Number.isInteger(ageInteger) || ageInteger < 0) {
      setValidationError("Inserisci un'eta valida in mesi o anni.");
      return;
    }

    if (priceAmount !== null && (!Number.isFinite(priceAmount) || priceAmount < 0)) {
      setValidationError('Il prezzo deve essere un numero positivo oppure lasciato vuoto.');
      return;
    }

    const ageMonths = form.ageUnit === 'years' ? ageInteger * 12 : ageInteger;
    const payload = {
      title,
      description,
      listingType: form.listingType,
      priceAmount,
      currency: form.currency,
      ageMonths,
      sex: form.sex,
      breed: form.breed || null,
      regionId: form.regionId,
      provinceId: form.provinceId,
      comuneId: form.comuneId,
      contactName: form.contactName.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
    };

    setSaving(true);

    try {
      const listingPayload = currentListingId
        ? await fetchJson<ListingApiPayload>(`/api/listings/${currentListingId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })
        : await fetchJson<ListingApiPayload>('/api/listings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

      const nextListing = listingPayload.listing;
      const nextListingId = nextListing.id;
      setCurrentListingId(nextListingId);
      setCurrentListingStatus(nextListing.status);

      if (queuedMedia.length > 0) {
        for (let index = 0; index < queuedMedia.length; index += 1) {
          const item = queuedMedia[index];
          const contentBase64 = await readFileAsDataUrl(item.file);
          await fetchJson<ListingMediaApiPayload>(`/api/listings/${nextListingId}/media`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: item.file.name,
              mimeType: item.file.type || 'image/jpeg',
              contentBase64,
              position: media.length + index + 1,
              isPrimary: queuedCoverId === item.id,
            }),
          });
        }

        resetQueuedMedia();
        await refreshMedia(nextListingId);
      } else if (currentListingId) {
        await refreshMedia(nextListingId);
      }

      setToast({
        open: true,
        title: currentListingId ? 'Annuncio aggiornato' : 'Annuncio creato',
        description: currentListingId
          ? 'Le modifiche sono state salvate correttamente.'
          : 'Ora puoi continuare a rifinire foto e contenuti.',
        variant: 'success',
      });

      if (!currentListingId) {
        router.replace(`/annunci/${nextListingId}/modifica`);
        router.refresh();
        return;
      }

      router.refresh();
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Impossibile salvare l'annuncio.",
      );
      setToast({
        open: true,
        title: 'Salvataggio non riuscito',
        description: error instanceof Error ? error.message : "Impossibile salvare l'annuncio.",
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          {isEditMode ? (
            <Card className="overflow-hidden border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-border)_72%)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-primary)_10%,transparent)_0%,transparent_48%),color-mix(in_srgb,var(--color-surface-overlay-strong)_90%,white_10%)]">
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Modifica annuncio #{currentListingId}
                  </p>
                  <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                    Stato attuale:{' '}
                    <span className="capitalize text-[var(--color-text)]">
                      {listingStatusLabel}
                    </span>
                    . Le modifiche salvate restano disponibili anche dopo il refresh.
                  </p>
                </div>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
                  href={`/account/listings/${currentListingId}`}
                >
                  Apri dettaglio privato
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card className="overflow-hidden border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
            <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
              <SectionHeading
                description="Scrivi un titolo chiaro e una descrizione completa. Le informazioni principali devono essere leggibili a colpo d'occhio."
                title="Dati annuncio"
              />
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-title">Titolo</FieldLabel>
                  <Input
                    className={fieldClassName}
                    id="listing-title"
                    maxLength={160}
                    onChange={handleFieldChange('title')}
                    placeholder="Es. Micia dolcissima cerca casa a Milano"
                    value={form.title}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-type">Tipologia</FieldLabel>
                  <select
                    className={cn(fieldClassName, 'w-full')}
                    id="listing-type"
                    onChange={handleFieldChange('listingType')}
                    value={form.listingType}
                  >
                    {listingTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="listing-description">Descrizione</FieldLabel>
                <textarea
                  className={textareaClassName}
                  id="listing-description"
                  maxLength={6000}
                  onChange={handleFieldChange('description')}
                  placeholder="Racconta il carattere del gatto, il contesto attuale, eventuali esigenze veterinarie e cosa cerchi per la sua futura casa."
                  value={form.description}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_170px_120px]">
                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-price" optional>
                    Contributo richiesto
                  </FieldLabel>
                  <Input
                    className={fieldClassName}
                    id="listing-price"
                    inputMode="decimal"
                    min="0"
                    onChange={handleFieldChange('priceAmount')}
                    placeholder="Lascia vuoto se non previsto"
                    step="1"
                    type="number"
                    value={form.priceAmount}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-currency">Valuta</FieldLabel>
                  <Input
                    className={fieldClassName}
                    id="listing-currency"
                    onChange={handleFieldChange('currency')}
                    value={form.currency}
                  />
                </div>

                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_66%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  Prezzo facoltativo.
                  <br />
                  Se lo lasci vuoto verra mostrato come su richiesta.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
            <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
              <SectionHeading
                description="Profilo essenziale del gatto, coerente con i filtri pubblici e con la nuova gestione dell'eta in mesi/anni."
                title="Profilo del gatto"
              />
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px_170px]">
                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-breed">Razza</FieldLabel>
                  <select
                    className={cn(fieldClassName, 'w-full')}
                    id="listing-breed"
                    onChange={handleFieldChange('breed')}
                    value={form.breed}
                  >
                    <option value="">Non di razza / non specificata</option>
                    {breeds.map((breed) => (
                      <option key={breed.slug} value={breed.label}>
                        {breed.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-sex">Sesso</FieldLabel>
                  <select
                    className={cn(fieldClassName, 'w-full')}
                    id="listing-sex"
                    onChange={handleFieldChange('sex')}
                    value={form.sex}
                  >
                    {sexOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-age">Eta</FieldLabel>
                  <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                    <Input
                      className={fieldClassName}
                      id="listing-age"
                      inputMode="numeric"
                      min="0"
                      onChange={handleFieldChange('ageValue')}
                      placeholder="Es. 8"
                      step="1"
                      type="number"
                      value={form.ageValue}
                    />
                    <select
                      className={cn(fieldClassName, 'w-full')}
                      onChange={handleFieldChange('ageUnit')}
                      value={form.ageUnit}
                    >
                      <option value="months">Mesi</option>
                      <option value="years">Anni</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
            <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
              <SectionHeading
                description="La localita viene salvata con ids strutturati per supportare ricerca, vicinanza e future pagine geolocalizzate."
                title="Localita"
              />
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-region">Regione</FieldLabel>
                  <select
                    className={cn(fieldClassName, 'w-full')}
                    id="listing-region"
                    onChange={handleRegionChange}
                    value={form.regionId}
                  >
                    <option value="">
                      {regionsLoading ? 'Carico regioni...' : 'Seleziona regione'}
                    </option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-province">Provincia</FieldLabel>
                  <select
                    className={cn(fieldClassName, 'w-full')}
                    disabled={!form.regionId}
                    id="listing-province"
                    onChange={handleProvinceChange}
                    value={form.provinceId}
                  >
                    <option value="">
                      {!form.regionId
                        ? 'Prima seleziona la regione'
                        : provincesLoading
                          ? 'Carico province...'
                          : 'Seleziona provincia'}
                    </option>
                    {provinces.map((province) => (
                      <option key={province.id} value={province.id}>
                        {province.name} ({province.sigla})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-comune">Comune</FieldLabel>
                  <select
                    className={cn(fieldClassName, 'w-full')}
                    disabled={!form.provinceId}
                    id="listing-comune"
                    onChange={handleFieldChange('comuneId')}
                    value={form.comuneId}
                  >
                    <option value="">
                      {!form.provinceId
                        ? 'Prima seleziona la provincia'
                        : comuniLoading
                          ? 'Carico comuni...'
                          : 'Seleziona comune'}
                    </option>
                    {comuni.map((comune) => (
                      <option key={comune.id} value={comune.id}>
                        {comune.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
            <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
              <SectionHeading
                description="Questi dati vengono usati per mettere in contatto chi pubblica e chi e interessato all'annuncio."
                title="Contatti"
              />
            </CardHeader>
            <CardContent className="grid gap-5 pt-6 md:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel htmlFor="contact-name" optional>
                  Nome referente
                </FieldLabel>
                <Input
                  className={fieldClassName}
                  id="contact-name"
                  maxLength={120}
                  onChange={handleFieldChange('contactName')}
                  placeholder="Es. Giulia"
                  value={form.contactName}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="contact-phone" optional>
                  Telefono
                </FieldLabel>
                <Input
                  className={fieldClassName}
                  id="contact-phone"
                  maxLength={40}
                  onChange={handleFieldChange('contactPhone')}
                  placeholder="+39 333 1234567"
                  value={form.contactPhone}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="contact-email" optional>
                  Email
                </FieldLabel>
                <Input
                  className={fieldClassName}
                  id="contact-email"
                  maxLength={320}
                  onChange={handleFieldChange('contactEmail')}
                  placeholder="contatto@email.it"
                  type="email"
                  value={form.contactEmail}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-[calc(var(--shell-header-height)+1.75rem)] xl:self-start">
          <Card className="overflow-hidden border-[color:color-mix(in_srgb,var(--color-primary)_24%,var(--color-border)_76%)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-primary)_10%,transparent)_0%,transparent_44%),color-mix(in_srgb,var(--color-surface-overlay-strong)_90%,white_10%)]">
            <CardHeader className="border-b border-[var(--color-border)]/80 pb-5">
              <SectionHeading
                description="Carica piu foto, scegli la copertina e gestisci la galleria dell'annuncio."
                title="Foto e copertina"
              />
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="rounded-[24px] border border-dashed border-[color:color-mix(in_srgb,var(--color-primary)_32%,var(--color-border)_68%)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_64%,transparent)] p-4">
                <input
                  accept="image/*"
                  className="sr-only"
                  id={fileInputId}
                  multiple
                  onChange={handleFileSelection}
                  type="file"
                />
                <label
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-[20px] px-4 py-5 text-center transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-surface)_72%,transparent)]"
                  htmlFor={fileInputId}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                    <ImagePlus className="h-5 w-5" />
                  </span>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      Aggiungi foto dell'annuncio
                    </p>
                    <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                      JPG, PNG o WEBP. Puoi selezionare piu file in una volta sola.
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                <p className="font-medium text-[var(--color-text)]">Copertina</p>
                <p>{effectiveCoverLabel}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[var(--color-text)]">Foto gia salvate</p>
                {media.length === 0 ? (
                  <EmptyStateMessage>
                    Nessuna foto caricata. Aggiungile ora oppure salva l'annuncio e torna qui in
                    seguito.
                  </EmptyStateMessage>
                ) : (
                  <div className="space-y-3">
                    {media.map((item) => (
                      <div
                        className="flex items-center gap-3 rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_90%,white_10%)] p-3"
                        key={item.id}
                      >
                        <div
                          className="h-16 w-16 shrink-0 rounded-[18px] bg-cover bg-center"
                          style={{ backgroundImage: `url("${item.objectUrl}")` }}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                            Foto #{item.position}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {item.isPrimary ? 'Copertina attuale' : 'Foto secondaria'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            className="h-9 rounded-full px-3"
                            disabled={mediaActionId === item.id || item.isPrimary}
                            onClick={() => void handleSetCoverMedia(item.id)}
                            size="sm"
                            type="button"
                            variant={item.isPrimary ? 'secondary' : 'outline'}
                          >
                            {mediaActionId === item.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            className="h-9 rounded-full px-3"
                            disabled={mediaActionId === item.id}
                            onClick={() => void handleDeleteMedia(item.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {mediaActionId === item.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[var(--color-text)]">Nuove foto in coda</p>
                {queuedMedia.length === 0 ? (
                  <EmptyStateMessage>Nessuna nuova foto selezionata.</EmptyStateMessage>
                ) : (
                  <div className="space-y-3">
                    {queuedMedia.map((item, index) => (
                      <div
                        className="flex items-center gap-3 rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_90%,white_10%)] p-3"
                        key={item.id}
                      >
                        <div
                          className="h-16 w-16 shrink-0 rounded-[18px] bg-cover bg-center"
                          style={{ backgroundImage: `url("${item.previewUrl}")` }}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                            {item.file.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {queuedCoverId === item.id
                              ? 'Sera la copertina dopo il salvataggio'
                              : `Nuova foto ${index + 1}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            className="h-9 rounded-full px-3"
                            onClick={() => setQueuedCoverId(item.id)}
                            size="sm"
                            type="button"
                            variant={queuedCoverId === item.id ? 'secondary' : 'outline'}
                          >
                            {queuedCoverId === item.id ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            className="h-9 rounded-full px-3"
                            onClick={() => removeQueuedMedia(item.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
            <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
              <SectionHeading
                description="Controllo finale prima del salvataggio, con accesso rapido ai flussi principali dell'account."
                title="Riepilogo rapido"
              />
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Stato
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-[var(--color-text)]">
                    {listingStatusLabel}
                  </p>
                </div>
                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Foto
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {media.length + queuedMedia.length} totali
                  </p>
                </div>
                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Localita
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {form.comuneId ? 'Completa' : 'Da completare'}
                  </p>
                </div>
              </div>

              {validationError ? (
                <div className="rounded-[22px] border border-[color:color-mix(in_srgb,var(--color-danger-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger-bg)_92%,white_8%)] px-4 py-3 text-sm leading-6 text-[var(--color-danger-fg)]">
                  {validationError}
                </div>
              ) : null}

              <div className="space-y-3">
                <Button
                  className="h-12 w-full rounded-full text-sm font-semibold"
                  disabled={saving}
                  onClick={() => void handleSubmit()}
                  type="button"
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Salvo annuncio...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      {isEditMode ? 'Salva modifiche' : 'Crea annuncio'}
                    </>
                  )}
                </Button>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
                    href="/account/annunci"
                  >
                    I miei annunci
                  </Link>
                  {currentListingId ? (
                    <Link
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
                      href={`/annunci/${currentListingId}`}
                    >
                      Anteprima pubblica
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                <p className="inline-flex items-center gap-2 font-medium text-[var(--color-text)]">
                  <MapPinned className="h-4 w-4 text-[var(--color-primary)]" />
                  Consiglio
                </p>
                <p className="mt-1">
                  Usa almeno 3 foto nitide, una descrizione concreta e una localita precisa: la
                  qualita della scheda incide direttamente sulla ricerca.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Toast
        description={toast.description}
        onOpenChange={(open) => setToast((currentValue) => ({ ...currentValue, open }))}
        open={toast.open}
        title={toast.title}
        variant={toast.variant}
      />
    </>
  );
}
