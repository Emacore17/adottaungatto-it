'use client';

import {
  CAT_BREEDS,
  type LocationIntent,
  NO_BREED_FILTER,
  type SearchSort,
} from '@adottaungatto/types';
import { Badge, cn } from '@adottaungatto/ui';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GeographySuggestion } from '../lib/geography';
import { fetchLocationSuggestions } from '../lib/geography';

type AgeUnit = 'months' | 'years';
type PopoverKey = 'breed' | 'comune' | 'listingType' | 'sex' | 'sort' | 'prezzo' | 'eta';

interface SearchState {
  q: string;
  breed: string;
  listingType: string;
  sex: string;
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

interface FilterOption {
  label: string;
  value: string;
}

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
  { value: '0', label: '0 EUR' },
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

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

const initialState: SearchState = {
  q: '',
  breed: '',
  listingType: '',
  sex: '',
  ageMinValue: '',
  ageMinUnit: 'months',
  ageMaxValue: '',
  ageMaxUnit: 'years',
  locationIntent: null,
  priceMin: null,
  priceMax: null,
  sort: 'relevance',
};

const normalizeLooseText = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const optionLabel = (options: ReadonlyArray<{ value: string; label: string }>, value: string) =>
  options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';

const buildPriceLabel = (priceMin: number | null, priceMax: number | null) => {
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
    return 'Qualsiasi eta';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
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

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="mobile-sheet-backdrop"
      data-test-mobile-sheet="true"
      onPointerDown={onClose}
      role="presentation"
    >
      <section
        aria-label={title}
        className="mobile-sheet"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mobile-sheet-handle" />
        <div className="mobile-sheet-header">
          <div className="mobile-sheet-heading">
            <h2 className="mobile-sheet-title">{title}</h2>
            {description ? <p className="mobile-sheet-description">{description}</p> : null}
          </div>
          <button
            aria-label={`Chiudi ${title.toLowerCase()}`}
            className="mobile-sheet-close"
            onClick={onClose}
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
        </div>

        <div className="mobile-sheet-body">{children}</div>
      </section>
    </div>,
    document.body,
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

    if (!apiBaseUrl) {
      setLocationError('La ricerca per localita non e disponibile in questo momento.');
      setLocationLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLocationLoading(true);
      setLocationError(null);

      try {
        const suggestions = await fetchLocationSuggestions(apiBaseUrl, normalizedQuery, 8);
        if (!cancelled) {
          setLocationSuggestions(suggestions);
        }
      } catch {
        if (!cancelled) {
          setLocationSuggestions([]);
          setLocationError('Impossibile recuperare suggerimenti localita.');
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
          ? locationRef
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
  }, [openPopover]);

  const breedLabel = optionLabel(BREEDS, search.breed);
  const listingTypeLabel = optionLabel(LISTING_TYPES, search.listingType);
  const sexLabel = optionLabel(SEX_OPTIONS, search.sex);
  const sortLabel = optionLabel(SORT_OPTIONS, search.sort);
  const ageLabel = buildAgeLabel(search);
  const prezzoLabel = buildPriceLabel(search.priceMin, search.priceMax);

  const activeFiltersCount =
    (search.listingType ? 1 : 0) +
    (search.sex ? 1 : 0) +
    (search.breed ? 1 : 0) +
    (search.ageMinValue || search.ageMaxValue ? 1 : 0) +
    (search.locationIntent ? 1 : 0) +
    (search.priceMin !== null || search.priceMax !== null ? 1 : 0) +
    (search.sort !== 'relevance' ? 1 : 0);

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

  const selectLocation = (suggestion: GeographySuggestion) => {
    setSearch((currentSearch) => ({
      ...currentSearch,
      locationIntent: suggestion.locationIntent,
    }));
    setLocationQuery(suggestion.label);
    setLocationSuggestions([]);
    setOpenPopover(null);
  };

  const buildSearchQueryString = (
    searchState: SearchState = search,
    fallbackLocationLabel: string | null = null,
  ) => {
    const params = new URLSearchParams();
    const ageMinMonths = toAgeMonths(searchState.ageMinValue, searchState.ageMinUnit);
    const ageMaxMonths = toAgeMonths(searchState.ageMaxValue, searchState.ageMaxUnit);

    if (searchState.q.trim()) {
      params.set('q', searchState.q.trim());
    }

    if (searchState.breed) {
      params.set('breed', searchState.breed);
    }

    if (searchState.listingType) {
      params.set('listingType', searchState.listingType);
    }

    if (searchState.sex) {
      params.set('sex', searchState.sex);
    }

    if (ageMinMonths !== null) {
      params.set('ageMinMonths', String(ageMinMonths));
    }

    if (ageMaxMonths !== null) {
      params.set('ageMaxMonths', String(ageMaxMonths));
    }

    if (searchState.priceMin !== null) {
      params.set('priceMin', String(searchState.priceMin));
    }

    if (searchState.priceMax !== null) {
      params.set('priceMax', String(searchState.priceMax));
    }

    if (searchState.sort) {
      params.set('sort', searchState.sort);
    }

    if (searchState.locationIntent) {
      params.set('locationScope', searchState.locationIntent.scope);

      if (searchState.locationIntent.regionId) {
        params.set('regionId', searchState.locationIntent.regionId);
      }

      if (searchState.locationIntent.provinceId) {
        params.set('provinceId', searchState.locationIntent.provinceId);
      }

      if (searchState.locationIntent.comuneId) {
        params.set('comuneId', searchState.locationIntent.comuneId);
      }

      if (searchState.locationIntent.label) {
        params.set('locationLabel', searchState.locationIntent.label);
      }

      if (searchState.locationIntent.secondaryLabel) {
        params.set('locationSecondaryLabel', searchState.locationIntent.secondaryLabel);
      }
    } else if (fallbackLocationLabel) {
      params.set('locationLabel', fallbackLocationLabel);
    }

    return params.toString();
  };

  const runSearch = async () => {
    setValidationError(null);

    let effectiveSearch = search;
    let fallbackLocationLabel: string | null = null;
    const normalizedLocationQuery = locationQuery.trim();
    const ageMinMonths = toAgeMonths(search.ageMinValue, search.ageMinUnit);
    const ageMaxMonths = toAgeMonths(search.ageMaxValue, search.ageMaxUnit);

    if (!effectiveSearch.locationIntent && normalizedLocationQuery.length >= 2) {
      fallbackLocationLabel = normalizedLocationQuery;

      if (apiBaseUrl) {
        try {
          const resolvedSuggestions = await fetchLocationSuggestions(
            apiBaseUrl,
            normalizedLocationQuery,
            1,
          );
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
    }

    if (
      effectiveSearch.priceMin !== null &&
      effectiveSearch.priceMax !== null &&
      Number(effectiveSearch.priceMin) > Number(effectiveSearch.priceMax)
    ) {
      setValidationError('Il prezzo minimo non puo essere superiore al prezzo massimo.');
      return;
    }

    if (ageMinMonths !== null && ageMaxMonths !== null && ageMinMonths > ageMaxMonths) {
      setValidationError("L'eta minima non puo essere superiore all'eta massima.");
      return;
    }

    const queryString = buildSearchQueryString(effectiveSearch, fallbackLocationLabel);
    router.push(queryString ? `/annunci?${queryString}` : '/annunci');
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

      <p className="location-meta">Seleziona un intervallo rapido senza digitare importi.</p>

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
            <span className="location-label">Eta minima</span>
          ) : (
            <label className="location-label" htmlFor={ageMinInputId}>
              Eta minima
            </label>
          )}
          {isCompactSearchLayout ? (
            <MobileFilterSelect
              ariaLabel="Eta minima"
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
            <span className="location-label">Eta massima</span>
          ) : (
            <label className="location-label" htmlFor={ageMaxInputId}>
              Eta massima
            </label>
          )}
          {isCompactSearchLayout ? (
            <MobileFilterSelect
              ariaLabel="Eta massima"
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

      <p className="location-meta">
        Seleziona una fascia di eta in modo rapido.
      </p>

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
            <p>Filtra per localita, eta, fascia prezzo e tipologia di annuncio.</p>
          </div>
        ) : null}

        <div className={`search-row ${expanded ? 'expanded' : ''}`}>
          <div className={`search-bar-wrapper ${expanded ? 'expanded' : ''}`}>
            <div className="search-bar">
              <label className="search-field" htmlFor={qInputId}>
                <span className="search-field-label">Cerca gatti</span>
                <input
                  className="search-field-input"
                  id={qInputId}
                  onChange={(event) => setField('q', event.target.value)}
                  onFocus={() => setOpenPopover(null)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void runSearch();
                    }
                  }}
                  placeholder="Es. Milano, cucciolo, stallo..."
                  type="text"
                  value={search.q}
                />
              </label>

              <button
                className={`search-field search-field-breed search-field-button ${openPopover === 'breed' ? 'active' : ''}`}
                onClick={() => onFieldButtonClick('breed')}
                ref={breedRef}
                type="button"
              >
                <span className="search-field-label">Razza</span>
                <span className="search-field-value">{breedLabel}</span>
              </button>

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
                    const nextValue = event.target.value;
                    setLocationQuery(nextValue);
                    setOpenPopover('comune');

                    if (
                      search.locationIntent &&
                      normalizeLooseText(nextValue) !==
                        normalizeLooseText(search.locationIntent.label ?? '')
                    ) {
                      setSearch((currentSearch) => ({
                        ...currentSearch,
                        locationIntent: null,
                      }));
                    }
                  }}
                  onFocus={openLocationPopover}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void runSearch();
                    }

                    if (event.key === 'Escape') {
                      setOpenPopover(null);
                    }
                  }}
                  placeholder="Citta, provincia o regione"
                  type="text"
                  value={locationQuery}
                />
              </label>
            </div>

            <div className={`search-bar-advanced ${expanded ? 'expanded' : ''}`}>
              <div className="adv-grid">
                <button
                  className={`search-field search-field-button advanced-field advanced-field-listing-type ${openPopover === 'listingType' ? 'active' : ''}`}
                  onClick={() => onFieldButtonClick('listingType')}
                  ref={listingTypeRef}
                  type="button"
                >
                  <span className="search-field-label">Cosa stai cercando?</span>
                  <span className="search-field-value">{listingTypeLabel}</span>
                </button>

                <button
                  className={`search-field search-field-button advanced-field advanced-field-sex ${openPopover === 'sex' ? 'active' : ''}`}
                  onClick={() => onFieldButtonClick('sex')}
                  ref={sexRef}
                  type="button"
                >
                  <span className="search-field-label">Sesso</span>
                  <span className="search-field-value">{sexLabel}</span>
                </button>

                <button
                  className={`search-field search-field-button advanced-field advanced-field-sort ${openPopover === 'sort' ? 'active' : ''}`}
                  onClick={() => onFieldButtonClick('sort')}
                  ref={sortRef}
                  type="button"
                >
                  <span className="search-field-label">Ordina per</span>
                  <span className="search-field-value">{sortLabel}</span>
                </button>

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
                  <span className="search-field-label">Eta del gatto</span>
                  <span className="search-field-value">{ageLabel}</span>
                </button>
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

            <button
              aria-label="Cerca"
              className="search-button"
              onClick={() => void runSearch()}
              type="button"
            >
              <svg fill="currentColor" height="16" viewBox="0 0 16 16" width="16">
                <title>Cerca</title>
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
              <span className="search-action-label">Cerca</span>
            </button>
          </div>
        </div>

        {validationError ? <p className="error-message">{validationError}</p> : null}
      </div>

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
          onClose={() => setOpenPopover(null)}
          open={openPopover === 'prezzo'}
          title="Prezzo"
        >
          {renderPriceFilters()}
        </MobileSheet>
      ) : null}

      {isCompactSearchLayout ? (
        <MobileSheet
          description={ageLabel}
          onClose={() => setOpenPopover(null)}
          open={openPopover === 'eta'}
          title="Eta del gatto"
        >
          {renderAgeFilters()}
        </MobileSheet>
      ) : null}

      <Popover
        matchTriggerWidth
        maxWidth={460}
        minWidth={260}
        open={openPopover === 'comune'}
        parentRef={locationRef}
        scrollable={false}
      >
        <div className="location-popover">
          <p className="location-label">Suggerimenti localita</p>
          {locationLoading ? <p className="location-meta">Cerco suggerimenti...</p> : null}
          {locationError ? (
            <p className="location-meta location-meta-error">{locationError}</p>
          ) : null}

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
      </Popover>
    </>
  );
}
