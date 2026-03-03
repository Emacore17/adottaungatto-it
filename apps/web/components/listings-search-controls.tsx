'use client';

import {
  CAT_BREEDS,
  type LocationIntentScope,
  NO_BREED_FILTER,
  type SearchSort,
} from '@adottaungatto/types';
import { Badge, Button, cn } from '@adottaungatto/ui';
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Filter,
  LocateFixed,
  MapPin,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { GeographySuggestion } from '../lib/geography';
import { fetchLocationSuggestions } from '../lib/geography';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

const BREEDS = [
  { value: '', label: 'Indifferente' },
  { value: NO_BREED_FILTER, label: 'Non di razza' },
  ...CAT_BREEDS.map((breed) => ({
    value: breed.label,
    label: breed.label,
  })),
] as const;

const LISTING_TYPES = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'adozione', label: 'Adozione' },
  { value: 'stallo', label: 'Stallo' },
  { value: 'segnalazione', label: 'Segnalazione' },
] as const;

const SEX_OPTIONS = [
  { value: '', label: 'Qualsiasi' },
  { value: 'maschio', label: 'Maschio' },
  { value: 'femmina', label: 'Femmina' },
] as const;

const SORT_OPTIONS: ReadonlyArray<{ value: SearchSort; label: string }> = [
  { value: 'relevance', label: 'Piu pertinenti' },
  { value: 'newest', label: 'Piu recenti' },
  { value: 'price_asc', label: 'Prezzo crescente' },
  { value: 'price_desc', label: 'Prezzo decrescente' },
];

const PRICE_FILTER_OPTIONS = [
  { value: '', label: 'Nessun limite' },
  { value: '0', label: 'Gratis' },
  { value: '25', label: '25 EUR' },
  { value: '50', label: '50 EUR' },
  { value: '100', label: '100 EUR' },
  { value: '150', label: '150 EUR' },
  { value: '200', label: '200 EUR' },
  { value: '300', label: '300 EUR' },
  { value: '500', label: '500 EUR' },
  { value: '800', label: '800 EUR' },
  { value: '1000', label: '1000 EUR' },
] as const;

const AGE_FILTER_OPTIONS = [
  { value: '', label: 'Nessun limite' },
  { value: '1', label: '1 mese' },
  { value: '2', label: '2 mesi' },
  { value: '3', label: '3 mesi' },
  { value: '6', label: '6 mesi' },
  { value: '9', label: '9 mesi' },
  { value: '12', label: '1 anno' },
  { value: '18', label: '18 mesi' },
  { value: '24', label: '2 anni' },
  { value: '36', label: '3 anni' },
  { value: '60', label: '5 anni' },
  { value: '84', label: '7 anni' },
  { value: '120', label: '10 anni' },
] as const;

export interface ListingsFilterValues {
  q: string;
  listingType: string;
  sex: string;
  breed: string;
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: SearchSort;
  locationScope: LocationIntentScope | null;
  regionId: string | null;
  provinceId: string | null;
  comuneId: string | null;
  locationLabel: string | null;
  locationSecondaryLabel: string | null;
  locationQuery: string;
  referenceLat: number | null;
  referenceLon: number | null;
}

interface LocationAutocompleteProps {
  inputId: string;
  inputValue: string;
  label: string;
  onChange: (value: string) => void;
  onPickSuggestion: (suggestion: GeographySuggestion) => void;
}

interface FiltersFormProps {
  compact?: boolean;
  onCloseMobileSheet?: () => void;
  onReset: () => void;
  onSubmit: () => void;
  pending: boolean;
  setState: Dispatch<SetStateAction<ListingsFilterValues>>;
  state: ListingsFilterValues;
  validationError: string | null;
}

interface ListingsFiltersSidebarProps {
  initialValues: ListingsFilterValues;
}

interface ListingsResultsToolbarProps {
  initialValues: ListingsFilterValues;
  page: number;
  resultsCount: number;
  totalCount: number;
  totalPages: number;
}

interface FilterOption {
  label: string;
  value: string;
}

type MobileFilterStep =
  | 'root'
  | 'q'
  | 'location'
  | 'listingType'
  | 'sex'
  | 'breed'
  | 'price'
  | 'age';

const OVERLAY_VIEWPORT_PADDING = 12;

const resolveOverlayPlacement = (
  anchorTop: number,
  anchorBottom: number,
  overlayHeight: number,
): 'bottom' | 'top' => {
  const spaceBelow = window.innerHeight - anchorBottom - OVERLAY_VIEWPORT_PADDING;
  const spaceAbove = anchorTop - OVERLAY_VIEWPORT_PADDING;
  return spaceBelow >= overlayHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';
};

const numberOrNull = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

const hasStructuredLocation = (state: ListingsFilterValues) =>
  Boolean(state.locationScope && (state.locationLabel || state.regionId || state.provinceId));

const clearStructuredLocation = (state: ListingsFilterValues): ListingsFilterValues => ({
  ...state,
  locationScope: null,
  regionId: null,
  provinceId: null,
  comuneId: null,
  locationLabel: null,
  locationSecondaryLabel: null,
});

const applyLocationSuggestion = (
  state: ListingsFilterValues,
  suggestion: GeographySuggestion,
): ListingsFilterValues => ({
  ...clearStructuredLocation(state),
  locationScope: suggestion.locationIntent.scope,
  regionId: suggestion.locationIntent.regionId,
  provinceId: suggestion.locationIntent.provinceId,
  comuneId: suggestion.locationIntent.comuneId,
  locationLabel: suggestion.locationIntent.label,
  locationSecondaryLabel: suggestion.locationIntent.secondaryLabel,
  locationQuery: suggestion.label,
  referenceLat: null,
  referenceLon: null,
});

const buildListingsHref = (state: ListingsFilterValues, page = 1) => {
  const params = new URLSearchParams();
  const q = state.q.trim();
  const locationQuery = state.locationQuery.trim();

  if (q) {
    params.set('q', q);
  }

  if (state.listingType) {
    params.set('listingType', state.listingType);
  }

  if (state.sex) {
    params.set('sex', state.sex);
  }

  if (state.breed) {
    params.set('breed', state.breed);
  }

  if (state.ageMinMonths !== null) {
    params.set('ageMinMonths', String(state.ageMinMonths));
  }

  if (state.ageMaxMonths !== null) {
    params.set('ageMaxMonths', String(state.ageMaxMonths));
  }

  if (state.priceMin !== null) {
    params.set('priceMin', String(state.priceMin));
  }

  if (state.priceMax !== null) {
    params.set('priceMax', String(state.priceMax));
  }

  if (hasStructuredLocation(state)) {
    params.set('locationScope', state.locationScope ?? 'comune');
    if (state.regionId) {
      params.set('regionId', state.regionId);
    }
    if (state.provinceId) {
      params.set('provinceId', state.provinceId);
    }
    if (state.comuneId) {
      params.set('comuneId', state.comuneId);
    }
    if (state.locationLabel) {
      params.set('locationLabel', state.locationLabel);
    }
    if (state.locationSecondaryLabel) {
      params.set('locationSecondaryLabel', state.locationSecondaryLabel);
    }
  } else if (locationQuery) {
    params.set('locationLabel', locationQuery);
  }

  if (state.referenceLat !== null && state.referenceLon !== null) {
    params.set('referenceLat', String(state.referenceLat));
    params.set('referenceLon', String(state.referenceLon));
  }

  if (state.sort !== 'newest' || (state.referenceLat !== null && state.referenceLon !== null)) {
    params.set('sort', state.sort);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const queryString = params.toString();
  return queryString ? `/annunci?${queryString}` : '/annunci';
};

const optionLabel = (options: ReadonlyArray<FilterOption>, value: string) =>
  options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';

const buildPriceRangeLabel = (priceMin: number | null, priceMax: number | null) => {
  if (priceMin === null && priceMax === null) {
    return 'Qualsiasi prezzo';
  }

  if (priceMin !== null && priceMax !== null) {
    return `${priceMin} - ${priceMax} EUR`;
  }

  if (priceMin !== null) {
    return `Da ${priceMin} EUR`;
  }

  return `Fino a ${priceMax} EUR`;
};

const formatAgeMonthsLabel = (months: number) => {
  if (months > 0 && months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? 'anno' : 'anni'}`;
  }

  return `${months} ${months === 1 ? 'mese' : 'mesi'}`;
};

const buildAgeRangeLabel = (ageMinMonths: number | null, ageMaxMonths: number | null) => {
  if (ageMinMonths === null && ageMaxMonths === null) {
    return 'Qualsiasi eta';
  }

  if (ageMinMonths !== null && ageMaxMonths !== null) {
    return `${formatAgeMonthsLabel(ageMinMonths)} - ${formatAgeMonthsLabel(ageMaxMonths)}`;
  }

  if (ageMinMonths !== null) {
    return `Da ${formatAgeMonthsLabel(ageMinMonths)}`;
  }

  return `Fino a ${formatAgeMonthsLabel(ageMaxMonths ?? 0)}`;
};

function MobileFiltersSheet({
  children,
  onClose,
  open,
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="mobile-sheet-backdrop lg:hidden" onPointerDown={onClose} role="presentation">
      <section
        aria-label="Filtri ricerca"
        className="mobile-sheet"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mobile-sheet-handle" />
        <div className="mobile-sheet-header">
          <div className="mobile-sheet-heading">
            <h2 className="mobile-sheet-title">Filtri ricerca</h2>
            <p className="mobile-sheet-description">
              Aggiorna posizione, eta, razza, prezzo e tipologia in un unico pannello.
            </p>
          </div>
          <button
            aria-label="Chiudi filtri"
            className="mobile-sheet-close"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="mobile-sheet-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

function LocationAutocomplete({
  inputId,
  inputValue,
  label,
  onChange,
  onPickSuggestion,
}: LocationAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GeographySuggestion[]>([]);
  const deferredQuery = useDeferredValue(inputValue);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const normalizedQuery = deferredQuery.trim();
    if (normalizedQuery.length < 2) {
      setSuggestions([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (!apiBaseUrl) {
      setError('Config API mancante per i suggerimenti.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchLocationSuggestions(apiBaseUrl, normalizedQuery, 8)
      .then((items) => {
        if (!cancelled) {
          setSuggestions(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setError('Impossibile recuperare i suggerimenti.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, open]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="space-y-2" htmlFor={inputId}>
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {label}
        </span>
        <div className="relative">
          <MapPin
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-10 text-sm text-[var(--color-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]"
            id={inputId}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Citta, provincia o regione"
            type="text"
            value={inputValue}
          />
        </div>
      </label>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden rounded-[22px] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white_22%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_92%,white_8%)] shadow-[0_24px_54px_rgb(66_40_49_/_0.16)] backdrop-blur-xl">
          <div className="max-h-72 overflow-y-auto p-2">
            {loading ? (
              <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">
                Cerco suggerimenti...
              </p>
            ) : null}
            {!loading && error ? (
              <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">{error}</p>
            ) : null}
            {!loading && !error && deferredQuery.trim().length < 2 ? (
              <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">
                Scrivi almeno 2 lettere.
              </p>
            ) : null}
            {!loading && !error && deferredQuery.trim().length >= 2 && suggestions.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--color-text-muted)]">
                Nessuna localita trovata.
              </p>
            ) : null}
            {!loading && !error
              ? suggestions.map((suggestion) => (
                  <button
                    className="flex w-full flex-col rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)]"
                    key={`${suggestion.type}-${suggestion.id}`}
                    onClick={() => {
                      onPickSuggestion(suggestion);
                      setOpen(false);
                    }}
                    type="button"
                  >
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {suggestion.label}
                    </span>
                    {suggestion.secondaryLabel ? (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {suggestion.secondaryLabel}
                      </span>
                    ) : null}
                  </button>
                ))
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  className,
  compact = false,
  disabled = false,
  onChange,
  options,
  value,
}: {
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: ReadonlyArray<FilterOption>;
  value: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'bottom' | 'top'>('bottom');
  const selectedLabel = optionLabel(options, value);

  const estimateMenuHeight = () => {
    const rowHeight = 36;
    const contentHeight = options.length * rowHeight + 16;
    const viewportMaxHeight = Math.min(320, Math.max(180, window.innerHeight - 288));
    return Math.min(contentHeight, viewportMaxHeight);
  };

  const getMenuPlacement = (): 'bottom' | 'top' => {
    if (compact) {
      return 'bottom';
    }

    const root = rootRef.current;
    if (!root) {
      return 'bottom';
    }

    const rootRect = root.getBoundingClientRect();
    const menuHeight = estimateMenuHeight();

    return resolveOverlayPlacement(rootRect.top, rootRect.bottom, menuHeight);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !compact) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [compact, open]);

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'platform-select platform-select-trigger',
          open ? 'platform-select-open' : '',
        )}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!open) {
              setMenuPlacement(getMenuPlacement());
            }
            setOpen((currentOpen) => !currentOpen);
          }
        }}
        type="button"
      >
        <span className="platform-select-value">{selectedLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn('h-4 w-4 shrink-0 transition-transform', open ? 'rotate-180' : '')}
        />
      </button>

      {open ? (
        <div
          className={cn(
            'platform-select-menu',
            compact
              ? 'platform-select-menu-inline'
              : menuPlacement === 'top'
                ? 'platform-select-menu-top'
                : 'platform-select-menu-bottom',
          )}
          role="presentation"
        >
          <div className="platform-select-options">
            {options.map((option) => (
              <button
                aria-selected={option.value === value}
                className={cn(
                  'popover-list-item',
                  option.value === value ? 'platform-select-option-active' : '',
                )}
                key={`${option.value || 'empty'}-${option.label}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FiltersForm({
  compact = false,
  onCloseMobileSheet,
  onReset,
  onSubmit,
  pending,
  setState,
  state,
  validationError,
}: FiltersFormProps) {
  const qInputId = useId();
  const locationInputId = useId();

  const activeFiltersCount = useMemo(() => {
    return (
      (state.q.trim() ? 1 : 0) +
      (state.listingType ? 1 : 0) +
      (state.sex ? 1 : 0) +
      (state.breed ? 1 : 0) +
      (state.ageMinMonths !== null || state.ageMaxMonths !== null ? 1 : 0) +
      (state.priceMin !== null || state.priceMax !== null ? 1 : 0) +
      (hasStructuredLocation(state) || state.referenceLat !== null ? 1 : 0)
    );
  }, [state]);

  const containerClassName = compact
    ? 'space-y-5'
    : 'space-y-5 rounded-[30px] border border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)] p-5 shadow-[0_18px_52px_rgb(66_40_49_/_0.08)]';
  const labelClassName =
    'text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]';
  const textInputClassName =
    'h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]';
  const selectClassName = 'w-full';
  const [openCompositePopover, setOpenCompositePopover] = useState<'price' | 'age' | null>(null);
  const [compositePopoverPlacement, setCompositePopoverPlacement] = useState<'bottom' | 'top'>(
    'bottom',
  );
  const [mobileStep, setMobileStep] = useState<MobileFilterStep>('root');
  const priceFieldRef = useRef<HTMLDivElement>(null);
  const ageFieldRef = useRef<HTMLDivElement>(null);
  const compositePopoverRef = useRef<HTMLDivElement>(null);
  const listingTypeLabel = optionLabel(LISTING_TYPES, state.listingType);
  const sexLabel = optionLabel(SEX_OPTIONS, state.sex);
  const breedLabel = optionLabel(BREEDS, state.breed);
  const priceRangeLabel = buildPriceRangeLabel(state.priceMin, state.priceMax);
  const ageRangeLabel = buildAgeRangeLabel(state.ageMinMonths, state.ageMaxMonths);
  const qSummaryLabel = state.q.trim() || 'Nessun testo';
  const locationSummaryLabel =
    state.locationLabel || state.locationQuery.trim() || 'Nessuna localita';

  const getCompositePopoverPlacement = (popover: 'price' | 'age'): 'bottom' | 'top' => {
    const activeField = popover === 'price' ? priceFieldRef.current : ageFieldRef.current;
    const trigger = activeField?.querySelector<HTMLButtonElement>('button.platform-select-trigger');
    if (!trigger) {
      return 'bottom';
    }

    const triggerRect = trigger.getBoundingClientRect();
    const measuredPopoverHeight = compositePopoverRef.current?.offsetHeight ?? 0;
    const estimatedPopoverHeight = Math.min(416, Math.max(220, window.innerHeight - 64));
    const popoverHeight = Math.max(measuredPopoverHeight, estimatedPopoverHeight);

    return resolveOverlayPlacement(triggerRect.top, triggerRect.bottom, popoverHeight);
  };

  useEffect(() => {
    if (!openCompositePopover) {
      return;
    }

    const activeRef = openCompositePopover === 'price' ? priceFieldRef : ageFieldRef;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!activeRef.current?.contains(target)) {
        setOpenCompositePopover(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenCompositePopover(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCompositePopover]);

  useEffect(() => {
    if (!openCompositePopover || !compact) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      compositePopoverRef.current?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [compact, openCompositePopover]);

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  useEffect(() => {
    if (!compact && mobileStep !== 'root') {
      setMobileStep('root');
    }
  }, [compact, mobileStep]);

  const applyMobileSelection = (
    updater: (currentState: ListingsFilterValues) => ListingsFilterValues,
  ) => {
    setState(updater);
    setMobileStep('root');
  };

  const renderMobileStepButton = (
    step: Exclude<MobileFilterStep, 'root'>,
    label: string,
    value: string,
  ) => (
    <button
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-muted)]"
      onClick={() => setMobileStep(step)}
      type="button"
    >
      <span className="min-w-0 space-y-0.5">
        <span className={cn(labelClassName, 'block text-[0.62rem]')}>{label}</span>
        <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
          {value}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]"
      />
    </button>
  );

  const renderMobileOptionList = (
    options: ReadonlyArray<FilterOption>,
    value: string,
    onSelect: (nextValue: string) => void,
  ) => (
    <div className="space-y-1">
      {options.map((option) => (
        <button
          className={cn(
            'w-full rounded-xl px-3 py-2.5 text-left text-[0.98rem] text-[var(--color-text)] transition-colors',
            option.value === value
              ? 'platform-select-option-active font-semibold'
              : 'hover:bg-[var(--color-surface-muted)]',
          )}
          key={`${option.value || 'empty'}-${option.label}`}
          onClick={() => onSelect(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const mobileStepTitle =
    mobileStep === 'q'
      ? 'Cerca'
      : mobileStep === 'location'
        ? 'Dove'
        : mobileStep === 'listingType'
          ? 'Tipologia'
          : mobileStep === 'sex'
            ? 'Sesso'
            : mobileStep === 'breed'
              ? 'Razza'
              : mobileStep === 'price'
                ? 'Prezzo'
                : mobileStep === 'age'
                  ? 'Eta del gatto'
                  : 'Filtri';

  if (compact) {
    return (
      <form className={containerClassName} onSubmit={onFormSubmit}>
        {mobileStep === 'root' ? (
          <>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
                  Filtra gli annunci
                </p>
                {activeFiltersCount > 0 ? (
                  <Badge className="shrink-0" variant="outline">
                    {activeFiltersCount} filtri
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Ricerca per testo, posizione, prezzo, eta e preferenze.
              </p>
            </div>

            {state.referenceLat !== null && state.referenceLon !== null ? (
              <div className="rounded-[24px] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white_22%)] bg-[color:color-mix(in_srgb,var(--color-surface)_84%,transparent)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                      <LocateFixed
                        aria-hidden="true"
                        className="h-4 w-4 text-[var(--color-primary)]"
                      />
                      Ordinati per distanza
                    </p>
                    <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                      Stai vedendo gli annunci piu vicini alla tua posizione attuale.
                    </p>
                  </div>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
                    onClick={() =>
                      setState((currentState) => ({
                        ...currentState,
                        referenceLat: null,
                        referenceLon: null,
                      }))
                    }
                    type="button"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {renderMobileStepButton('q', 'Cerca', qSummaryLabel)}
              {renderMobileStepButton('location', 'Dove', locationSummaryLabel)}
              {renderMobileStepButton('listingType', 'Tipologia', listingTypeLabel)}
              {renderMobileStepButton('sex', 'Sesso', sexLabel)}
              {renderMobileStepButton('breed', 'Razza', breedLabel)}
              {renderMobileStepButton('price', 'Prezzo', priceRangeLabel)}
              {renderMobileStepButton('age', 'Eta del gatto', ageRangeLabel)}
            </div>

            {validationError ? (
              <p className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border-strong)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_72%,transparent)] px-4 py-3 text-sm text-[var(--color-text)]">
                {validationError}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="gap-2 sm:flex-1" disabled={pending} type="submit">
                <Search aria-hidden="true" className="h-4 w-4" />
                {pending ? 'Aggiorno...' : 'Applica filtri'}
              </Button>
              <Button
                className="gap-2 sm:flex-1"
                onClick={onReset}
                type="button"
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Azzera
              </Button>
            </div>

            {onCloseMobileSheet ? (
              <button
                className="w-full rounded-full border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
                onClick={onCloseMobileSheet}
                type="button"
              >
                Chiudi pannello
              </button>
            ) : null}
          </>
        ) : (
          <div className="space-y-4">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
              onClick={() => setMobileStep('root')}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Torna ai filtri
            </button>

            <div className="space-y-1">
              <p className={labelClassName}>Sezione</p>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
                {mobileStepTitle}
              </h3>
            </div>

            {mobileStep === 'q' ? (
              <label className="space-y-2" htmlFor={qInputId}>
                <span className={labelClassName}>Cerca</span>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                  />
                  <input
                    className={cn(textInputClassName, 'pl-10')}
                    id={qInputId}
                    onChange={(event) =>
                      setState((currentState) => ({
                        ...currentState,
                        q: event.target.value,
                      }))
                    }
                    placeholder="Es. micia giovane, stallo urgente, Milano"
                    type="text"
                    value={state.q}
                  />
                </div>
              </label>
            ) : null}

            {mobileStep === 'location' ? (
              <LocationAutocomplete
                inputId={locationInputId}
                inputValue={state.locationQuery}
                label="Dove"
                onChange={(value) =>
                  setState((currentState) => {
                    const shouldClearStructuredLocation =
                      normalizeText(value) !== normalizeText(currentState.locationLabel);

                    return {
                      ...(shouldClearStructuredLocation
                        ? clearStructuredLocation(currentState)
                        : currentState),
                      locationQuery: value,
                      referenceLat: null,
                      referenceLon: null,
                    };
                  })
                }
                onPickSuggestion={(suggestion) =>
                  applyMobileSelection((currentState) =>
                    applyLocationSuggestion(currentState, suggestion),
                  )
                }
              />
            ) : null}

            {mobileStep === 'listingType' ? (
              <div className="space-y-2">
                <span className={labelClassName}>Tipologia</span>
                {renderMobileOptionList(LISTING_TYPES, state.listingType, (value) => {
                  applyMobileSelection((currentState) => ({
                    ...currentState,
                    listingType: value,
                  }));
                })}
              </div>
            ) : null}

            {mobileStep === 'sex' ? (
              <div className="space-y-2">
                <span className={labelClassName}>Sesso</span>
                {renderMobileOptionList(SEX_OPTIONS, state.sex, (value) => {
                  applyMobileSelection((currentState) => ({
                    ...currentState,
                    sex: value,
                  }));
                })}
              </div>
            ) : null}

            {mobileStep === 'breed' ? (
              <div className="space-y-2">
                <span className={labelClassName}>Razza</span>
                {renderMobileOptionList(BREEDS, state.breed, (value) => {
                  applyMobileSelection((currentState) => ({
                    ...currentState,
                    breed: value,
                  }));
                })}
              </div>
            ) : null}

            {mobileStep === 'price' ? (
              <div className="space-y-4">
                <div className="filter-field-group">
                  <span className="location-label">Prezzo minimo</span>
                  {renderMobileOptionList(
                    PRICE_FILTER_OPTIONS.map((option) => ({
                      ...option,
                      label: option.value ? `Da ${option.label}` : option.label,
                    })),
                    state.priceMin !== null ? String(state.priceMin) : '',
                    (value) => {
                      applyMobileSelection((currentState) => ({
                        ...currentState,
                        priceMin: numberOrNull(value),
                      }));
                    },
                  )}
                </div>

                <div className="filter-field-group">
                  <span className="location-label">Prezzo massimo</span>
                  {renderMobileOptionList(
                    PRICE_FILTER_OPTIONS.map((option) => ({
                      ...option,
                      label: option.value ? `Fino a ${option.label}` : option.label,
                    })),
                    state.priceMax !== null ? String(state.priceMax) : '',
                    (value) => {
                      applyMobileSelection((currentState) => ({
                        ...currentState,
                        priceMax: numberOrNull(value),
                      }));
                    },
                  )}
                </div>
                <p className="location-meta">
                  Seleziona un intervallo rapido senza digitare importi.
                </p>
                <div className="filter-reset-row">
                  <button
                    className="filter-reset-btn"
                    onClick={() =>
                      setState((currentState) => ({
                        ...currentState,
                        priceMin: null,
                        priceMax: null,
                      }))
                    }
                    type="button"
                  >
                    Azzera
                  </button>
                </div>
              </div>
            ) : null}

            {mobileStep === 'age' ? (
              <div className="space-y-4">
                <div className="filter-field-group">
                  <span className="location-label">Eta minima</span>
                  {renderMobileOptionList(
                    AGE_FILTER_OPTIONS.map((option) => ({
                      ...option,
                      label: option.value ? `Da ${option.label}` : option.label,
                    })),
                    state.ageMinMonths !== null ? String(state.ageMinMonths) : '',
                    (value) => {
                      applyMobileSelection((currentState) => ({
                        ...currentState,
                        ageMinMonths: numberOrNull(value),
                      }));
                    },
                  )}
                </div>

                <div className="filter-field-group">
                  <span className="location-label">Eta massima</span>
                  {renderMobileOptionList(
                    AGE_FILTER_OPTIONS.map((option) => ({
                      ...option,
                      label: option.value ? `Fino a ${option.label}` : option.label,
                    })),
                    state.ageMaxMonths !== null ? String(state.ageMaxMonths) : '',
                    (value) => {
                      applyMobileSelection((currentState) => ({
                        ...currentState,
                        ageMaxMonths: numberOrNull(value),
                      }));
                    },
                  )}
                </div>
                <p className="location-meta">
                  Le opzioni usano mesi e anni, ma il backend salva sempre il valore in mesi.
                </p>
                <div className="filter-reset-row">
                  <button
                    className="filter-reset-btn"
                    onClick={() =>
                      setState((currentState) => ({
                        ...currentState,
                        ageMinMonths: null,
                        ageMaxMonths: null,
                      }))
                    }
                    type="button"
                  >
                    Azzera
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </form>
    );
  }

  return (
    <form className={containerClassName} onSubmit={onFormSubmit}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
            Filtra gli annunci
          </p>
          {activeFiltersCount > 0 ? (
            <Badge className="shrink-0" variant="outline">
              {activeFiltersCount} filtri
            </Badge>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">
          Ricerca per testo, posizione, prezzo, eta e preferenze.
        </p>
      </div>

      {state.referenceLat !== null && state.referenceLon !== null ? (
        <div className="rounded-[24px] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white_22%)] bg-[color:color-mix(in_srgb,var(--color-surface)_84%,transparent)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <LocateFixed aria-hidden="true" className="h-4 w-4 text-[var(--color-primary)]" />
                Ordinati per distanza
              </p>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Stai vedendo gli annunci piu vicini alla tua posizione attuale.
              </p>
            </div>
            <button
              className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
              onClick={() =>
                setState((currentState) => ({
                  ...currentState,
                  referenceLat: null,
                  referenceLon: null,
                }))
              }
              type="button"
            >
              Rimuovi
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <label className="space-y-2" htmlFor={qInputId}>
          <span className={labelClassName}>Cerca</span>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              className={cn(textInputClassName, 'pl-10')}
              id={qInputId}
              onChange={(event) =>
                setState((currentState) => ({
                  ...currentState,
                  q: event.target.value,
                }))
              }
              placeholder="Es. micia giovane, stallo urgente, Milano"
              type="text"
              value={state.q}
            />
          </div>
        </label>

        <LocationAutocomplete
          inputId={locationInputId}
          inputValue={state.locationQuery}
          label="Dove"
          onChange={(value) =>
            setState((currentState) => {
              const shouldClearStructuredLocation =
                normalizeText(value) !== normalizeText(currentState.locationLabel);

              return {
                ...(shouldClearStructuredLocation
                  ? clearStructuredLocation(currentState)
                  : currentState),
                locationQuery: value,
                referenceLat: null,
                referenceLon: null,
              };
            })
          }
          onPickSuggestion={(suggestion) =>
            setState((currentState) => applyLocationSuggestion(currentState, suggestion))
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className={labelClassName}>Tipologia</span>
          <FilterSelect
            className={selectClassName}
            compact={compact}
            onChange={(value) =>
              setState((currentState) => ({
                ...currentState,
                listingType: value,
              }))
            }
            options={LISTING_TYPES}
            value={state.listingType}
          />
        </div>

        <div className="space-y-2">
          <span className={labelClassName}>Sesso</span>
          <FilterSelect
            className={selectClassName}
            compact={compact}
            onChange={(value) =>
              setState((currentState) => ({
                ...currentState,
                sex: value,
              }))
            }
            options={SEX_OPTIONS}
            value={state.sex}
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className={labelClassName}>Razza</span>
        <FilterSelect
          className={selectClassName}
          compact={compact}
          onChange={(value) =>
            setState((currentState) => ({
              ...currentState,
              breed: value,
            }))
          }
          options={BREEDS}
          value={state.breed}
        />
      </div>

      <div className="relative space-y-2" ref={priceFieldRef}>
        <span className={labelClassName}>Prezzo</span>
        <button
          aria-expanded={openCompositePopover === 'price'}
          aria-haspopup="true"
          className={cn(
            'platform-select platform-select-trigger',
            openCompositePopover === 'price' ? 'platform-select-open' : '',
          )}
          onClick={() =>
            setOpenCompositePopover((currentPopover) => {
              if (currentPopover === 'price') {
                return null;
              }

              if (!compact) {
                setCompositePopoverPlacement(getCompositePopoverPlacement('price'));
              }
              return 'price';
            })
          }
          type="button"
        >
          <span className="platform-select-value">{priceRangeLabel}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 transition-transform',
              openCompositePopover === 'price' ? 'rotate-180' : '',
            )}
          />
        </button>

        {openCompositePopover === 'price' ? (
          <div
            className={cn(
              'filters-composite-popover',
              compact
                ? 'filters-composite-popover-inline'
                : compositePopoverPlacement === 'top'
                  ? 'filters-composite-popover-top'
                  : 'filters-composite-popover-bottom',
            )}
            ref={compositePopoverRef}
          >
            <div className="filter-grid">
              <div className="filter-field-group">
                <span className="location-label">Prezzo minimo</span>
                <FilterSelect
                  className={selectClassName}
                  compact={compact}
                  onChange={(value) =>
                    setState((currentState) => ({
                      ...currentState,
                      priceMin: numberOrNull(value),
                    }))
                  }
                  options={PRICE_FILTER_OPTIONS.map((option) => ({
                    ...option,
                    label: option.value ? `Da ${option.label}` : option.label,
                  }))}
                  value={state.priceMin !== null ? String(state.priceMin) : ''}
                />
              </div>

              <div className="filter-field-group">
                <span className="location-label">Prezzo massimo</span>
                <FilterSelect
                  className={selectClassName}
                  compact={compact}
                  onChange={(value) =>
                    setState((currentState) => ({
                      ...currentState,
                      priceMax: numberOrNull(value),
                    }))
                  }
                  options={PRICE_FILTER_OPTIONS.map((option) => ({
                    ...option,
                    label: option.value ? `Fino a ${option.label}` : option.label,
                  }))}
                  value={state.priceMax !== null ? String(state.priceMax) : ''}
                />
              </div>
            </div>

            <p className="location-meta">Seleziona un intervallo rapido senza digitare importi.</p>

            <div className="filter-reset-row">
              <button
                className="filter-reset-btn"
                onClick={() =>
                  setState((currentState) => ({
                    ...currentState,
                    priceMin: null,
                    priceMax: null,
                  }))
                }
                type="button"
              >
                Azzera
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative space-y-2" ref={ageFieldRef}>
        <span className={labelClassName}>Eta del gatto</span>
        <button
          aria-expanded={openCompositePopover === 'age'}
          aria-haspopup="true"
          className={cn(
            'platform-select platform-select-trigger',
            openCompositePopover === 'age' ? 'platform-select-open' : '',
          )}
          onClick={() =>
            setOpenCompositePopover((currentPopover) => {
              if (currentPopover === 'age') {
                return null;
              }

              if (!compact) {
                setCompositePopoverPlacement(getCompositePopoverPlacement('age'));
              }
              return 'age';
            })
          }
          type="button"
        >
          <span className="platform-select-value">{ageRangeLabel}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 transition-transform',
              openCompositePopover === 'age' ? 'rotate-180' : '',
            )}
          />
        </button>

        {openCompositePopover === 'age' ? (
          <div
            className={cn(
              'filters-composite-popover',
              compact
                ? 'filters-composite-popover-inline'
                : compositePopoverPlacement === 'top'
                  ? 'filters-composite-popover-top'
                  : 'filters-composite-popover-bottom',
            )}
            ref={compositePopoverRef}
          >
            <div className="filter-grid">
              <div className="filter-field-group">
                <span className="location-label">Eta minima</span>
                <FilterSelect
                  className={selectClassName}
                  compact={compact}
                  onChange={(value) =>
                    setState((currentState) => ({
                      ...currentState,
                      ageMinMonths: numberOrNull(value),
                    }))
                  }
                  options={AGE_FILTER_OPTIONS.map((option) => ({
                    ...option,
                    label: option.value ? `Da ${option.label}` : option.label,
                  }))}
                  value={state.ageMinMonths !== null ? String(state.ageMinMonths) : ''}
                />
              </div>

              <div className="filter-field-group">
                <span className="location-label">Eta massima</span>
                <FilterSelect
                  className={selectClassName}
                  compact={compact}
                  onChange={(value) =>
                    setState((currentState) => ({
                      ...currentState,
                      ageMaxMonths: numberOrNull(value),
                    }))
                  }
                  options={AGE_FILTER_OPTIONS.map((option) => ({
                    ...option,
                    label: option.value ? `Fino a ${option.label}` : option.label,
                  }))}
                  value={state.ageMaxMonths !== null ? String(state.ageMaxMonths) : ''}
                />
              </div>
            </div>

            <p className="location-meta">
              Le opzioni usano mesi e anni, ma il backend salva sempre il valore in mesi.
            </p>

            <div className="filter-reset-row">
              <button
                className="filter-reset-btn"
                onClick={() =>
                  setState((currentState) => ({
                    ...currentState,
                    ageMinMonths: null,
                    ageMaxMonths: null,
                  }))
                }
                type="button"
              >
                Azzera
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {validationError ? (
        <p className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border-strong)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_72%,transparent)] px-4 py-3 text-sm text-[var(--color-text)]">
          {validationError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="gap-2 sm:flex-1" disabled={pending} type="submit">
          <Search aria-hidden="true" className="h-4 w-4" />
          {pending ? 'Aggiorno...' : 'Applica filtri'}
        </Button>
        <Button className="gap-2 sm:flex-1" onClick={onReset} type="button" variant="secondary">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Azzera
        </Button>
      </div>

      {onCloseMobileSheet ? (
        <button
          className="w-full rounded-full border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
          onClick={onCloseMobileSheet}
          type="button"
        >
          Chiudi pannello
        </button>
      ) : null}
    </form>
  );
}

function useListingsFilterState(initialValues: ListingsFilterValues) {
  const router = useRouter();
  const [state, setState] = useState<ListingsFilterValues>(initialValues);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setState(initialValues);
    setValidationError(null);
    setPending(false);
  }, [initialValues]);

  const resolveLocationBeforeSubmit = async (
    currentState: ListingsFilterValues,
  ): Promise<ListingsFilterValues | null> => {
    const normalizedQuery = currentState.locationQuery.trim();
    if (!normalizedQuery) {
      return clearStructuredLocation({
        ...currentState,
        locationQuery: '',
      });
    }

    if (
      hasStructuredLocation(currentState) &&
      normalizeText(normalizedQuery) === normalizeText(currentState.locationLabel)
    ) {
      return currentState;
    }

    if (!apiBaseUrl) {
      setValidationError('Config API mancante per cercare la localita.');
      return null;
    }

    try {
      const suggestions = await fetchLocationSuggestions(apiBaseUrl, normalizedQuery, 1);
      const bestMatch = suggestions[0];
      if (!bestMatch) {
        setValidationError('Seleziona una localita valida dai suggerimenti.');
        return null;
      }

      return applyLocationSuggestion(currentState, bestMatch);
    } catch {
      setValidationError('Impossibile verificare la localita in questo momento.');
      return null;
    }
  };

  const pushHref = (href: string) => {
    setPending(true);
    startTransition(() => {
      router.push(href);
    });
  };

  const submit = async () => {
    setValidationError(null);

    if (
      state.priceMin !== null &&
      state.priceMax !== null &&
      Number(state.priceMin) > Number(state.priceMax)
    ) {
      setValidationError('Il prezzo minimo non puo essere superiore al prezzo massimo.');
      return false;
    }

    if (
      state.ageMinMonths !== null &&
      state.ageMaxMonths !== null &&
      state.ageMinMonths > state.ageMaxMonths
    ) {
      setValidationError("L'eta minima non puo essere superiore all'eta massima.");
      return false;
    }

    const resolvedState = await resolveLocationBeforeSubmit(state);
    if (!resolvedState) {
      return false;
    }

    setState(resolvedState);
    pushHref(buildListingsHref(resolvedState, 1));
    return true;
  };

  const reset = () => {
    setValidationError(null);
    pushHref('/annunci');
  };

  const changeSort = (sort: SearchSort) => {
    const nextState = {
      ...state,
      sort,
    };
    setState(nextState);
    setValidationError(null);
    pushHref(buildListingsHref(nextState, 1));
  };

  return {
    changeSort,
    pending,
    reset,
    setState,
    state,
    submit,
    validationError,
  };
}

export function ListingsFiltersSidebar({ initialValues }: ListingsFiltersSidebarProps) {
  const { pending, reset, setState, state, submit, validationError } =
    useListingsFilterState(initialValues);
  const stickyShellRef = useRef<HTMLDivElement>(null);
  const stickyPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = stickyShellRef.current;
    const panel = stickyPanelRef.current;
    if (!shell || !panel) {
      return;
    }

    let offset = 0;
    let minOffset = 0;
    let stickyTop = 0;
    let stickyStartScrollY: number | null = null;
    let previousScrollY = window.scrollY;
    let resizeRaf = 0;
    const stickyStartDelay = 96;

    const applyOffset = (nextOffset: number) => {
      if (nextOffset === offset) {
        return;
      }

      offset = nextOffset;
      panel.style.transform = offset === 0 ? '' : `translateY(${offset}px)`;
    };

    const clampOffset = (value: number) => Math.max(minOffset, Math.min(0, value));

    const measure = () => {
      stickyTop = Number.parseFloat(window.getComputedStyle(shell).top) || 0;
      const availableHeight = window.innerHeight - stickyTop - 8;
      const panelHeight = panel.getBoundingClientRect().height;
      minOffset = Math.min(0, availableHeight - panelHeight);

      if (minOffset === 0) {
        applyOffset(0);
        return;
      }

      applyOffset(clampOffset(offset));
    };

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - previousScrollY;
      previousScrollY = currentScrollY;

      const shellTop = shell.getBoundingClientRect().top;
      const stickyEngaged = shellTop <= stickyTop + 1;

      if (!stickyEngaged) {
        stickyStartScrollY = null;
        if (offset !== 0) {
          applyOffset(0);
        }
        return;
      }

      if (stickyStartScrollY === null) {
        stickyStartScrollY = currentScrollY;
      }

      if (currentScrollY - stickyStartScrollY < stickyStartDelay) {
        if (offset !== 0) {
          applyOffset(0);
        }
        return;
      }

      if (currentScrollY <= 0 || minOffset === 0 || delta === 0) {
        if (currentScrollY <= 0 && offset !== 0) {
          applyOffset(0);
        }
        return;
      }

      const nextOffset =
        delta > 0 ? Math.max(minOffset, offset - delta) : Math.min(0, offset - delta);

      applyOffset(nextOffset);
    };

    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(measure);
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(panel);

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(resizeRaf);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      panel.style.transform = '';
    };
  }, []);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[calc(var(--shell-header-height)+0.75rem)]" ref={stickyShellRef}>
        <div className="will-change-transform" ref={stickyPanelRef}>
          <FiltersForm
            onReset={reset}
            onSubmit={() => {
              void submit();
            }}
            pending={pending}
            setState={setState}
            state={state}
            validationError={validationError}
          />
        </div>
      </div>
    </aside>
  );
}

export function ListingsResultsToolbar({
  initialValues,
  page,
  resultsCount,
  totalCount,
  totalPages,
}: ListingsResultsToolbarProps) {
  const { changeSort, pending, reset, setState, state, submit, validationError } =
    useListingsFilterState(initialValues);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 rounded-[28px] border border-[color:color-mix(in_srgb,var(--color-border)_82%,white_18%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_84%,white_16%)] px-4 py-4 shadow-[0_18px_48px_rgb(66_40_49_/_0.08)] sm:px-5 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Risultati
            </p>
            <div className="space-y-1">
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-[var(--color-text)]">
                {new Intl.NumberFormat('it-IT').format(totalCount)} annunci trovati
              </h2>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                Pagina {page} di {Math.max(totalPages, 1)}. In questa vista ne stai vedendo{' '}
                {new Intl.NumberFormat('it-IT').format(resultsCount)}.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                className="h-10 gap-2 rounded-full px-4"
                onClick={() => setMobileFiltersOpen(true)}
                type="button"
                variant="secondary"
              >
                <Filter aria-hidden="true" className="h-4 w-4" />
                Filtri
              </Button>
              <Button
                className="h-10 rounded-full px-4"
                onClick={reset}
                type="button"
                variant="outline"
              >
                Reset
              </Button>
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5" />
                Ordina per
              </span>
              <FilterSelect
                className="min-w-[220px]"
                onChange={(value) => changeSort(value as SearchSort)}
                options={SORT_OPTIONS}
                value={state.sort}
              />
            </div>
          </div>
        </div>
      </div>

      <MobileFiltersSheet onClose={() => setMobileFiltersOpen(false)} open={mobileFiltersOpen}>
        <FiltersForm
          compact
          onCloseMobileSheet={() => setMobileFiltersOpen(false)}
          onReset={reset}
          onSubmit={() => {
            void submit().then((success) => {
              if (success) {
                setMobileFiltersOpen(false);
              }
            });
          }}
          pending={pending}
          setState={setState}
          state={state}
          validationError={validationError}
        />
      </MobileFiltersSheet>
    </>
  );
}
