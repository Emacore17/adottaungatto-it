'use client';

import { Badge } from '@adottaungatto/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchLocationSuggestions } from '../lib/geography';

const BREEDS = [
  { value: '', label: 'Tutte le razze' },
  { value: 'Europeo', label: 'Europeo' },
  { value: 'Persiano', label: 'Persiano' },
  { value: 'Maine Coon', label: 'Maine Coon' },
  { value: 'Siamese', label: 'Siamese' },
  { value: 'Ragdoll', label: 'Ragdoll' },
  { value: 'British Shorthair', label: 'British Shorthair' },
  { value: 'Bengala', label: 'Bengala' },
  { value: 'Sphynx', label: 'Sphynx' },
];

const LISTING_TYPES = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'adozione', label: 'Adozione' },
  { value: 'stallo', label: 'Stallo' },
  { value: 'segnalazione', label: 'Segnalazione' },
];

const SEX_OPTIONS = [
  { value: '', label: 'Qualsiasi' },
  { value: 'maschio', label: 'Maschio' },
  { value: 'femmina', label: 'Femmina' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Piu pertinenti' },
  { value: 'newest', label: 'Piu recenti' },
  { value: 'price_asc', label: 'Prezzo crescente' },
  { value: 'price_desc', label: 'Prezzo decrescente' },
];

const QUICK_LOCATION_QUERIES = ['Roma', 'Milano', 'Torino', 'Napoli'];
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

const initialState = {
  q: '',
  breed: '',
  listingType: '',
  sex: '',
  ageText: '',
  locationIntent: null,
  priceMin: null,
  priceMax: null,
  sort: 'relevance',
};

const normalizeLooseText = (value) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

function Popover({ children, parentRef, open }) {
  const popoverRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open || !parentRef?.current || !popoverRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!parentRef?.current || !popoverRef.current) {
        return;
      }

      const triggerRect = parentRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 8;
      const margin = 12;

      let left = triggerRect.left;
      if (left + popoverRect.width > viewportWidth - margin) {
        left = viewportWidth - popoverRect.width - margin;
      }
      left = Math.max(margin, left);

      let top = triggerRect.bottom + gap;
      if (top + popoverRect.height > viewportHeight - margin) {
        top = Math.max(margin, triggerRect.top - popoverRect.height - gap);
      }

      setPosition({ top, left });
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
  }, [mounted, open, parentRef]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
        minWidth: '220px',
        maxWidth: '380px',
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

function optionLabel(options, value, fallbackLabel) {
  return options.find((option) => option.value === value)?.label ?? fallbackLabel;
}

function buildPriceLabel(priceMin, priceMax) {
  if (priceMin === null && priceMax === null) {
    return 'Qualsiasi prezzo';
  }

  const minLabel = priceMin ?? 0;
  const maxLabel = priceMax ?? 'oltre';
  return `EUR ${minLabel} - ${maxLabel}`;
}

export default function Ricerca({ showHeader = true } = {}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialState);
  const [expanded, setExpanded] = useState(false);
  const [openPopover, setOpenPopover] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const qRef = useRef(null);
  const breedRef = useRef(null);
  const locationRef = useRef(null);
  const listingTypeRef = useRef(null);
  const sexRef = useRef(null);
  const ageRef = useRef(null);
  const priceRef = useRef(null);
  const sortRef = useRef(null);

  const activeLocationLabel = search.locationIntent?.label ?? '';

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
      setLocationError('Config API mancante per i suggerimenti localita.');
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
      openPopover === 'q'
        ? qRef
        : openPopover === 'breed'
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (activeRef?.current?.contains(target)) {
        return;
      }

      const popovers = document.querySelectorAll('[data-test-popover="true"]');
      for (const popover of popovers) {
        if (popover.contains(target)) {
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

  const breedLabel = optionLabel(BREEDS, search.breed, 'Tutte le razze');
  const listingTypeLabel = optionLabel(LISTING_TYPES, search.listingType, 'Tutti i tipi');
  const sexLabel = optionLabel(SEX_OPTIONS, search.sex, 'Qualsiasi');
  const sortLabel = optionLabel(SORT_OPTIONS, search.sort, 'Piu pertinenti');
  const localitaLabel = activeLocationLabel || 'Aggiungi localita';
  const ageLabel = search.ageText || 'Qualsiasi eta';
  const prezzoLabel = buildPriceLabel(search.priceMin, search.priceMax);

  const activeFiltersCount =
    (search.listingType ? 1 : 0) +
    (search.sex ? 1 : 0) +
    (search.breed ? 1 : 0) +
    (search.ageText ? 1 : 0) +
    (search.locationIntent ? 1 : 0) +
    (search.priceMin !== null || search.priceMax !== null ? 1 : 0) +
    (search.sort !== 'relevance' ? 1 : 0);

  const setField = (key, value) => {
    setSearch((currentSearch) => ({
      ...currentSearch,
      [key]: value,
    }));
  };

  const selectLocation = (suggestion) => {
    setSearch((currentSearch) => ({
      ...currentSearch,
      locationIntent: suggestion.locationIntent,
    }));
    setLocationQuery(suggestion.label);
    setLocationSuggestions([]);
    setOpenPopover(null);
  };

  const buildSearchQueryString = (searchState = search, fallbackLocationLabel = null) => {
    const params = new URLSearchParams();

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

    if (searchState.ageText.trim()) {
      params.set('ageText', searchState.ageText.trim());
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
    let fallbackLocationLabel = null;
    const normalizedLocationQuery = locationQuery.trim();

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

    const queryString = buildSearchQueryString(effectiveSearch, fallbackLocationLabel);
    router.push(queryString ? `/annunci?${queryString}` : '/annunci');
  };

  const onFieldButtonClick = (key) => {
    if (key === 'comune') {
      setLocationQuery(activeLocationLabel);
    }

    setOpenPopover((currentPopover) => (currentPopover === key ? null : key));
  };

  return (
    <>
      <div className="ricerca-container">
        {showHeader ? (
          <div className="ricerca-header">
            <div className="header-badge-wrap">
              <Badge variant="outline">Ricerca avanzata</Badge>
            </div>
            <h1>Trova il prossimo gatto da accogliere.</h1>
            <p>Filtra per localita, razza, fascia prezzo e tipologia di annuncio.</p>
          </div>
        ) : null}

        <div className={`search-bar-wrapper ${expanded ? 'expanded' : ''}`}>
          <div className="search-bar">
            <div className={`search-field ${openPopover === 'q' ? 'active' : ''}`} ref={qRef}>
              <span className="search-field-label">Cerca</span>
              <input
                className="search-field-input"
                onChange={(event) => setField('q', event.target.value)}
                onFocus={() => setOpenPopover(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="Cerca gattini, adozioni o rifugi"
                type="text"
                value={search.q}
              />
            </div>

            <button
              className={`search-field search-field-button ${openPopover === 'breed' ? 'active' : ''}`}
              onClick={() => onFieldButtonClick('breed')}
              ref={breedRef}
              type="button"
            >
              <span className="search-field-label">Razza</span>
              <span className="search-field-value">{breedLabel}</span>
            </button>

            <button
              className={`search-field search-field-button ${openPopover === 'comune' ? 'active' : ''}`}
              onClick={() => onFieldButtonClick('comune')}
              ref={locationRef}
              type="button"
            >
              <span className="search-field-label">Dove</span>
              <span className="search-field-value">{localitaLabel}</span>
            </button>

            <button
              aria-label="Filtri avanzati"
              className="search-adv-btn"
              onClick={() => setExpanded((currentValue) => !currentValue)}
              type="button"
            >
              <span style={{ fontSize: 20 }}>{expanded ? 'X' : '+'}</span>
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
            </button>
          </div>

          <div className={`search-bar-advanced ${expanded ? 'expanded' : ''}`}>
            <div className="adv-grid">
              <button
                className={`search-field search-field-button ${openPopover === 'listingType' ? 'active' : ''}`}
                onClick={() => onFieldButtonClick('listingType')}
                ref={listingTypeRef}
                type="button"
              >
                <span className="search-field-label">Tipo annuncio</span>
                <span className="search-field-value">{listingTypeLabel}</span>
              </button>

              <button
                className={`search-field search-field-button ${openPopover === 'sex' ? 'active' : ''}`}
                onClick={() => onFieldButtonClick('sex')}
                ref={sexRef}
                type="button"
              >
                <span className="search-field-label">Sesso</span>
                <span className="search-field-value">{sexLabel}</span>
              </button>

              <button
                className={`search-field search-field-button ${openPopover === 'sort' ? 'active' : ''}`}
                onClick={() => onFieldButtonClick('sort')}
                ref={sortRef}
                type="button"
              >
                <span className="search-field-label">Ordina per</span>
                <span className="search-field-value">{sortLabel}</span>
              </button>

              <button
                className={`search-field search-field-button ${openPopover === 'prezzo' ? 'active' : ''}`}
                onClick={() => onFieldButtonClick('prezzo')}
                ref={priceRef}
                type="button"
              >
                <span className="search-field-label">Prezzo</span>
                <span className="search-field-value">{prezzoLabel}</span>
              </button>

              <button
                className={`search-field search-field-button ${openPopover === 'eta' ? 'active' : ''}`}
                onClick={() => onFieldButtonClick('eta')}
                ref={ageRef}
                type="button"
              >
                <span className="search-field-label">Eta</span>
                <span className="search-field-value">{ageLabel}</span>
              </button>
            </div>
          </div>
        </div>

        {validationError ? <p className="error-message">{validationError}</p> : null}
      </div>

      <Popover open={openPopover === 'breed'} parentRef={breedRef}>
        <div className="popover-list" data-test-popover="true">
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

      <Popover open={openPopover === 'listingType'} parentRef={listingTypeRef}>
        <div className="popover-list" data-test-popover="true">
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

      <Popover open={openPopover === 'sex'} parentRef={sexRef}>
        <div className="popover-list" data-test-popover="true">
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

      <Popover open={openPopover === 'sort'} parentRef={sortRef}>
        <div className="popover-list" data-test-popover="true">
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

      <Popover open={openPopover === 'prezzo'} parentRef={priceRef}>
        <div className="price-popover" data-test-popover="true">
          <div className="price-inputs-row">
            <input
              className="price-input"
              min={0}
              onChange={(event) => {
                const value = event.target.value.trim();
                setField('priceMin', value ? Number(value) : null);
              }}
              placeholder="Min EUR"
              type="number"
              value={search.priceMin ?? ''}
            />
            <input
              className="price-input"
              min={0}
              onChange={(event) => {
                const value = event.target.value.trim();
                setField('priceMax', value ? Number(value) : null);
              }}
              placeholder="Max EUR"
              type="number"
              value={search.priceMax ?? ''}
            />
          </div>

          <div className="preset-row">
            <button
              className="preset-btn"
              onClick={() => {
                setField('priceMin', null);
                setField('priceMax', null);
              }}
              type="button"
            >
              Qualsiasi
            </button>
            <button
              className="preset-btn"
              onClick={() => {
                setField('priceMin', 0);
                setField('priceMax', 200);
              }}
              type="button"
            >
              0-200 EUR
            </button>
            <button
              className="preset-btn"
              onClick={() => {
                setField('priceMin', 200);
                setField('priceMax', 500);
              }}
              type="button"
            >
              200-500 EUR
            </button>
            <button
              className="preset-btn"
              onClick={() => {
                setField('priceMin', 500);
                setField('priceMax', null);
              }}
              type="button"
            >
              Oltre 500 EUR
            </button>
          </div>
        </div>
      </Popover>

      <Popover open={openPopover === 'eta'} parentRef={ageRef}>
        <div className="age-popover" data-test-popover="true">
          <label className="location-label" htmlFor="age-text">
            Eta (testo libero)
          </label>
          <input
            className="location-input"
            id="age-text"
            onChange={(event) => setField('ageText', event.target.value)}
            placeholder="Es. 8 mesi, 2 anni"
            type="text"
            value={search.ageText}
          />

          <div className="preset-row">
            <button className="preset-btn" onClick={() => setField('ageText', '')} type="button">
              Qualsiasi
            </button>
            <button
              className="preset-btn"
              onClick={() => setField('ageText', 'cucciolo')}
              type="button"
            >
              Cucciolo
            </button>
            <button
              className="preset-btn"
              onClick={() => setField('ageText', 'adulto')}
              type="button"
            >
              Adulto
            </button>
            <button
              className="preset-btn"
              onClick={() => setField('ageText', 'senior')}
              type="button"
            >
              Senior
            </button>
          </div>
        </div>
      </Popover>

      <Popover open={openPopover === 'comune'} parentRef={locationRef}>
        <div className="location-popover" data-test-popover="true">
          <label className="location-label" htmlFor="location-query">
            Cerca citta, provincia o regione
          </label>
          <input
            className="location-input"
            id="location-query"
            onChange={(event) => {
              const nextValue = event.target.value;
              setLocationQuery(nextValue);

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
            placeholder="Es. Torino, Milano, Roma"
            type="text"
            value={locationQuery}
          />

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

          <div className="location-presets">
            <span className="location-label">Ricerche rapide</span>
            <div className="preset-row">
              {QUICK_LOCATION_QUERIES.map((city) => (
                <button
                  className="preset-btn"
                  key={city}
                  onClick={() => setLocationQuery(city)}
                  type="button"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Popover>
    </>
  );
}
