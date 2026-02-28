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
  { value: 'relevance', label: 'Più pertinenti' },
  { value: 'newest', label: 'Più recenti' },
  { value: 'price_asc', label: 'Prezzo crescente' },
  { value: 'price_desc', label: 'Prezzo decrescente' },
];

const QUICK_LOCATION_QUERIES = ['Roma', 'Milano', 'Torino', 'Napoli'];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

const normalizeLooseText = (value) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

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

function Popover({ children, parentRef, open }) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

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
      const margin = 12;
      const gap = 8;

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
  }, [open, parentRef, mounted]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.16)',
        border: '1px solid #eee',
        minWidth: '220px',
        maxWidth: '380px',
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
      setLocationError('Config API mancante per i suggerimenti località.');
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

    const handler = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (activeRef.current?.contains(target)) {
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

    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [openPopover]);

  const breedLabel = optionLabel(BREEDS, search.breed, 'Tutte le razze');
  const listingTypeLabel = optionLabel(LISTING_TYPES, search.listingType, 'Tutti i tipi');
  const sexLabel = optionLabel(SEX_OPTIONS, search.sex, 'Qualsiasi');
  const sortLabel = optionLabel(SORT_OPTIONS, search.sort, 'Più pertinenti');
  const localitaLabel = activeLocationLabel || 'Aggiungi località';
  const ageLabel = search.ageText ? search.ageText : 'Qualsiasi età';
  const prezzoLabel =
    search.priceMin !== null || search.priceMax !== null
      ? `€${search.priceMin ?? 0} - €${search.priceMax ?? '∞'}`
      : 'Qualsiasi prezzo';

  const activeFiltersCount =
    (search.listingType ? 1 : 0) +
    (search.sex ? 1 : 0) +
    (search.breed ? 1 : 0) +
    (search.ageText ? 1 : 0) +
    (search.locationIntent ? 1 : 0) +
    (search.priceMin !== null || search.priceMax !== null ? 1 : 0) +
    (search.sort !== 'relevance' ? 1 : 0);

  const setField = (key, value) => {
    setSearch((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const selectLocation = (suggestion) => {
    setSearch((prev) => ({
      ...prev,
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

            setSearch((prev) => ({
              ...prev,
              locationIntent: bestMatch.locationIntent,
            }));
            setLocationQuery(bestMatch.label);
          }
        } catch {
          // Keep fallback label when autocomplete service is unavailable.
        }
      }
    }

    if (
      effectiveSearch.priceMin !== null &&
      effectiveSearch.priceMax !== null &&
      Number(effectiveSearch.priceMin) > Number(effectiveSearch.priceMax)
    ) {
      setValidationError('Il prezzo minimo non può essere superiore al prezzo massimo.');
      return;
    }

    const queryString = buildSearchQueryString(effectiveSearch, fallbackLocationLabel);
    router.push(queryString ? `/annunci?${queryString}` : '/annunci');
  };

  const onFieldButtonClick = (key) => {
    if (key === 'comune') {
      setLocationQuery(activeLocationLabel);
    }

    setOpenPopover((prev) => (prev === key ? null : key));
  };

  return (
    <>
      <div className="ricerca-container">
        {showHeader ? (
          <div className="ricerca-header">
            <div className="header-badge-wrap">
              <Badge variant="outline">Ricerca avanzata</Badge>
            </div>
            <h1>Adotta un Gatto</h1>
            <p>Trova il tuo gatto ideale tra centinaia di annunci!</p>
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
                placeholder="Cerca gattini..."
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
              onClick={() => setExpanded((prev) => !prev)}
              type="button"
            >
              <span style={{ fontSize: 20 }}>{expanded ? '✕' : '☰'}</span>
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
              <svg fill="#fff" height="16" viewBox="0 0 16 16" width="16">
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
                <span className="search-field-label">Età</span>
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
              placeholder="Min €"
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
              placeholder="Max €"
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
              0-200€
            </button>
            <button
              className="preset-btn"
              onClick={() => {
                setField('priceMin', 200);
                setField('priceMax', 500);
              }}
              type="button"
            >
              200-500€
            </button>
            <button
              className="preset-btn"
              onClick={() => {
                setField('priceMin', 500);
                setField('priceMax', null);
              }}
              type="button"
            >
              Oltre 500€
            </button>
          </div>
        </div>
      </Popover>

      <Popover open={openPopover === 'eta'} parentRef={ageRef}>
        <div className="age-popover" data-test-popover="true">
          <label className="location-label" htmlFor="age-text">
            Età (testo libero)
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
            Cerca città, provincia o regione
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
                setSearch((prev) => ({
                  ...prev,
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

      <style jsx global>{`
        .ricerca-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .ricerca-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .header-badge-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        .ricerca-header h1 {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .ricerca-header p {
          font-size: 16px;
          color: #717171;
        }

        .search-bar-wrapper {
          --search-actions-space: 112px;
          background: white;
          border-radius: 40px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          margin-bottom: 20px;
        }

        .search-bar-wrapper:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .search-bar-wrapper.expanded {
          border-radius: 32px;
          padding-bottom: 16px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          padding: 8px;
          gap: 8px;
        }

        .search-field {
          flex: 1;
          padding: 14px 18px;
          border-radius: 32px;
          transition: background-color 0.2s ease;
          min-width: 0;
          position: relative;
          text-align: left;
          border: none;
          background: transparent;
        }

        .search-field:hover {
          background-color: #ebebeb;
        }

        .search-field.active {
          background-color: white;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
          z-index: 10;
        }

        .search-field-button {
          cursor: pointer;
        }

        .search-field-label {
          font-size: 12px;
          font-weight: 600;
          color: #222;
          display: block;
          margin-bottom: 2px;
        }

        .search-field-value {
          font-size: 14px;
          color: #717171;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-field-input {
          font-size: 14px;
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          color: #222;
        }

        .search-adv-btn {
          border: none;
          background: #f7f7f7;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
          flex-shrink: 0;
        }

        .search-adv-btn:hover {
          background: #e0e0e0;
        }

        .search-adv-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ff385c;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
        }

        .search-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: #ff385c;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .search-button:hover {
          background: #e31c5f;
        }

        .search-bar-advanced {
          padding: 0 calc(8px + var(--search-actions-space)) 0 8px;
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, opacity 0.2s ease;
        }

        .search-bar-advanced.expanded {
          max-height: 320px;
          opacity: 1;
        }

        .adv-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          column-gap: 8px;
          row-gap: 12px;
          margin-bottom: 12px;
        }

        .adv-grid .search-field {
          width: 100%;
        }

        .popover-list {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .popover-list-item {
          width: 100%;
          text-align: left;
          padding: 10px 16px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.2s;
          border: none;
          background: transparent;
        }

        .popover-list-item:hover {
          background: #f7f7f7;
        }

        .price-popover {
          padding: 14px;
          width: 340px;
          max-width: calc(100vw - 32px);
        }

        .price-inputs-row {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .price-input {
          flex: 1 1 0;
          min-width: 0;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }

        .preset-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .preset-btn {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .preset-btn:hover {
          border-color: #222;
          background: #f7f7f7;
        }

        .location-popover {
          padding: 14px;
          width: 380px;
          max-width: calc(100vw - 32px);
        }

        .location-label {
          display: block;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #222;
        }

        .location-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .location-results {
          max-height: 230px;
          overflow: auto;
          margin-bottom: 10px;
        }

        .location-result-title {
          display: block;
          color: #222;
          font-size: 14px;
          font-weight: 500;
        }

        .location-result-subtitle {
          display: block;
          color: #717171;
          font-size: 12px;
          margin-top: 2px;
        }

        .location-meta {
          color: #717171;
          font-size: 13px;
          margin: 6px 0;
          padding: 0 2px;
        }

        .location-meta-error {
          color: #c1121f;
        }

        .location-presets {
          margin-top: 6px;
        }

        .age-popover {
          padding: 14px;
          width: 340px;
          max-width: calc(100vw - 32px);
        }

        .error-message {
          color: #c1121f;
          font-size: 14px;
          margin-top: 8px;
          text-align: center;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (max-width: 900px) {
          .search-bar-wrapper {
            --search-actions-space: 0px;
          }

          .search-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .search-field {
            width: 100%;
            flex: none;
          }

          .adv-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .search-bar-advanced.expanded {
            max-height: 640px;
          }

          .search-adv-btn,
          .search-button {
            width: 100%;
            border-radius: 24px;
          }
        }
      `}</style>
    </>
  );
}
