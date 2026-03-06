'use client';

import type { SearchSort } from '@adottaungatto/types';
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
} from '@adottaungatto/ui';
import {
  ArrowUpDown,
  ChevronDown,
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
import {
  AGE_FILTER_OPTIONS,
  BREEDS,
  type FilterOption,
  LISTING_TYPES,
  PRICE_FILTER_OPTIONS,
  SEX_OPTIONS,
  SORT_OPTIONS,
  buildAgeRangeLabel,
  buildPriceRangeLabel,
  numberOrNull,
  optionLabel,
} from '../features/search/filter-options';
import {
  type ListingsFilterValues,
  applyLocationIntent,
  areEquivalentSearchTexts,
  buildListingsHref,
  clearStructuredLocationFilter,
  countActiveListingsFilters,
  getListingsRangeValidationError,
  hasStructuredLocationFilter,
} from '../features/search/listings-query';
import type { GeographySuggestion } from '../lib/geography';
import { fetchLocationSuggestions } from '../lib/geography';

interface LocationAutocompleteProps {
  compact?: boolean;
  inputId: string;
  inputValue: string;
  label: string;
  onChange: (value: string) => void;
  onPickSuggestion: (suggestion: GeographySuggestion) => void;
}

interface FiltersFormProps {
  compact?: boolean;
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

const applyLocationSuggestion = (
  state: ListingsFilterValues,
  suggestion: GeographySuggestion,
): ListingsFilterValues => applyLocationIntent(state, suggestion.locationIntent, suggestion.label);

function MobileFiltersSheet({
  activeFiltersCount,
  children,
  onClose,
  open,
}: {
  activeFiltersCount: number;
  children: ReactNode;
  onClose: () => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)} open={open}>
      <DialogContent
        aria-describedby="mobile-filters-description"
        className={cn(
          '[&>button]:hidden lg:hidden',
          'left-0 right-0 top-auto bottom-0 h-[min(92dvh,52rem)] w-full max-w-none translate-x-0 translate-y-0',
          'rounded-t-[28px] rounded-b-none border-x-0 border-b-0 bg-[var(--color-surface-overlay-strong)] p-0 shadow-[0_-18px_44px_rgb(14_10_12_/_0.2)]',
          'data-[state=closed]:translate-y-8 data-[state=closed]:scale-100 data-[state=open]:translate-y-0',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-11 rounded-full bg-[color:color-mix(in_srgb,var(--color-text-muted)_28%,transparent)]" />

        <header className="sticky top-0 z-20 border-b border-[color:color-mix(in_srgb,var(--color-border)_84%,white_16%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_95%,white_5%)] px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-semibold tracking-tight text-[var(--color-text)]">
                Filtri ricerca
              </DialogTitle>
              <DialogDescription
                className="text-[0.82rem] leading-5 text-[var(--color-text-muted)]"
                id="mobile-filters-description"
              >
                Posizione, tipologia, razza, prezzo ed eta.
              </DialogDescription>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {activeFiltersCount > 0 ? (
                <Badge className="h-8 shrink-0 rounded-full px-2.5 text-xs" variant="outline">
                  {activeFiltersCount}
                </Badge>
              ) : null}
              <DialogClose asChild>
                <button
                  aria-label="Chiudi filtri"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
                  type="button"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LocationAutocomplete({
  compact = false,
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

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchLocationSuggestions(normalizedQuery, 8)
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
        <span
          className={cn(
            'text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]',
            compact ? 'text-[0.68rem]' : '',
          )}
        >
          {label}
        </span>
        <div className="relative">
          <MapPin
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            className={cn(
              'w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-10 text-[var(--color-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]',
              compact ? 'h-12 rounded-[18px] text-base' : 'h-11 rounded-2xl text-sm',
            )}
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
        <div
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden border border-[color:color-mix(in_srgb,var(--color-border)_78%,white_22%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_92%,white_8%)] shadow-[0_24px_54px_rgb(66_40_49_/_0.16)] backdrop-blur-xl',
            compact ? 'rounded-[18px]' : 'rounded-[22px]',
          )}
        >
          <div className={cn('max-h-72 overflow-y-auto', compact ? 'p-1.5' : 'p-2')}>
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
                    className={cn(
                      'flex w-full flex-col text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)]',
                      compact ? 'rounded-[16px] px-3.5 py-3' : 'rounded-[18px] px-3 py-3',
                    )}
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
  onReset,
  onSubmit,
  pending,
  setState,
  state,
  validationError,
}: FiltersFormProps) {
  const qInputId = useId();
  const locationInputId = useId();

  const activeFiltersCount = useMemo(() => countActiveListingsFilters(state), [state]);

  const containerClassName = compact
    ? 'space-y-4'
    : 'space-y-5 rounded-[30px] border border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)] p-5 shadow-[0_18px_52px_rgb(66_40_49_/_0.08)]';
  const labelClassName =
    'text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]';
  const textInputClassName =
    'h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]';
  const mobileFieldClassName =
    'h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base text-[var(--color-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]';
  const selectClassName = 'w-full';
  const [openCompositePopover, setOpenCompositePopover] = useState<'price' | 'age' | null>(null);
  const [compositePopoverPlacement, setCompositePopoverPlacement] = useState<'bottom' | 'top'>(
    'bottom',
  );
  const priceFieldRef = useRef<HTMLDivElement>(null);
  const ageFieldRef = useRef<HTMLDivElement>(null);
  const compositePopoverRef = useRef<HTMLDivElement>(null);
  const priceRangeLabel = buildPriceRangeLabel(state.priceMin, state.priceMax);
  const ageRangeLabel = buildAgeRangeLabel(state.ageMinMonths, state.ageMaxMonths);
  const priceMinOptions = PRICE_FILTER_OPTIONS.map((option) => ({
    ...option,
    label: option.value ? `Da ${option.label}` : option.label,
  }));
  const priceMaxOptions = PRICE_FILTER_OPTIONS.map((option) => ({
    ...option,
    label: option.value ? `Fino a ${option.label}` : option.label,
  }));
  const ageMinOptions = AGE_FILTER_OPTIONS.map((option) => ({
    ...option,
    label: option.value ? `Da ${option.label}` : option.label,
  }));
  const ageMaxOptions = AGE_FILTER_OPTIONS.map((option) => ({
    ...option,
    label: option.value ? `Fino a ${option.label}` : option.label,
  }));

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

  if (compact) {
    return (
      <form className={containerClassName} onSubmit={onFormSubmit}>
        <p className={labelClassName}>Ricerca e filtri</p>

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
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
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

        <div className="space-y-3.5">
          <label className="space-y-2" htmlFor={qInputId}>
            <span className={labelClassName}>Cerca</span>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                className={cn(textInputClassName, mobileFieldClassName, 'pl-10')}
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
            compact
            inputId={locationInputId}
            inputValue={state.locationQuery}
            label="Dove"
            onChange={(value) =>
              setState((currentState) => {
                const shouldClearStructuredLocation = !areEquivalentSearchTexts(
                  value,
                  currentState.locationLabel,
                );

                return {
                  ...(shouldClearStructuredLocation
                    ? clearStructuredLocationFilter(currentState)
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <span className={labelClassName}>Tipologia</span>
              <FilterSelect
                className="w-full min-h-12"
                compact
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
                className="w-full min-h-12"
                compact
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
              className="w-full min-h-12"
              compact
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className={labelClassName}>Intervallo prezzo</p>
              {(state.priceMin !== null || state.priceMax !== null) && (
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
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FilterSelect
                className={selectClassName}
                compact
                onChange={(value) =>
                  setState((currentState) => ({
                    ...currentState,
                    priceMin: numberOrNull(value),
                  }))
                }
                options={priceMinOptions}
                value={state.priceMin !== null ? String(state.priceMin) : ''}
              />
              <FilterSelect
                className={selectClassName}
                compact
                onChange={(value) =>
                  setState((currentState) => ({
                    ...currentState,
                    priceMax: numberOrNull(value),
                  }))
                }
                options={priceMaxOptions}
                value={state.priceMax !== null ? String(state.priceMax) : ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className={labelClassName}>Intervallo eta</p>
              {(state.ageMinMonths !== null || state.ageMaxMonths !== null) && (
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
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FilterSelect
                className={selectClassName}
                compact
                onChange={(value) =>
                  setState((currentState) => ({
                    ...currentState,
                    ageMinMonths: numberOrNull(value),
                  }))
                }
                options={ageMinOptions}
                value={state.ageMinMonths !== null ? String(state.ageMinMonths) : ''}
              />
              <FilterSelect
                className={selectClassName}
                compact
                onChange={(value) =>
                  setState((currentState) => ({
                    ...currentState,
                    ageMaxMonths: numberOrNull(value),
                  }))
                }
                options={ageMaxOptions}
                value={state.ageMaxMonths !== null ? String(state.ageMaxMonths) : ''}
              />
            </div>
          </div>
        </div>

        {validationError ? (
          <p className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border-strong)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_72%,transparent)] px-4 py-3 text-sm text-[var(--color-text)]">
            {validationError}
          </p>
        ) : null}

        <div className="sticky bottom-0 z-10 border-t border-[color:color-mix(in_srgb,var(--color-border)_82%,white_18%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_94%,white_6%)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              {activeFiltersCount === 0 ? 'Nessun filtro attivo' : `${activeFiltersCount} filtri attivi`}
            </p>
            {activeFiltersCount > 0 ? (
              <Badge className="h-7 rounded-full px-2 text-xs" variant="outline">
                {activeFiltersCount}
              </Badge>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-11 gap-2" onClick={onReset} type="button" variant="secondary">
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Azzera
            </Button>
            <Button className="h-11 gap-2" disabled={pending} type="submit">
              <Search aria-hidden="true" className="h-4 w-4" />
              {pending ? 'Aggiorno...' : 'Applica'}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form className={containerClassName} onSubmit={onFormSubmit}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
            Affina la ricerca
          </p>
          {activeFiltersCount > 0 ? (
            <Badge className="shrink-0" variant="outline">
              {activeFiltersCount} filtri
            </Badge>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">
          Testo, localita, prezzo e caratteristiche principali.
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
              const shouldClearStructuredLocation = !areEquivalentSearchTexts(
                value,
                currentState.locationLabel,
              );

              return {
                ...(shouldClearStructuredLocation
                  ? clearStructuredLocationFilter(currentState)
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
    </form>
  );
}

function useListingsFilterState(initialValues: ListingsFilterValues) {
  const router = useRouter();
  const [state, setState] = useState<ListingsFilterValues>(initialValues);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
      return clearStructuredLocationFilter({
        ...currentState,
        locationQuery: '',
      });
    }

    if (
      hasStructuredLocationFilter(currentState) &&
      areEquivalentSearchTexts(normalizedQuery, currentState.locationLabel)
    ) {
      return currentState;
    }

    if (normalizedQuery.length < 2) {
      setValidationError('Inserisci almeno 2 lettere per la localita oppure svuota il campo.');
      return null;
    }

    try {
      const suggestions = await fetchLocationSuggestions(normalizedQuery, 1);
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

  const submitState = async (nextState: ListingsFilterValues) => {
    setValidationError(null);

    const rangeValidationError = getListingsRangeValidationError(nextState);
    if (rangeValidationError) {
      setValidationError(rangeValidationError);
      return false;
    }

    const resolvedState = await resolveLocationBeforeSubmit(nextState);
    if (!resolvedState) {
      return false;
    }

    setState(resolvedState);
    pushHref(buildListingsHref(resolvedState, { page: 1 }));
    return true;
  };

  const submit = async () => submitState(stateRef.current);

  const updateAndSubmit = async (
    updater: (currentState: ListingsFilterValues) => ListingsFilterValues,
  ) => submitState(updater(stateRef.current));

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
    pushHref(buildListingsHref(nextState, { page: 1 }));
  };

  return {
    changeSort,
    pending,
    reset,
    setState,
    state,
    submit,
    updateAndSubmit,
    validationError,
  };
}

export function ListingsFiltersSidebar({ initialValues }: ListingsFiltersSidebarProps) {
  const { pending, reset, setState, state, submit, validationError } =
    useListingsFilterState(initialValues);

  return (
    <aside className="hidden lg:block lg:self-start">
      <div className="sticky top-[calc(var(--shell-header-height)+0.5rem)] xl:top-[calc(var(--shell-header-height)+0.75rem)]">
        <div className="max-h-[calc(100dvh-var(--shell-header-height)-1rem)] overflow-y-auto overscroll-contain pb-2 pr-1 xl:max-h-[calc(100dvh-var(--shell-header-height)-1.5rem)]">
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
  const mobileActiveFiltersCount = useMemo(() => countActiveListingsFilters(state), [state]);

  const closeMobileFilters = () => {
    setMobileFiltersOpen(false);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('button[data-mobile-filters-trigger="true"]')?.focus();
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4 rounded-[28px] border border-[color:color-mix(in_srgb,var(--color-border)_82%,white_18%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_84%,white_16%)] px-4 py-4 shadow-[0_18px_48px_rgb(66_40_49_/_0.08)] sm:px-5 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-[1.35rem] font-semibold tracking-tight text-[var(--color-text)]">
              {new Intl.NumberFormat('it-IT').format(totalCount)} annunci trovati
            </h2>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              Pagina {page}/{Math.max(totalPages, 1)} - Visibili{' '}
              {new Intl.NumberFormat('it-IT').format(resultsCount)}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:w-auto lg:justify-end">
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto lg:hidden">
              <Button
                className="h-11 flex-1 gap-2 rounded-full px-4 sm:flex-initial"
                data-mobile-filters-trigger="true"
                onClick={() => setMobileFiltersOpen(true)}
                type="button"
                variant="secondary"
              >
                <Filter aria-hidden="true" className="h-4 w-4" />
                Filtri
                {mobileActiveFiltersCount > 0 ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 text-xs font-semibold text-[var(--color-text)]">
                    {mobileActiveFiltersCount}
                  </span>
                ) : null}
              </Button>
              <Button
                className="h-11 flex-1 rounded-full px-4 sm:flex-initial"
                onClick={reset}
                type="button"
                variant="outline"
              >
                Reset
              </Button>
            </div>

            <div className="w-full space-y-1.5 sm:w-auto">
              <span className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5" />
                Ordina per
              </span>
              <FilterSelect
                className="w-full min-w-0 sm:min-w-[220px]"
                onChange={(value) => changeSort(value as SearchSort)}
                options={SORT_OPTIONS}
                value={state.sort}
              />
            </div>
          </div>
        </div>

      </div>

      <MobileFiltersSheet
        activeFiltersCount={mobileActiveFiltersCount}
        onClose={closeMobileFilters}
        open={mobileFiltersOpen}
      >
        <FiltersForm
          compact
          onReset={reset}
          onSubmit={() => {
            void submit().then((success) => {
              if (success) {
                closeMobileFilters();
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
