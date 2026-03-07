'use client';

import type { LocationIntent, SearchSort } from '@adottaungatto/types';
import {
  Badge,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
} from '@adottaungatto/ui';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AGE_FILTER_OPTIONS,
  BOOLEAN_FILTER_OPTIONS,
  BREEDS,
  booleanOrNull,
  booleanToFilterValue,
  type FilterOption,
  LISTING_TYPES,
  PRICE_FILTER_OPTIONS,
  SEX_OPTIONS,
  SORT_OPTIONS,
  buildPriceRangeLabel,
  optionLabel,
} from '../features/search/filter-options';
import {
  areEquivalentSearchTexts,
  buildListingsFilters,
  buildListingsHref,
  countActiveListingsFilters,
  getListingsRangeValidationError,
} from '../features/search/listings-query';
import type { GeographySuggestion } from '../lib/geography';
import { fetchLocationSuggestions } from '../lib/geography';

type AgeUnit = 'months' | 'years';
type PopoverKey = 'breed' | 'comune' | 'listingType' | 'sex' | 'sort' | 'prezzo' | 'eta';

interface SearchState {
  q: string;
  breed: string;
  listingType: string;
  sex: string;
  isSterilized: boolean | null;
  isVaccinated: boolean | null;
  hasMicrochip: boolean | null;
  compatibleWithChildren: boolean | null;
  compatibleWithOtherAnimals: boolean | null;
  ageMinValue: string;
  ageMinUnit: AgeUnit;
  ageMaxValue: string;
  ageMaxUnit: AgeUnit;
  locationIntent: LocationIntent | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: SearchSort;
}

interface RicercaProps {
  showHeader?: boolean;
}

interface PopoverProps {
  children: ReactNode;
  parentRef: RefObject<HTMLElement | null>;
  open: boolean;
  minWidth?: number;
  maxWidth?: number;
  matchTriggerWidth?: boolean;
  scrollable?: boolean;
}

interface MobileSheetProps {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
}

const initialState: SearchState = {
  q: '',
  breed: '',
  listingType: '',
  sex: '',
  isSterilized: null,
  isVaccinated: null,
  hasMicrochip: null,
  compatibleWithChildren: null,
  compatibleWithOtherAnimals: null,
  ageMinValue: '',
  ageMinUnit: 'months',
  ageMaxValue: '',
  ageMaxUnit: 'years',
  locationIntent: null,
  priceMin: null,
  priceMax: null,
  sort: 'relevance',
};

const parseAgeAmount = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const toAgeMonths = (value: string, unit: AgeUnit): number | null => {
  const amount = parseAgeAmount(value);
  if (amount === null) {
    return null;
  }

  return unit === 'years' ? amount * 12 : amount;
};

const formatAgeValue = (value: string, unit: AgeUnit) => {
  const amount = parseAgeAmount(value);
  if (amount === null) {
    return '';
  }

  if (unit === 'years') {
    return `${amount} ${amount === 1 ? 'anno' : 'anni'}`;
  }

  return `${amount} ${amount === 1 ? 'mese' : 'mesi'}`;
};

const buildAgeLabel = (search: SearchState) => {
  const minLabel = formatAgeValue(search.ageMinValue, search.ageMinUnit);
  const maxLabel = formatAgeValue(search.ageMaxValue, search.ageMaxUnit);

  if (!minLabel && !maxLabel) {
    return 'Qualsiasi età';
  }

  if (minLabel && maxLabel) {
    return `${minLabel} - ${maxLabel}`;
  }

  return minLabel ? `Da ${minLabel}` : `Fino a ${maxLabel}`;
};

function Popover({
  children,
  parentRef,
  open,
  minWidth = 220,
  maxWidth = 380,
  matchTriggerWidth = false,
  scrollable = true,
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState({
    top: 0,
    left: 0,
    maxHeight: 320,
    width: null as number | null,
    maxAllowedWidth: maxWidth,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open || !parentRef.current || !popoverRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!parentRef.current || !popoverRef.current) {
        return;
      }

      const triggerRect = parentRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 8;
      const margin = 12;
      const maxAllowedWidth = Math.min(maxWidth, viewportWidth - margin * 2);
      const measuredWidth = popoverRef.current.offsetWidth || minWidth;
      const width = matchTriggerWidth
        ? Math.min(Math.max(triggerRect.width, minWidth), maxAllowedWidth)
        : Math.min(Math.max(measuredWidth, minWidth), maxAllowedWidth);

      let left = triggerRect.left;
      if (left + width > viewportWidth - margin) {
        left = viewportWidth - width - margin;
      }
      left = Math.max(margin, left);

      const top = triggerRect.bottom + gap;
      const availableBelow = Math.max(120, viewportHeight - top - margin);

      setLayout({
        top,
        left,
        maxHeight: availableBelow,
        width: matchTriggerWidth ? width : null,
        maxAllowedWidth,
      });
    };

    updatePosition();

    const rafId = window.requestAnimationFrame(updatePosition);
    const delayedId = window.setTimeout(updatePosition, 180);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(delayedId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [matchTriggerWidth, maxWidth, minWidth, mounted, open, parentRef]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      data-test-popover="true"
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${layout.top}px`,
        left: `${layout.left}px`,
        zIndex: 1000,
        minWidth: `${Math.min(minWidth, layout.maxAllowedWidth)}px`,
        maxWidth: `${layout.maxAllowedWidth}px`,
        width: layout.width ? `${layout.width}px` : undefined,
        maxHeight: `${layout.maxHeight}px`,
        overflowX: 'hidden',
        overflowY: scrollable ? 'auto' : 'hidden',
        overscrollBehavior: 'contain',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        background: 'var(--color-surface-overlay-strong)',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(24px)',
        animation: 'fadeInScale 0.24s ease-out',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function MobileSheet({ children, description, onClose, open, title }: MobileSheetProps) {
  const descriptionId = useId();

  return (
    <Dialog onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)} open={open}>
      <DialogContent
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          '[&>button]:hidden lg:hidden',
          'left-0 right-0 top-auto bottom-0 h-[min(92dvh,52rem)] w-full max-w-none translate-x-0 translate-y-0',
          'rounded-t-[28px] rounded-b-none border-x-0 border-b-0 bg-[var(--color-surface-overlay-strong)] p-0 shadow-[0_-18px_44px_rgb(14_10_12_/_0.2)]',
          'data-[state=closed]:translate-y-8 data-[state=closed]:scale-100 data-[state=open]:translate-y-0',
        )}
      >
        <section
          aria-label={title}
          className="flex h-full min-h-0 flex-col"
          data-test-mobile-sheet="true"
        >
          <div className="mobile-sheet-handle" />
          <header className="mobile-sheet-header">
            <div className="mobile-sheet-heading">
              <DialogTitle className="mobile-sheet-title">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mobile-sheet-description" id={descriptionId}>
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            <DialogClose asChild>
              <button
                aria-label={`Chiudi ${title.toLowerCase()}`}
                className="mobile-sheet-close"
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 8l8 8M16 8l-8 8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.9"
                  />
                </svg>
              </button>
            </DialogClose>
          </header>

          <div className="mobile-sheet-body">{children}</div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function MobileFilterSelect({
  ariaLabel,
  className,
  disabled = false,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: ReadonlyArray<FilterOption>;
  value: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedLabel = optionLabel(options, value);

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
    if (!open) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          'platform-select platform-select-trigger',
          open ? 'platform-select-open' : '',
        )}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
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
        <div className="platform-select-menu platform-select-menu-inline" role="presentation">
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

export default function Ricerca({ showHeader = true }: RicercaProps) {
  const router = useRouter();
  const [search, setSearch] = useState<SearchState>(initialState);
  const [expanded, setExpanded] = useState(false);
  const [isCompactSearchLayout, setIsCompactSearchLayout] = useState(false);
  const [openPopover, setOpenPopover] = useState<PopoverKey | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<GeographySuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const qInputId = useId();
  const locationInputId = useId();
  const ageMinInputId = useId();
  const ageMaxInputId = useId();

  const breedRef = useRef<HTMLButtonElement>(null);
  const locationRef = useRef<HTMLLabelElement>(null);
  const mobileLocationRef = useRef<HTMLButtonElement>(null);
  const listingTypeRef = useRef<HTMLButtonElement>(null);
  const sexRef = useRef<HTMLButtonElement>(null);
  const ageRef = useRef<HTMLButtonElement>(null);
  const priceRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);

  const activeLocationLabel = search.locationIntent?.label ?? '';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const syncLayoutMode = () => {
      setIsCompactSearchLayout(mediaQuery.matches);
    };

    syncLayoutMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncLayoutMode);
      return () => {
        mediaQuery.removeEventListener('change', syncLayoutMode);
      };
    }

    mediaQuery.addListener(syncLayoutMode);
    return () => {
      mediaQuery.removeListener(syncLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (openPopover !== 'comune') {
      return;
    }

    const normalizedQuery = locationQuery.trim();
    if (normalizedQuery.length < 2) {
      setLocationSuggestions([]);
      setLocationError(null);
      setLocationLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLocationLoading(true);
      setLocationError(null);

      try {
        const suggestions = await fetchLocationSuggestions(normalizedQuery, 8);
        if (!cancelled) {
          setLocationSuggestions(suggestions);
        }
      } catch {
        if (!cancelled) {
          setLocationSuggestions([]);
          setLocationError('Impossibile recuperare suggerimenti località.');
        }
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [locationQuery, openPopover]);

  useEffect(() => {
    if (!openPopover) {
      return;
    }

    const activeRef =
      openPopover === 'breed'
        ? breedRef
        : openPopover === 'comune'
          ? isCompactSearchLayout
            ? mobileLocationRef
            : locationRef
          : openPopover === 'listingType'
            ? listingTypeRef
            : openPopover === 'sex'
              ? sexRef
              : openPopover === 'eta'
                ? ageRef
                : openPopover === 'prezzo'
                  ? priceRef
                  : sortRef;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (activeRef.current?.contains(target)) {
        return;
      }

      const layers = document.querySelectorAll(
        '[data-test-popover="true"], [data-test-mobile-sheet="true"]',
      );
      for (const layer of layers) {
        if (layer.contains(target)) {
          return;
        }
      }

      setOpenPopover(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isCompactSearchLayout, openPopover]);

  const breedLabel = optionLabel(BREEDS, search.breed);
  const listingTypeLabel = optionLabel(LISTING_TYPES, search.listingType);
  const sexLabel = optionLabel(SEX_OPTIONS, search.sex);
  const sortLabel = optionLabel(SORT_OPTIONS, search.sort);
  const ageLabel = buildAgeLabel(search);
  const prezzoLabel = buildPriceRangeLabel(search.priceMin, search.priceMax);
  const locationDisplayValue = locationQuery.trim() || activeLocationLabel;
  const hasLocationValue = locationDisplayValue.length > 0;

  const activeFiltersCount =
    countActiveListingsFilters(
      buildListingsFilters({
        q: search.q,
        listingType: search.listingType,
        sex: search.sex,
        breed: search.breed,
        isSterilized: search.isSterilized,
        isVaccinated: search.isVaccinated,
        hasMicrochip: search.hasMicrochip,
        compatibleWithChildren: search.compatibleWithChildren,
        compatibleWithOtherAnimals: search.compatibleWithOtherAnimals,
        ageMinMonths: toAgeMonths(search.ageMinValue, search.ageMinUnit),
        ageMaxMonths: toAgeMonths(search.ageMaxValue, search.ageMaxUnit),
        priceMin: search.priceMin,
        priceMax: search.priceMax,
        sort: search.sort,
        locationIntent: search.locationIntent,
        locationQuery: search.locationIntent ? locationQuery : '',
      }),
    ) + (search.sort !== 'relevance' ? 1 : 0);

  const setField = <K extends keyof SearchState>(key: K, value: SearchState[K]) => {
    setSearch((currentSearch) => ({
      ...currentSearch,
      [key]: value,
    }));
  };

  const getAgeBoundaryMonths = (boundary: 'min' | 'max', state: SearchState = search) =>
    boundary === 'min'
      ? toAgeMonths(state.ageMinValue, state.ageMinUnit)
      : toAgeMonths(state.ageMaxValue, state.ageMaxUnit);

  const setPriceBoundary = (boundary: 'min' | 'max', rawValue: string) => {
    const nextValue = rawValue ? Number(rawValue) : null;

    setSearch((currentSearch) => {
      let nextPriceMin = boundary === 'min' ? nextValue : currentSearch.priceMin;
      let nextPriceMax = boundary === 'max' ? nextValue : currentSearch.priceMax;

      if (nextPriceMin !== null && nextPriceMax !== null && nextPriceMin > nextPriceMax) {
        if (boundary === 'min') {
          nextPriceMax = null;
        } else {
          nextPriceMin = null;
        }
      }

      return {
        ...currentSearch,
        priceMin: nextPriceMin,
        priceMax: nextPriceMax,
      };
    });
  };

  const setAgeBoundary = (boundary: 'min' | 'max', rawValue: string) => {
    const nextMonths = rawValue ? Number.parseInt(rawValue, 10) : null;

    setSearch((currentSearch) => {
      let nextMinMonths = getAgeBoundaryMonths('min', currentSearch);
      let nextMaxMonths = getAgeBoundaryMonths('max', currentSearch);

      if (boundary === 'min') {
        nextMinMonths = nextMonths;
      } else {
        nextMaxMonths = nextMonths;
      }

      if (nextMinMonths !== null && nextMaxMonths !== null && nextMinMonths > nextMaxMonths) {
        if (boundary === 'min') {
          nextMaxMonths = null;
        } else {
          nextMinMonths = null;
        }
      }

      return {
        ...currentSearch,
        ageMinValue:
          nextMinMonths === null
            ? ''
            : nextMinMonths >= 12 && nextMinMonths % 12 === 0
              ? String(nextMinMonths / 12)
              : String(nextMinMonths),
        ageMinUnit:
          nextMinMonths !== null && nextMinMonths >= 12 && nextMinMonths % 12 === 0
            ? 'years'
            : 'months',
        ageMaxValue:
          nextMaxMonths === null
            ? ''
            : nextMaxMonths >= 12 && nextMaxMonths % 12 === 0
              ? String(nextMaxMonths / 12)
              : String(nextMaxMonths),
        ageMaxUnit:
          nextMaxMonths !== null && nextMaxMonths >= 12 && nextMaxMonths % 12 === 0
            ? 'years'
            : 'months',
      };
    });
  };

  const resetPriceFilters = () => {
    setField('priceMin', null);
    setField('priceMax', null);
  };

  const resetAgeFilters = () => {
    setSearch((currentSearch) => ({
      ...currentSearch,
      ageMinValue: '',
      ageMinUnit: 'months',
      ageMaxValue: '',
      ageMaxUnit: 'years',
    }));
  };

  const updateLocationQuery = (nextValue: string) => {
    setLocationQuery(nextValue);
    setSearch((currentSearch) => {
      if (
        currentSearch.locationIntent &&
        !areEquivalentSearchTexts(nextValue, currentSearch.locationIntent.label ?? '')
      ) {
        return {
          ...currentSearch,
          locationIntent: null,
        };
      }

      return currentSearch;
    });
  };

  const selectLocation = (suggestion: GeographySuggestion) => {
    setSearch((currentSearch) => ({
      ...currentSearch,
      locationIntent: suggestion.locationIntent,
    }));
    setLocationQuery(suggestion.label);
    setLocationSuggestions([]);
    setOpenPopover(null);
  };

  const runSearch = async () => {
    setValidationError(null);

    let effectiveSearch = search;
    let fallbackLocationLabel: string | null = null;
    const normalizedLocationQuery = locationQuery.trim();

    if (!effectiveSearch.locationIntent && normalizedLocationQuery.length >= 2) {
      fallbackLocationLabel = normalizedLocationQuery;

      try {
        const resolvedSuggestions = await fetchLocationSuggestions(normalizedLocationQuery, 1);
        const bestMatch = resolvedSuggestions[0];

        if (bestMatch) {
          effectiveSearch = {
            ...effectiveSearch,
            locationIntent: bestMatch.locationIntent,
          };

          fallbackLocationLabel = null;

          setSearch((currentSearch) => ({
            ...currentSearch,
            locationIntent: bestMatch.locationIntent,
          }));
          setLocationQuery(bestMatch.label);
        }
      } catch {
        // Preserve the free-text location fallback when autocomplete is unavailable.
      }
    }

    const ageMinMonths = toAgeMonths(effectiveSearch.ageMinValue, effectiveSearch.ageMinUnit);
    const ageMaxMonths = toAgeMonths(effectiveSearch.ageMaxValue, effectiveSearch.ageMaxUnit);

    const rangeValidationError = getListingsRangeValidationError({
      ageMaxMonths,
      ageMinMonths,
      priceMax: effectiveSearch.priceMax,
      priceMin: effectiveSearch.priceMin,
    });
    if (rangeValidationError) {
      setValidationError(rangeValidationError);
      return;
    }

    const listingsFilters = buildListingsFilters({
      q: effectiveSearch.q,
      listingType: effectiveSearch.listingType,
      sex: effectiveSearch.sex,
      breed: effectiveSearch.breed,
      isSterilized: effectiveSearch.isSterilized,
      isVaccinated: effectiveSearch.isVaccinated,
      hasMicrochip: effectiveSearch.hasMicrochip,
      compatibleWithChildren: effectiveSearch.compatibleWithChildren,
      compatibleWithOtherAnimals: effectiveSearch.compatibleWithOtherAnimals,
      ageMinMonths,
      ageMaxMonths,
      priceMin: effectiveSearch.priceMin,
      priceMax: effectiveSearch.priceMax,
      sort: effectiveSearch.sort,
      locationIntent: effectiveSearch.locationIntent,
      locationQuery: effectiveSearch.locationIntent
        ? normalizedLocationQuery
        : (fallbackLocationLabel ?? ''),
      locationLabelFallback: fallbackLocationLabel,
    });

    router.push(buildListingsHref(listingsFilters, { page: 1 }));
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch();
  };

  const onFieldButtonClick = (key: PopoverKey) => {
    setOpenPopover((currentPopover) => (currentPopover === key ? null : key));
  };

  const openLocationPopover = () => {
    if (!locationQuery && activeLocationLabel) {
      setLocationQuery(activeLocationLabel);
    }

    setOpenPopover('comune');
  };

  const closeMobileSheet = (sheet: 'comune' | 'eta' | 'prezzo') => {
    setOpenPopover(null);

    window.requestAnimationFrame(() => {
      if (sheet === 'comune') {
        mobileLocationRef.current?.focus();
        return;
      }

      if (sheet === 'eta') {
        ageRef.current?.focus();
        return;
      }

      priceRef.current?.focus();
    });
  };

  const renderLocationSuggestions = (compact = false) => (
    <div className={cn('location-popover', compact ? 'location-popover-mobile' : '')}>
      {compact ? (
        <label className="filter-field-group" htmlFor={`${locationInputId}-sheet`}>
          <span className="location-label">Località</span>
          <input
            className="location-input"
            id={`${locationInputId}-sheet`}
            onChange={(event) => updateLocationQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                setOpenPopover(null);
                void runSearch();
              }
            }}
            placeholder="Città, provincia o regione"
            type="text"
            value={locationQuery}
          />
        </label>
      ) : (
        <p className="location-label">Suggerimenti località</p>
      )}
      {locationLoading ? <p className="location-meta">Cerco suggerimenti...</p> : null}
      {locationError ? <p className="location-meta location-meta-error">{locationError}</p> : null}

      {!locationLoading && !locationError && locationQuery.trim().length >= 2 ? (
        <div className="popover-list location-results">
          {locationSuggestions.length > 0 ? (
            locationSuggestions.map((suggestion) => (
              <button
                className="popover-list-item"
                key={`${suggestion.type}-${suggestion.id}`}
                onClick={() => selectLocation(suggestion)}
                type="button"
              >
                <span className="location-result-title">{suggestion.label}</span>
                {suggestion.secondaryLabel ? (
                  <span className="location-result-subtitle">{suggestion.secondaryLabel}</span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="location-meta">Nessun suggerimento trovato.</p>
          )}
        </div>
      ) : null}

      {!locationLoading && !locationError && locationQuery.trim().length < 2 ? (
        <p className="location-meta">Scrivi almeno 2 lettere per vedere i suggerimenti.</p>
      ) : null}
    </div>
  );

  const renderPriceFilters = () => (
    <div className="price-popover">
      <div className="filter-grid">
        <div className="filter-field-group">
          {isCompactSearchLayout ? (
            <span className="location-label">Prezzo minimo</span>
          ) : (
            <label className="location-label" htmlFor="price-min">
              Prezzo minimo
            </label>
          )}
          {isCompactSearchLayout ? (
            <MobileFilterSelect
              ariaLabel="Prezzo minimo"
              className="w-full"
              onChange={(nextValue) => setPriceBoundary('min', nextValue)}
              options={PRICE_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.value ? `Da ${option.label}` : option.label,
              }))}
              value={search.priceMin !== null ? String(search.priceMin) : ''}
            />
          ) : (
            <select
              className="platform-select"
              id="price-min"
              onChange={(event) => setPriceBoundary('min', event.target.value)}
              value={search.priceMin !== null ? String(search.priceMin) : ''}
            >
              {PRICE_FILTER_OPTIONS.map((option) => (
                <option key={`price-min-${option.value || 'none'}`} value={option.value}>
                  {option.value ? `Da ${option.label}` : option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="filter-field-group">
          {isCompactSearchLayout ? (
            <span className="location-label">Prezzo massimo</span>
          ) : (
            <label className="location-label" htmlFor="price-max">
              Prezzo massimo
            </label>
          )}
          {isCompactSearchLayout ? (
            <MobileFilterSelect
              ariaLabel="Prezzo massimo"
              className="w-full"
              onChange={(nextValue) => setPriceBoundary('max', nextValue)}
              options={PRICE_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.value ? `Fino a ${option.label}` : option.label,
              }))}
              value={search.priceMax !== null ? String(search.priceMax) : ''}
            />
          ) : (
            <select
              className="platform-select"
              id="price-max"
              onChange={(event) => setPriceBoundary('max', event.target.value)}
              value={search.priceMax !== null ? String(search.priceMax) : ''}
            >
              {PRICE_FILTER_OPTIONS.map((option) => (
                <option key={`price-max-${option.value || 'none'}`} value={option.value}>
                  {option.value ? `Fino a ${option.label}` : option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="filter-reset-row">
        <button className="filter-reset-btn" onClick={resetPriceFilters} type="button">
          Azzera
        </button>
      </div>
    </div>
  );

  const renderAgeFilters = () => (
    <div className="age-popover">
      <div className="filter-grid">
        <div className="filter-field-group">
          {isCompactSearchLayout ? (
            <span className="location-label">Età minima</span>
          ) : (
            <label className="location-label" htmlFor={ageMinInputId}>
              Età minima
            </label>
          )}
          {isCompactSearchLayout ? (
            <MobileFilterSelect
              ariaLabel="Età minima"
              className="w-full"
              onChange={(nextValue) => setAgeBoundary('min', nextValue)}
              options={AGE_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.value ? `Da ${option.label}` : option.label,
              }))}
              value={
                getAgeBoundaryMonths('min') !== null ? String(getAgeBoundaryMonths('min')) : ''
              }
            />
          ) : (
            <select
              className="platform-select"
              id={ageMinInputId}
              onChange={(event) => setAgeBoundary('min', event.target.value)}
              value={
                getAgeBoundaryMonths('min') !== null ? String(getAgeBoundaryMonths('min')) : ''
              }
            >
              {AGE_FILTER_OPTIONS.map((option) => (
                <option key={`age-min-${option.value || 'none'}`} value={option.value}>
                  {option.value ? `Da ${option.label}` : option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="filter-field-group">
          {isCompactSearchLayout ? (
            <span className="location-label">Età massima</span>
          ) : (
            <label className="location-label" htmlFor={ageMaxInputId}>
              Età massima
            </label>
          )}
          {isCompactSearchLayout ? (
            <MobileFilterSelect
              ariaLabel="Età massima"
              className="w-full"
              onChange={(nextValue) => setAgeBoundary('max', nextValue)}
              options={AGE_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.value ? `Fino a ${option.label}` : option.label,
              }))}
              value={
                getAgeBoundaryMonths('max') !== null ? String(getAgeBoundaryMonths('max')) : ''
              }
            />
          ) : (
            <select
              className="platform-select"
              id={ageMaxInputId}
              onChange={(event) => setAgeBoundary('max', event.target.value)}
              value={
                getAgeBoundaryMonths('max') !== null ? String(getAgeBoundaryMonths('max')) : ''
              }
            >
              {AGE_FILTER_OPTIONS.map((option) => (
                <option key={`age-max-${option.value || 'none'}`} value={option.value}>
                  {option.value ? `Fino a ${option.label}` : option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="filter-reset-row">
        <button className="filter-reset-btn" onClick={resetAgeFilters} type="button">
          Azzera
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="ricerca-container">
        {showHeader ? (
          <div className="ricerca-header">
            <div className="header-badge-wrap">
              <Badge variant="outline">Ricerca avanzata</Badge>
            </div>
            <h1>Trova il prossimo gatto da accogliere.</h1>
            <p>Filtra per località, tipologia, prezzo ed età.</p>
          </div>
        ) : null}

        <form className={`search-row ${expanded ? 'expanded' : ''}`} onSubmit={handleSearchSubmit}>
          <div className={`search-bar-wrapper ${expanded ? 'expanded' : ''}`}>
            <div className="search-bar">
              <label className="search-field" htmlFor={qInputId}>
                <span className="search-field-label">Cerca gatti</span>
                <input
                  className="search-field-input"
                  id={qInputId}
                  onChange={(event) => setField('q', event.target.value)}
                  onFocus={() => setOpenPopover(null)}
                  placeholder="Es. Milano, cucciolo, stallo..."
                  type="text"
                  value={search.q}
                />
              </label>

              {!isCompactSearchLayout ? (
                <button
                  className={`search-field search-field-breed search-field-button ${openPopover === 'breed' ? 'active' : ''}`}
                  onClick={() => onFieldButtonClick('breed')}
                  ref={breedRef}
                  type="button"
                >
                  <span className="search-field-label">Razza</span>
                  <span className="search-field-value">{breedLabel}</span>
                </button>
              ) : null}

              {isCompactSearchLayout ? (
                <button
                  className={`search-field search-field-button search-field-location ${openPopover === 'comune' ? 'active' : ''}`}
                  onClick={openLocationPopover}
                  ref={mobileLocationRef}
                  type="button"
                >
                  <span className="search-field-label">Dove</span>
                  <span
                    className={cn(
                      'search-field-value',
                      hasLocationValue ? '' : 'search-field-value-placeholder',
                    )}
                  >
                    {hasLocationValue ? locationDisplayValue : 'Città, provincia o regione'}
                  </span>
                </button>
              ) : (
                <label
                  className={`search-field search-field-location ${openPopover === 'comune' ? 'active' : ''}`}
                  htmlFor={locationInputId}
                  ref={locationRef}
                >
                  <span className="search-field-label">Dove</span>
                  <input
                    className="search-field-input"
                    id={locationInputId}
                    onChange={(event) => {
                      updateLocationQuery(event.target.value);
                      setOpenPopover('comune');
                    }}
                    onFocus={openLocationPopover}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setOpenPopover(null);
                      }
                    }}
                    placeholder="Città, provincia o regione"
                    type="text"
                    value={locationQuery}
                  />
                </label>
              )}
            </div>

            <div
              className={cn(
                'search-bar-advanced',
                expanded ? 'expanded' : '',
                isCompactSearchLayout ? 'search-bar-advanced-mobile' : '',
              )}
            >
              {isCompactSearchLayout ? (
                <p className="search-advanced-mobile-title">Filtri avanzati</p>
              ) : null}

              <div className="adv-grid">
                {isCompactSearchLayout ? (
                  <div className="search-field advanced-field advanced-field-listing-type advanced-select-field">
                    <span className="search-field-label">Cosa stai cercando?</span>
                    <MobileFilterSelect
                      ariaLabel="Cosa stai cercando?"
                      className="w-full"
                      onChange={(nextValue) => setField('listingType', nextValue)}
                      options={LISTING_TYPES}
                      value={search.listingType}
                    />
                  </div>
                ) : (
                  <button
                    className={`search-field search-field-button advanced-field advanced-field-listing-type ${openPopover === 'listingType' ? 'active' : ''}`}
                    onClick={() => onFieldButtonClick('listingType')}
                    ref={listingTypeRef}
                    type="button"
                  >
                    <span className="search-field-label">Cosa stai cercando?</span>
                    <span className="search-field-value">{listingTypeLabel}</span>
                  </button>
                )}

                {isCompactSearchLayout ? (
                  <div className="search-field advanced-field advanced-field-sex advanced-select-field">
                    <span className="search-field-label">Sesso</span>
                    <MobileFilterSelect
                      ariaLabel="Sesso"
                      className="w-full"
                      onChange={(nextValue) => setField('sex', nextValue)}
                      options={SEX_OPTIONS}
                      value={search.sex}
                    />
                  </div>
                ) : (
                  <button
                    className={`search-field search-field-button advanced-field advanced-field-sex ${openPopover === 'sex' ? 'active' : ''}`}
                    onClick={() => onFieldButtonClick('sex')}
                    ref={sexRef}
                    type="button"
                  >
                    <span className="search-field-label">Sesso</span>
                    <span className="search-field-value">{sexLabel}</span>
                  </button>
                )}

                {isCompactSearchLayout ? (
                  <div className="search-field advanced-field advanced-field-breed advanced-select-field">
                    <span className="search-field-label">Razza</span>
                    <MobileFilterSelect
                      ariaLabel="Razza"
                      className="w-full"
                      onChange={(nextValue) => setField('breed', nextValue)}
                      options={BREEDS}
                      value={search.breed}
                    />
                  </div>
                ) : null}

                <div className="search-field advanced-field advanced-select-field">
                  <span className="search-field-label">Sterilizzato</span>
                  {isCompactSearchLayout ? (
                    <MobileFilterSelect
                      ariaLabel="Sterilizzato"
                      className="w-full"
                      onChange={(nextValue) => setField('isSterilized', booleanOrNull(nextValue))}
                      options={BOOLEAN_FILTER_OPTIONS}
                      value={booleanToFilterValue(search.isSterilized)}
                    />
                  ) : (
                    <select
                      className="platform-select"
                      onChange={(event) => setField('isSterilized', booleanOrNull(event.target.value))}
                      value={booleanToFilterValue(search.isSterilized)}
                    >
                      {BOOLEAN_FILTER_OPTIONS.map((option) => (
                        <option key={`sterilized-${option.value || 'any'}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="search-field advanced-field advanced-select-field">
                  <span className="search-field-label">Vaccinato</span>
                  {isCompactSearchLayout ? (
                    <MobileFilterSelect
                      ariaLabel="Vaccinato"
                      className="w-full"
                      onChange={(nextValue) => setField('isVaccinated', booleanOrNull(nextValue))}
                      options={BOOLEAN_FILTER_OPTIONS}
                      value={booleanToFilterValue(search.isVaccinated)}
                    />
                  ) : (
                    <select
                      className="platform-select"
                      onChange={(event) => setField('isVaccinated', booleanOrNull(event.target.value))}
                      value={booleanToFilterValue(search.isVaccinated)}
                    >
                      {BOOLEAN_FILTER_OPTIONS.map((option) => (
                        <option key={`vaccinated-${option.value || 'any'}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="search-field advanced-field advanced-select-field">
                  <span className="search-field-label">Microchip</span>
                  {isCompactSearchLayout ? (
                    <MobileFilterSelect
                      ariaLabel="Microchip"
                      className="w-full"
                      onChange={(nextValue) => setField('hasMicrochip', booleanOrNull(nextValue))}
                      options={BOOLEAN_FILTER_OPTIONS}
                      value={booleanToFilterValue(search.hasMicrochip)}
                    />
                  ) : (
                    <select
                      className="platform-select"
                      onChange={(event) => setField('hasMicrochip', booleanOrNull(event.target.value))}
                      value={booleanToFilterValue(search.hasMicrochip)}
                    >
                      {BOOLEAN_FILTER_OPTIONS.map((option) => (
                        <option key={`microchip-${option.value || 'any'}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="search-field advanced-field advanced-select-field">
                  <span className="search-field-label">Compatibile bambini</span>
                  {isCompactSearchLayout ? (
                    <MobileFilterSelect
                      ariaLabel="Compatibile con bambini"
                      className="w-full"
                      onChange={(nextValue) =>
                        setField('compatibleWithChildren', booleanOrNull(nextValue))
                      }
                      options={BOOLEAN_FILTER_OPTIONS}
                      value={booleanToFilterValue(search.compatibleWithChildren)}
                    />
                  ) : (
                    <select
                      className="platform-select"
                      onChange={(event) =>
                        setField('compatibleWithChildren', booleanOrNull(event.target.value))
                      }
                      value={booleanToFilterValue(search.compatibleWithChildren)}
                    >
                      {BOOLEAN_FILTER_OPTIONS.map((option) => (
                        <option key={`children-${option.value || 'any'}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="search-field advanced-field advanced-select-field">
                  <span className="search-field-label">Compatibile altri animali</span>
                  {isCompactSearchLayout ? (
                    <MobileFilterSelect
                      ariaLabel="Compatibile con altri animali"
                      className="w-full"
                      onChange={(nextValue) =>
                        setField('compatibleWithOtherAnimals', booleanOrNull(nextValue))
                      }
                      options={BOOLEAN_FILTER_OPTIONS}
                      value={booleanToFilterValue(search.compatibleWithOtherAnimals)}
                    />
                  ) : (
                    <select
                      className="platform-select"
                      onChange={(event) =>
                        setField('compatibleWithOtherAnimals', booleanOrNull(event.target.value))
                      }
                      value={booleanToFilterValue(search.compatibleWithOtherAnimals)}
                    >
                      {BOOLEAN_FILTER_OPTIONS.map((option) => (
                        <option key={`animals-${option.value || 'any'}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  className={`search-field search-field-button advanced-field advanced-field-price ${openPopover === 'prezzo' ? 'active' : ''}`}
                  onClick={() => onFieldButtonClick('prezzo')}
                  ref={priceRef}
                  type="button"
                >
                  <span className="search-field-label">Prezzo</span>
                  <span className="search-field-value">{prezzoLabel}</span>
                </button>

                <button
                  className={`search-field search-field-button advanced-field advanced-field-age ${openPopover === 'eta' ? 'active' : ''}`}
                  onClick={() => onFieldButtonClick('eta')}
                  ref={ageRef}
                  type="button"
                >
                  <span className="search-field-label">Età del gatto</span>
                  <span className="search-field-value">{ageLabel}</span>
                </button>

                {isCompactSearchLayout ? (
                  <div className="search-field advanced-field advanced-field-sort advanced-select-field">
                    <span className="search-field-label">Ordina per</span>
                    <MobileFilterSelect
                      ariaLabel="Ordina per"
                      className="w-full"
                      onChange={(nextValue) => setField('sort', nextValue as SearchSort)}
                      options={SORT_OPTIONS}
                      value={search.sort}
                    />
                  </div>
                ) : (
                  <button
                    className={`search-field search-field-button advanced-field advanced-field-sort ${openPopover === 'sort' ? 'active' : ''}`}
                    onClick={() => onFieldButtonClick('sort')}
                    ref={sortRef}
                    type="button"
                  >
                    <span className="search-field-label">Ordina per</span>
                    <span className="search-field-value">{sortLabel}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="search-actions">
            <button
              aria-label="Filtri avanzati"
              className="search-adv-btn"
              onClick={() => setExpanded((currentValue) => !currentValue)}
              type="button"
            >
              {expanded ? (
                <svg
                  aria-hidden="true"
                  className="search-adv-symbol search-adv-symbol-close"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 8l8 8M16 8l-8 8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="search-adv-symbol"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 7h8M16 7h4M4 17h4M12 17h8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                  <circle cx="14" cy="7" r="2" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="10" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
              <span className="search-action-label">Filtri</span>
              {activeFiltersCount > 0 ? (
                <span className="search-adv-badge">{activeFiltersCount}</span>
              ) : null}
            </button>

            <button aria-label="Cerca" className="search-button" type="submit">
              <svg fill="currentColor" height="16" viewBox="0 0 16 16" width="16">
                <title>Cerca</title>
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
              <span className="search-action-label">Cerca</span>
            </button>
          </div>
        </form>

        {validationError ? <p className="error-message">{validationError}</p> : null}
      </div>

      {!isCompactSearchLayout ? (
        <Popover matchTriggerWidth minWidth={0} open={openPopover === 'breed'} parentRef={breedRef}>
          <div className="popover-list">
            {BREEDS.map((breed) => (
              <button
                className="popover-list-item"
                key={breed.value || 'all-breeds'}
                onClick={() => {
                  setField('breed', breed.value);
                  setOpenPopover(null);
                }}
                type="button"
              >
                {breed.label}
              </button>
            ))}
          </div>
        </Popover>
      ) : null}

      {!isCompactSearchLayout ? (
        <Popover
          matchTriggerWidth
          minWidth={0}
          open={openPopover === 'listingType'}
          parentRef={listingTypeRef}
        >
          <div className="popover-list">
            {LISTING_TYPES.map((listingType) => (
              <button
                className="popover-list-item"
                key={listingType.value || 'all-types'}
                onClick={() => {
                  setField('listingType', listingType.value);
                  setOpenPopover(null);
                }}
                type="button"
              >
                {listingType.label}
              </button>
            ))}
          </div>
        </Popover>
      ) : null}

      {!isCompactSearchLayout ? (
        <Popover matchTriggerWidth minWidth={0} open={openPopover === 'sex'} parentRef={sexRef}>
          <div className="popover-list">
            {SEX_OPTIONS.map((option) => (
              <button
                className="popover-list-item"
                key={option.value || 'any-sex'}
                onClick={() => {
                  setField('sex', option.value);
                  setOpenPopover(null);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </Popover>
      ) : null}

      {!isCompactSearchLayout ? (
        <Popover matchTriggerWidth minWidth={0} open={openPopover === 'sort'} parentRef={sortRef}>
          <div className="popover-list">
            {SORT_OPTIONS.map((option) => (
              <button
                className="popover-list-item"
                key={option.value}
                onClick={() => {
                  setField('sort', option.value);
                  setOpenPopover(null);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </Popover>
      ) : null}

      {!isCompactSearchLayout ? (
        <Popover maxWidth={420} minWidth={340} open={openPopover === 'prezzo'} parentRef={priceRef}>
          {renderPriceFilters()}
        </Popover>
      ) : null}

      {!isCompactSearchLayout ? (
        <Popover maxWidth={420} minWidth={340} open={openPopover === 'eta'} parentRef={ageRef}>
          {renderAgeFilters()}
        </Popover>
      ) : null}

      {isCompactSearchLayout ? (
        <MobileSheet
          description={prezzoLabel}
          onClose={() => closeMobileSheet('prezzo')}
          open={openPopover === 'prezzo'}
          title="Prezzo"
        >
          {renderPriceFilters()}
        </MobileSheet>
      ) : null}

      {isCompactSearchLayout ? (
        <MobileSheet
          description={ageLabel}
          onClose={() => closeMobileSheet('eta')}
          open={openPopover === 'eta'}
          title="Età del gatto"
        >
          {renderAgeFilters()}
        </MobileSheet>
      ) : null}

      {!isCompactSearchLayout ? (
        <Popover
          matchTriggerWidth
          maxWidth={460}
          minWidth={260}
          open={openPopover === 'comune'}
          parentRef={locationRef}
          scrollable={false}
        >
          {renderLocationSuggestions(false)}
        </Popover>
      ) : null}

      {isCompactSearchLayout ? (
        <MobileSheet
          description={search.locationIntent?.label ?? 'Seleziona la località dai suggerimenti.'}
          onClose={() => closeMobileSheet('comune')}
          open={openPopover === 'comune'}
          title="Dove"
        >
          {renderLocationSuggestions(true)}
        </MobileSheet>
      ) : null}
    </>
  );
}
