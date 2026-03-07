'use client';

import { Badge, Button, Card, CardContent, CardHeader, Input, Toast, cn } from '@adottaungatto/ui';
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Files,
  ImagePlus,
  LoaderCircle,
  Mail,
  MapPinned,
  Phone,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SESSION_EXPIRED_MESSAGE, fetchWithAuthRefresh } from '../lib/client-auth-fetch';
import { formatListingStatusLabel } from '../lib/listing-status';
import type { ListingBreedOption, MyListing, MyListingMedia } from '../lib/listings';

type AgeUnit = 'months' | 'years';
type TernaryChoice = 'unknown' | 'yes' | 'no';

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

type ValidationField = 'title' | 'description' | 'location' | 'age' | 'price';

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
  isSterilized: TernaryChoice;
  isVaccinated: TernaryChoice;
  hasMicrochip: TernaryChoice;
  compatibleWithChildren: TernaryChoice;
  compatibleWithOtherAnimals: TernaryChoice;
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

type SaveFeedbackState = {
  status: 'idle' | 'saving' | 'success' | 'error';
  message: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const emptyInitialMedia: MyListingMedia[] = [];

const listingTypeOptions = [
  { value: 'adozione', label: 'Adozione' },
  { value: 'stallo', label: 'Stallo' },
  { value: 'segnalazione', label: 'Segnalazione' },
] as const;

const sexOptions = [
  { value: 'maschio', label: 'Maschio' },
  { value: 'femmina', label: 'Femmina' },
] as const;
const ternaryChoiceOptions = [
  { value: 'unknown', label: 'Non specificato' },
  { value: 'yes', label: 'Si' },
  { value: 'no', label: 'No' },
] as const;

const fieldClassName =
  'h-11 rounded-[18px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white_8%)] px-4 text-sm text-[var(--color-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]';
const selectFieldClassName = 'platform-select';
const invalidFieldClassName =
  'border-[var(--color-danger-border)] focus:border-[var(--color-danger-border)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-danger-border)_24%,transparent)]';

const textareaClassName = cn(fieldClassName, 'min-h-[150px] h-auto resize-y py-3 leading-6');
const sectionCardClassName =
  'border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)] shadow-[0_22px_60px_-42px_rgba(15,23,42,0.38)]';
const secondaryActionClassName =
  'inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_84%,white_16%)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]';
const sectionNavLinkClassName =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_84%,white_16%)] px-4 text-sm font-medium text-[var(--color-text-muted)] transition-[border-color,background-color,color] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]';
const mobileQuickActionClassName =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_86%,white_14%)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]';
const maxMediaItems = 12;
const maxMediaFileSizeMb = 8;
const maxMediaFileSizeBytes = maxMediaFileSizeMb * 1024 * 1024;

type EditorSectionItem = {
  id: string;
  label: string;
  icon: typeof Files;
};

const parseAgeFromMonths = (ageMonths: number | null | undefined) => {
  if (typeof ageMonths !== 'number' || !Number.isFinite(ageMonths) || ageMonths <= 0) {
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
    const parsedYears = Number.parseInt(yearsMatch[1], 10);
    if (!Number.isInteger(parsedYears) || parsedYears <= 0) {
      return {
        ageValue: '',
        ageUnit: 'months' as AgeUnit,
      };
    }

    return {
      ageValue: yearsMatch[1],
      ageUnit: 'years' as AgeUnit,
    };
  }

  const monthsMatch = normalized.match(/(\d+)\s*(mese|mesi)\b/);
  if (monthsMatch?.[1]) {
    const parsedMonths = Number.parseInt(monthsMatch[1], 10);
    if (!Number.isInteger(parsedMonths) || parsedMonths <= 0) {
      return {
        ageValue: '',
        ageUnit: 'months' as AgeUnit,
      };
    }

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

const toTernaryChoice = (value: boolean | null | undefined): TernaryChoice => {
  if (value === true) {
    return 'yes';
  }

  if (value === false) {
    return 'no';
  }

  return 'unknown';
};

const fromTernaryChoice = (value: TernaryChoice): boolean | null => {
  if (value === 'yes') {
    return true;
  }

  if (value === 'no') {
    return false;
  }

  return null;
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
    currency: 'EUR',
    ageValue: parsedAge.ageValue,
    ageUnit: parsedAge.ageUnit,
    sex: listing?.sex ?? 'maschio',
    breed: listing?.breed ?? '',
    isSterilized: toTernaryChoice(listing?.isSterilized),
    isVaccinated: toTernaryChoice(listing?.isVaccinated),
    hasMicrochip: toTernaryChoice(listing?.hasMicrochip),
    compatibleWithChildren: toTernaryChoice(listing?.compatibleWithChildren),
    compatibleWithOtherAnimals: toTernaryChoice(listing?.compatibleWithOtherAnimals),
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
  const response = await fetchWithAuthRefresh(input, init);
  const payload = (await response.json().catch(() => null)) as TPayload | null;
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
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

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_82%,white_18%)] px-4 py-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-[var(--color-text)]">{value}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{detail}</p>
    </div>
  );
}

function EditorSectionNav({ items }: { items: EditorSectionItem[] }) {
  return (
    <nav aria-label="Sezioni editor annuncio" className="overflow-x-auto pb-1">
      <div className="flex gap-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <a className={sectionNavLinkClassName} href={`#${item.id}`} key={item.id}>
              <Icon aria-hidden="true" className="h-4 w-4 text-[var(--color-primary)]" />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function ReadinessItem({
  complete,
  label,
  description,
}: {
  complete: boolean;
  label: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border px-4 py-3 transition-colors',
        complete
          ? 'border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-border)_72%)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
          : 'border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_58%,transparent)]',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            complete
              ? 'border-[color:color-mix(in_srgb,var(--color-primary)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]'
              : 'border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_72%,transparent)] text-[var(--color-text-muted)]',
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-text)]">{label}</p>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function ListingEditor({
  breeds,
  initialListing = null,
  initialMedia = emptyInitialMedia,
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
  const [invalidField, setInvalidField] = useState<ValidationField | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState>({
    status: 'idle',
    message: '',
  });
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
  const listingStatusLabel = formatListingStatusLabel(currentListingStatus);
  const titleLength = form.title.trim().length;
  const descriptionLength = form.description.trim().length;
  const totalMediaCount = media.length + queuedMedia.length;
  const locationComplete = Boolean(form.regionId && form.provinceId && form.comuneId);
  const contactComplete = Boolean(
    form.contactName.trim() || form.contactPhone.trim() || form.contactEmail.trim(),
  );
  const profileComplete = Boolean(form.listingType && form.sex && form.ageValue.trim());
  const mediaComplete = totalMediaCount > 0;
  const readinessItems = [
    {
      complete: titleLength > 0 && descriptionLength >= 40,
      label: 'Contenuti chiari',
      description: 'Titolo leggibile e descrizione con almeno 40 caratteri utili.',
    },
    {
      complete: profileComplete,
      label: 'Profilo del gatto',
      description: 'Tipologia, sesso ed età strutturata pronti per i filtri pubblici.',
    },
    {
      complete: locationComplete,
      label: 'Località precisa',
      description: 'Regione, provincia e comune servono per ricerca e vicinanza.',
    },
    {
      complete: mediaComplete,
      label: 'Galleria visibile',
      description: 'Almeno una foto migliora apertura, fiducia e conversione del contatto.',
    },
  ];
  const completedReadinessCount = readinessItems.filter((item) => item.complete).length;
  const completionPercent = Math.round((completedReadinessCount / readinessItems.length) * 100);
  const saveButtonLabel = isEditMode ? 'Salva modifiche' : 'Crea annuncio';
  const sectionItems: EditorSectionItem[] = [
    { id: 'listing-data', label: 'Annuncio', icon: Files },
    { id: 'listing-profile', label: 'Profilo', icon: Camera },
    { id: 'listing-location', label: 'Località', icon: MapPinned },
    { id: 'listing-contacts', label: 'Contatti', icon: Phone },
    { id: 'listing-media', label: 'Foto', icon: ImagePlus },
    { id: 'listing-review', label: 'Controlli', icon: ShieldCheck },
  ];
  const selectedRegionName = regions.find((region) => region.id === form.regionId)?.name ?? '';
  const selectedProvinceName =
    provinces.find((province) => province.id === form.provinceId)?.name ?? '';
  const selectedComuneName = comuni.find((comune) => comune.id === form.comuneId)?.name ?? '';
  const locationSummaryLabel =
    [selectedRegionName, selectedProvinceName, selectedComuneName].filter(Boolean).join(' / ') ||
    'Seleziona regione, provincia e comune';
  const locationStatusLabel = !apiBaseUrl
    ? 'I dati geografici non sono disponibili in questo momento.'
    : comuniLoading
      ? 'Sto caricando i comuni disponibili.'
      : provincesLoading
        ? 'Sto caricando le province disponibili.'
        : form.regionId && provinces.length === 0
          ? 'Non ci sono province disponibili per la regione selezionata.'
          : form.provinceId && comuni.length === 0
            ? 'Non ci sono comuni disponibili per la provincia selezionata.'
            : locationComplete
              ? 'La località è pronta per ricerca e vicinanza.'
              : 'Completa tutti i livelli geografici per rendere la scheda più trovabile.';
  const remainingMediaSlots = Math.max(0, maxMediaItems - totalMediaCount);
  const mediaCapacityLabel =
    remainingMediaSlots > 0
      ? `Puoi ancora aggiungere ${remainingMediaSlots} ${remainingMediaSlots === 1 ? 'foto' : 'foto'}.`
      : 'Hai raggiunto il numero massimo di foto per questa scheda.';

  const scrollToSection = (sectionId: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const reportValidationError = (message: string, sectionId: string, field: ValidationField) => {
    setValidationError(message);
    setInvalidField(field);
    setSaveFeedback({
      status: 'error',
      message,
    });
    setToast({
      open: true,
      title: 'Controlla i campi obbligatori',
      description: message,
      variant: 'warning',
    });
    scrollToSection(sectionId);
  };

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
    setInvalidField(null);
    setSaveFeedback({
      status: 'idle',
      message: '',
    });
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
      setInvalidField(null);
      setSaveFeedback({
        status: 'idle',
        message: '',
      });
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
    setInvalidField(null);
    setSaveFeedback({
      status: 'idle',
      message: '',
    });
  };

  const handleProvinceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextProvinceId = event.target.value;
    setForm((currentValue) => ({
      ...currentValue,
      provinceId: nextProvinceId,
      comuneId: '',
    }));
    setValidationError(null);
    setInvalidField(null);
    setSaveFeedback({
      status: 'idle',
      message: '',
    });
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

    if (remainingMediaSlots <= 0) {
      setToast({
        open: true,
        title: 'Limite foto raggiunto',
        description: `Puoi salvare fino a ${maxMediaItems} immagini per annuncio.`,
        variant: 'warning',
      });
      scrollToSection('listing-media');
      event.target.value = '';
      return;
    }

    const validImageFiles = files.filter((file) => file.type.startsWith('image/'));
    const oversizedFiles = validImageFiles.filter((file) => file.size > maxMediaFileSizeBytes);
    const acceptedFiles = validImageFiles
      .filter((file) => file.size <= maxMediaFileSizeBytes)
      .slice(0, remainingMediaSlots);
    const ignoredForLimitCount = Math.max(
      validImageFiles.filter((file) => file.size <= maxMediaFileSizeBytes).length -
        acceptedFiles.length,
      0,
    );

    if (acceptedFiles.length === 0) {
      setToast({
        open: true,
        title: 'Nessuna foto aggiunta',
        description: `Seleziona immagini JPG, PNG o WEBP fino a ${maxMediaFileSizeMb} MB ciascuna.`,
        variant: 'warning',
      });
      scrollToSection('listing-media');
      event.target.value = '';
      return;
    }

    const nextItems = acceptedFiles.map((file) => ({
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

    if (files.length !== acceptedFiles.length) {
      const feedbackParts: string[] = [];
      if (files.length !== validImageFiles.length) {
        feedbackParts.push('alcuni file non sono immagini');
      }
      if (oversizedFiles.length > 0) {
        feedbackParts.push(`alcuni file superano ${maxMediaFileSizeMb} MB`);
      }
      if (ignoredForLimitCount > 0) {
        feedbackParts.push('hai raggiunto il limite di foto disponibili');
      }

      setToast({
        open: true,
        title: 'Alcune foto non sono state aggiunte',
        description: feedbackParts.join(', '),
        variant: 'warning',
      });
    }

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
    setInvalidField(null);

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
    setInvalidField(null);

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
    setInvalidField(null);
    setSaveFeedback({
      status: 'idle',
      message: '',
    });

    const title = form.title.trim();
    const description = form.description.trim();
    const ageValue = form.ageValue.trim();
    const ageInteger = ageValue ? Number.parseInt(ageValue, 10) : Number.NaN;
    const priceValue = form.priceAmount.trim();
    const priceAmount =
      priceValue.length === 0 ? null : Number.parseFloat(priceValue.replace(',', '.'));

    if (!title) {
      reportValidationError(
        'Inserisci un titolo chiaro per il tuo annuncio.',
        'listing-data',
        'title',
      );
      return;
    }

    if (!description || description.length < 40) {
      reportValidationError(
        'La descrizione deve contenere almeno 40 caratteri utili.',
        'listing-data',
        'description',
      );
      return;
    }

    if (!form.regionId || !form.provinceId || !form.comuneId) {
      reportValidationError(
        'Seleziona regione, provincia e comune.',
        'listing-location',
        'location',
      );
      return;
    }

    if (!ageValue || !Number.isInteger(ageInteger) || ageInteger <= 0) {
      reportValidationError(
        "Inserisci un'età valida maggiore di zero, in mesi o anni.",
        'listing-profile',
        'age',
      );
      return;
    }

    if (priceAmount !== null && (!Number.isFinite(priceAmount) || priceAmount < 0)) {
      reportValidationError(
        'Il prezzo deve essere un numero positivo oppure lasciato vuoto.',
        'listing-data',
        'price',
      );
      return;
    }

    const ageMonths = form.ageUnit === 'years' ? ageInteger * 12 : ageInteger;
    const payload = {
      title,
      description,
      listingType: form.listingType,
      priceAmount,
      currency: 'EUR',
      ageMonths,
      sex: form.sex,
      breed: form.breed || null,
      isSterilized: fromTernaryChoice(form.isSterilized),
      isVaccinated: fromTernaryChoice(form.isVaccinated),
      hasMicrochip: fromTernaryChoice(form.hasMicrochip),
      compatibleWithChildren: fromTernaryChoice(form.compatibleWithChildren),
      compatibleWithOtherAnimals: fromTernaryChoice(form.compatibleWithOtherAnimals),
      regionId: form.regionId,
      provinceId: form.provinceId,
      comuneId: form.comuneId,
      contactName: form.contactName.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
    };

    setSaving(true);
    setSaveFeedback({
      status: 'saving',
      message: 'Salvataggio in corso...',
    });

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
        title: 'Modifiche salvate',
        description: currentListingId
          ? 'Salvato con successo.'
          : 'Annuncio creato con successo. Puoi continuare a rifinire foto e contenuti.',
        variant: 'success',
      });
      setSaveFeedback({
        status: 'success',
        message: 'Modifiche salvate.',
      });

      if (!currentListingId) {
        router.replace(`/annunci/${nextListingId}/modifica`);
        router.refresh();
        return;
      }

      router.refresh();
    } catch (error) {
      setInvalidField(null);
      const saveErrorMessage =
        error instanceof Error ? error.message : "Impossibile salvare l'annuncio.";
      setValidationError(saveErrorMessage);
      setSaveFeedback({
        status: 'error',
        message: saveErrorMessage,
      });
      scrollToSection('listing-review');
      setToast({
        open: true,
        title: 'Salvataggio non riuscito',
        description: saveErrorMessage,
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit();
  };

  return (
    <>
      <form className="space-y-6 pb-28 xl:pb-0" onSubmit={handleFormSubmit}>
        <Card className="overflow-hidden border-[color:color-mix(in_srgb,var(--color-primary)_24%,var(--color-border)_76%)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-primary)_12%,transparent)_0%,transparent_42%),linear-gradient(135deg,color-mix(in_srgb,var(--color-surface-overlay-strong)_92%,white_8%)_0%,color-mix(in_srgb,var(--color-surface)_84%,white_16%)_100%)] shadow-[0_30px_80px_-52px_rgba(15,23,42,0.45)]">
          <CardContent className="space-y-6 pt-6 sm:pt-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {isEditMode ? `Modifica annuncio #${currentListingId}` : 'Nuova bozza'}
                  </Badge>
                  <Badge
                    className="border-transparent bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]"
                    variant="secondary"
                  >
                    {completionPercent}% completato
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-[2rem]">
                    Costruisci una scheda chiara, affidabile e semplice da contattare.
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">
                    Mantieni il focus su informazioni essenziali, località precisa e una galleria
                    leggibile. Completa una sezione per volta e salva quando hai un blocco pronto.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-[color:color-mix(in_srgb,var(--color-primary)_18%,var(--color-border)_82%)] bg-[color:color-mix(in_srgb,var(--color-surface)_82%,white_18%)] px-5 py-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.42)] lg:max-w-[320px]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Stato annuncio
                </p>
                <p className="mt-2 text-lg font-semibold capitalize text-[var(--color-text)]">
                  {listingStatusLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  {isEditMode
                    ? 'Stai lavorando su una scheda esistente. Aggiorna contenuti e foto senza cambiare flusso.'
                    : 'La prima conferma crea la bozza, poi potrai completare il resto con più calma.'}
                </p>
                <div className="mt-5 hidden gap-3 md:grid">
                  <Button
                    className="h-11 rounded-full text-sm font-semibold"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Salvo annuncio...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        {saveButtonLabel}
                      </>
                    )}
                  </Button>
                  {currentListingId ? (
                    <Link
                      className={secondaryActionClassName}
                      href={`/annunci/${currentListingId}`}
                    >
                      Anteprima pubblica
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                detail="Titolo breve e leggibile: ideale entro 90-110 caratteri."
                label="Titolo"
                value={titleLength > 0 ? `${titleLength}/160 caratteri` : 'Da scrivere'}
              />
              <SummaryMetric
                detail="La descrizione minima utile parte da 40 caratteri."
                label="Descrizione"
                value={descriptionLength > 0 ? `${descriptionLength} caratteri` : 'Da scrivere'}
              />
              <SummaryMetric
                detail="Serve per filtri geografici, vicinanza e risultati più pertinenti."
                label="Località"
                value={locationComplete ? 'Completa' : 'Da completare'}
              />
              <SummaryMetric
                detail="Almeno una foto aumenta fiducia e qualita percepita della scheda."
                label="Galleria"
                value={totalMediaCount > 0 ? `${totalMediaCount} foto` : 'Nessuna foto'}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                <span>Prontezza della scheda</span>
                <span>
                  {completedReadinessCount}/{readinessItems.length} sezioni
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[color:color-mix(in_srgb,var(--color-border)_70%,transparent)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-primary)_72%,white_28%)_0%,color-mix(in_srgb,var(--color-primary)_92%,black_8%)_100%)] transition-[width] duration-300 ease-out"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <EditorSectionNav items={sectionItems} />

        <Card className={cn('xl:hidden', sectionCardClassName)}>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Foto
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                  {totalMediaCount > 0 ? `${totalMediaCount} pronte` : 'Da aggiungere'}
                </p>
              </div>
              <div className="rounded-[20px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Località
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                  {locationComplete ? 'Completa' : 'Da completare'}
                </p>
              </div>
              <div className="rounded-[20px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Contatto
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                  {contactComplete ? 'Presente' : 'Facoltativo'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label
                className={cn(mobileQuickActionClassName, 'cursor-pointer')}
                htmlFor={fileInputId}
              >
                <ImagePlus className="h-4 w-4 text-[var(--color-primary)]" />
                Aggiungi foto
              </label>
              {currentListingId ? (
                <Link className={mobileQuickActionClassName} href={`/annunci/${currentListingId}`}>
                  Anteprima
                  <ArrowUpRight className="h-4 w-4 text-[var(--color-primary)]" />
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
          <div className="space-y-6">
            <Card
              className={cn(
                'scroll-mt-[calc(var(--shell-header-height)+1.5rem)] overflow-hidden',
                sectionCardClassName,
                (invalidField === 'title' ||
                  invalidField === 'description' ||
                  invalidField === 'price') &&
                  'border-[var(--color-danger-border)]',
              )}
              id="listing-data"
            >
              <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
                <SectionHeading
                  description="Scrivi un titolo chiaro e una descrizione completa. Le informazioni principali devono essere leggibili a colpo d occhio."
                  title="Dati annuncio"
                />
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-title">Titolo</FieldLabel>
                    <Input
                      aria-invalid={invalidField === 'title'}
                      className={cn(
                        fieldClassName,
                        invalidField === 'title' && invalidFieldClassName,
                      )}
                      id="listing-title"
                      maxLength={160}
                      onChange={handleFieldChange('title')}
                      placeholder="Es. Micia dolcissima cerca casa a Milano"
                      value={form.title}
                    />
                    <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                      Meglio corto, specifico e subito comprensibile. Ora: {titleLength}/160.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-type">Tipologia</FieldLabel>
                    <select
                      className={selectFieldClassName}
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
                    aria-invalid={invalidField === 'description'}
                    className={cn(
                      textareaClassName,
                      invalidField === 'description' && invalidFieldClassName,
                    )}
                    id="listing-description"
                    maxLength={6000}
                    onChange={handleFieldChange('description')}
                    placeholder="Racconta il carattere del gatto, il contesto attuale, eventuali esigenze veterinarie e cosa cerchi per la sua futura casa."
                    value={form.description}
                  />
                  <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                    Parti da carattere, salute, abitudini e tipo di casa ideale. Minimo utile: 40
                    caratteri. Ora: {descriptionLength}.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_110px]">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-price" optional>
                      Contributo richiesto
                    </FieldLabel>
                    <Input
                      aria-invalid={invalidField === 'price'}
                      className={cn(
                        fieldClassName,
                        invalidField === 'price' && invalidFieldClassName,
                      )}
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
                    <select
                      aria-readonly="true"
                      className={selectFieldClassName}
                      disabled
                      id="listing-currency"
                      value={form.currency}
                    >
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_66%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  Prezzo facoltativo. Se lo lasci vuoto verra mostrato come su richiesta. La valuta
                  supportata e EUR.
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'scroll-mt-[calc(var(--shell-header-height)+1.5rem)]',
                sectionCardClassName,
                invalidField === 'age' && 'border-[var(--color-danger-border)]',
              )}
              id="listing-profile"
            >
              <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
                <SectionHeading
                  description="Profilo essenziale del gatto, coerente con i filtri pubblici e con la gestione dell'età in mesi o anni."
                  title="Profilo del gatto"
                />
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px_170px]">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-breed">Razza</FieldLabel>
                    <select
                      className={selectFieldClassName}
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
                      className={selectFieldClassName}
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
                    <FieldLabel htmlFor="listing-age">Età</FieldLabel>
                    <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                      <Input
                        aria-invalid={invalidField === 'age'}
                        className={cn(
                          fieldClassName,
                          invalidField === 'age' && invalidFieldClassName,
                        )}
                        id="listing-age"
                        inputMode="numeric"
                        min="1"
                        onChange={handleFieldChange('ageValue')}
                        placeholder="Es. 8"
                        step="1"
                        type="number"
                        value={form.ageValue}
                      />
                      <select
                        className={selectFieldClassName}
                        onChange={handleFieldChange('ageUnit')}
                        value={form.ageUnit}
                      >
                        <option value="months">Mesi</option>
                        <option value="years">Anni</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-sterilized">Sterilizzato</FieldLabel>
                    <select
                      className={selectFieldClassName}
                      id="listing-sterilized"
                      onChange={handleFieldChange('isSterilized')}
                      value={form.isSterilized}
                    >
                      {ternaryChoiceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-vaccinated">Vaccinato</FieldLabel>
                    <select
                      className={selectFieldClassName}
                      id="listing-vaccinated"
                      onChange={handleFieldChange('isVaccinated')}
                      value={form.isVaccinated}
                    >
                      {ternaryChoiceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-microchip">Microchip</FieldLabel>
                    <select
                      className={selectFieldClassName}
                      id="listing-microchip"
                      onChange={handleFieldChange('hasMicrochip')}
                      value={form.hasMicrochip}
                    >
                      {ternaryChoiceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-compatible-children">
                      Compatibile con bambini
                    </FieldLabel>
                    <select
                      className={selectFieldClassName}
                      id="listing-compatible-children"
                      onChange={handleFieldChange('compatibleWithChildren')}
                      value={form.compatibleWithChildren}
                    >
                      {ternaryChoiceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="listing-compatible-animals">
                    Compatibile con altri animali
                  </FieldLabel>
                  <select
                    className={selectFieldClassName}
                    id="listing-compatible-animals"
                    onChange={handleFieldChange('compatibleWithOtherAnimals')}
                    value={form.compatibleWithOtherAnimals}
                  >
                    {ternaryChoiceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  Usa i mesi per i gattini e gli anni per gli adulti. La ricerca pubblica usera
                  questo dato in modo strutturato.
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'scroll-mt-[calc(var(--shell-header-height)+1.5rem)]',
                sectionCardClassName,
                invalidField === 'location' && 'border-[var(--color-danger-border)]',
              )}
              id="listing-location"
            >
              <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
                <SectionHeading
                  description="La località viene salvata con ids strutturati per supportare ricerca, vicinanza e future pagine geolocalizzate."
                  title="Località"
                />
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  <p className="font-medium text-[var(--color-text)]">{locationSummaryLabel}</p>
                  <p>{locationStatusLabel}</p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="listing-region">Regione</FieldLabel>
                    <select
                      aria-invalid={invalidField === 'location'}
                      className={cn(
                        selectFieldClassName,
                        invalidField === 'location' && invalidFieldClassName,
                      )}
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
                      aria-invalid={invalidField === 'location'}
                      className={cn(
                        selectFieldClassName,
                        invalidField === 'location' && invalidFieldClassName,
                      )}
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
                      aria-invalid={invalidField === 'location'}
                      className={cn(
                        selectFieldClassName,
                        invalidField === 'location' && invalidFieldClassName,
                      )}
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

            <Card
              className={cn(
                'scroll-mt-[calc(var(--shell-header-height)+1.5rem)]',
                sectionCardClassName,
              )}
              id="listing-contacts"
            >
              <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
                <SectionHeading
                  description="Questi dati vengono usati per mettere in contatto chi pubblica e chi e interessato all annuncio."
                  title="Contatti"
                />
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid gap-4 rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_58%,transparent)] px-4 py-4 text-sm leading-6 text-[var(--color-text-muted)] sm:grid-cols-2">
                  <p className="inline-flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                    Aggiungi almeno un recapito per ridurre l attrito nel primo contatto.
                  </p>
                  <p className="inline-flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />I dati
                    restano associati alla scheda e possono essere aggiornati in qualsiasi momento.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
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
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-[calc(var(--shell-header-height)+1.75rem)] xl:self-start">
            <Card
              className="scroll-mt-[calc(var(--shell-header-height)+1.5rem)] overflow-hidden border-[color:color-mix(in_srgb,var(--color-primary)_24%,var(--color-border)_76%)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-primary)_10%,transparent)_0%,transparent_44%),color-mix(in_srgb,var(--color-surface-overlay-strong)_90%,white_10%)]"
              id="listing-media"
            >
              <CardHeader className="border-b border-[var(--color-border)]/80 pb-5">
                <SectionHeading
                  description="Carica piu foto, scegli la copertina e gestisci la galleria dell'annuncio."
                  title="Foto e copertina"
                />
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  <p className="font-medium text-[var(--color-text)]">
                    Fino a {maxMediaItems} foto, max {maxMediaFileSizeMb} MB ciascuna
                  </p>
                  <p>{mediaCapacityLabel}</p>
                </div>

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
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      Nuove foto in coda
                    </p>
                    {queuedMedia.length > 0 ? (
                      <button
                        className="text-sm font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-text)]"
                        onClick={resetQueuedMedia}
                        type="button"
                      >
                        Svuota coda
                      </button>
                    ) : null}
                  </div>
                  {queuedMedia.length === 0 ? (
                    <EmptyStateMessage>
                      Nessuna nuova foto selezionata. Puoi salvare la bozza e tornare qui piu tardi
                      per completare la galleria.
                    </EmptyStateMessage>
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

            <Card
              className={cn(
                'scroll-mt-[calc(var(--shell-header-height)+1.5rem)]',
                sectionCardClassName,
              )}
              id="listing-review"
            >
              <CardHeader className="space-y-4 border-b border-[var(--color-border)]/80 pb-5">
                <SectionHeading
                  description="Controllo finale prima del salvataggio, con azioni rapide e stato reale della scheda."
                  title="Salvataggio e controlli"
                />
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="rounded-[24px] border border-[color:color-mix(in_srgb,var(--color-primary)_20%,var(--color-border)_80%)] bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                        Scheda pronta
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">
                        {completionPercent}% completata
                      </p>
                    </div>
                    <Badge
                      className="border-transparent bg-[color:color-mix(in_srgb,var(--color-surface)_84%,white_16%)]"
                      variant="secondary"
                    >
                      {listingStatusLabel}
                    </Badge>
                  </div>
                  <div className="mt-4 h-2.5 rounded-full bg-[color:color-mix(in_srgb,var(--color-border)_72%,transparent)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-primary)_74%,white_26%)_0%,color-mix(in_srgb,var(--color-primary)_94%,black_6%)_100%)] transition-[width] duration-300 ease-out"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

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
                      Località
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                      {form.comuneId ? 'Completa' : 'Da completare'}
                    </p>
                  </div>
                </div>

                {validationError ? (
                  <div
                    className="rounded-[22px] border border-[color:color-mix(in_srgb,var(--color-danger-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger-bg)_92%,white_8%)] px-4 py-3 text-sm leading-6 text-[var(--color-danger-fg)]"
                    role="alert"
                  >
                    {validationError}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {readinessItems.map((item) => (
                    <ReadinessItem
                      complete={item.complete}
                      description={item.description}
                      key={item.label}
                      label={item.label}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <Button
                    className="h-12 w-full rounded-full text-sm font-semibold"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Salvo annuncio...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        {saveButtonLabel}
                      </>
                    )}
                  </Button>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <Link className={secondaryActionClassName} href="/account/annunci">
                      I miei annunci
                    </Link>
                    {currentListingId ? (
                      <Link
                        className={secondaryActionClassName}
                        href={`/annunci/${currentListingId}`}
                      >
                        Anteprima pubblica
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  <p className="inline-flex items-center gap-2 font-medium text-[var(--color-text)]">
                    <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                    Best practice
                  </p>
                  <p className="mt-1">
                    Titolo specifico, una copertina nitida e una località precisa sono i tre
                    elementi che migliorano di più la qualità percepita della scheda.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-4 z-40 px-4 xl:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-[26px] border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_88%,white_12%)] p-3 shadow-[0_28px_72px_-44px_rgba(15,23,42,0.5)] backdrop-blur-md">
            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Scheda
              </p>
              <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                {completedReadinessCount}/{readinessItems.length} sezioni pronte
              </p>
              {saveFeedback.status !== 'idle' ? (
                <p
                  className={cn(
                    'mt-1 truncate text-xs',
                    saveFeedback.status === 'success'
                      ? 'text-[var(--color-success-fg)]'
                      : saveFeedback.status === 'error'
                        ? 'text-[var(--color-danger-fg)]'
                        : 'text-[var(--color-text-muted)]',
                  )}
                >
                  {saveFeedback.message}
                </p>
              ) : null}
            </div>
            <label
              className={cn(
                mobileQuickActionClassName,
                'h-11 shrink-0 cursor-pointer rounded-full px-4',
              )}
              htmlFor={fileInputId}
            >
              <ImagePlus className="h-4 w-4 text-[var(--color-primary)]" />
              Foto
            </label>
            <Button
              className="h-11 rounded-full px-5 text-sm font-semibold"
              disabled={saving}
              type="submit"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Salva
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

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
