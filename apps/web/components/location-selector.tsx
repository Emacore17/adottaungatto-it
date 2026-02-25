'use client';

import type { LocationIntent, LocationIntentScope } from '@adottaungatto/types';
import { Badge, Button, Input, Skeleton, cn } from '@adottaungatto/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type GeographySuggestion, fetchLocationSuggestions } from '../lib/geography';

export type LocationValue = LocationIntent | null;

interface LocationSelectorProps {
  apiBaseUrl: string;
  value: LocationValue;
  onChange: (nextValue: LocationValue) => void;
  className?: string;
}

const minimumQueryLength = 2;

const scopeLabel: Record<LocationIntentScope, string> = {
  italy: 'Italia',
  region: 'Regione',
  province: 'Provincia',
  comune: 'Comune',
  comune_plus_province: 'Comune + provincia',
};

const scopeBadgeVariant: Record<
  LocationIntentScope,
  'outline' | 'secondary' | 'success' | 'default'
> = {
  italy: 'default',
  region: 'success',
  province: 'outline',
  comune: 'secondary',
  comune_plus_province: 'outline',
};

const italyIntent: LocationIntent = {
  scope: 'italy',
  regionId: null,
  provinceId: null,
  comuneId: null,
  label: 'Tutta Italia',
  secondaryLabel: 'Ricerca nazionale',
};

export function LocationSelector({
  apiBaseUrl,
  value,
  onChange,
  className,
}: LocationSelectorProps) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [suggestions, setSuggestions] = useState<GeographySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= minimumQueryLength;

  const loadSuggestions = useCallback(
    async (queryValue: string) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const items = await fetchLocationSuggestions(apiBaseUrl, queryValue, 8);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setSuggestions(items);
        setActiveIndex(items.length > 0 ? 0 : -1);
      } catch {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setSuggestions([]);
        setActiveIndex(-1);
        setError('Impossibile caricare i suggerimenti luogo. Riprova.');
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [apiBaseUrl],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!canSearch) {
      setIsLoading(false);
      setSuggestions([]);
      setError(null);
      setActiveIndex(-1);
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadSuggestions(trimmedQuery);
    }, 220);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [canSearch, isOpen, loadSuggestions, trimmedQuery]);

  useEffect(() => {
    if (!isOpen) {
      setQuery(value?.label ?? '');
    }
  }, [isOpen, value?.label]);

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, []);

  const selectSuggestion = useCallback(
    (suggestion: GeographySuggestion) => {
      onChange(suggestion.locationIntent);
      setQuery(suggestion.label);
      setIsOpen(false);
      setActiveIndex(-1);
      setSuggestions([]);
      setError(null);
    },
    [onChange],
  );

  const selectItaly = useCallback(() => {
    onChange(italyIntent);
    setQuery(italyIntent.label);
    setIsOpen(false);
    setActiveIndex(-1);
    setSuggestions([]);
    setError(null);
  }, [onChange]);

  const activeSuggestion = useMemo(
    () => (activeIndex >= 0 ? suggestions[activeIndex] : null),
    [activeIndex, suggestions],
  );

  return (
    <section className={cn('space-y-4', className)}>
      <div className="space-y-2" ref={containerRef}>
        <label className="text-sm font-medium text-slate-900" htmlFor="location-search">
          Luogo
        </label>
        <div className="relative">
          <Input
            aria-autocomplete="list"
            aria-controls="location-suggestions"
            aria-expanded={isOpen}
            autoComplete="off"
            id="location-search"
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuery(nextValue);
              setIsOpen(true);
              setError(null);
              setActiveIndex(-1);

              if (value && nextValue !== value.label) {
                onChange(null);
              }
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsOpen(false);
                setActiveIndex(-1);
                return;
              }

              if (event.key === 'ArrowDown') {
                if (!isOpen) {
                  setIsOpen(true);
                  return;
                }

                if (suggestions.length === 0) {
                  return;
                }

                event.preventDefault();
                setActiveIndex((prev) => (prev + 1 >= suggestions.length ? 0 : prev + 1));
                return;
              }

              if (event.key === 'ArrowUp') {
                if (!isOpen || suggestions.length === 0) {
                  return;
                }

                event.preventDefault();
                setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
                return;
              }

              if (event.key === 'Enter' && activeSuggestion) {
                event.preventDefault();
                selectSuggestion(activeSuggestion);
              }
            }}
            placeholder="Scrivi comune, provincia o regione"
            value={query}
          />

          {query.length > 0 ? (
            <button
              aria-label="Reset luogo"
              className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-900"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setActiveIndex(-1);
                setError(null);
                onChange(null);
                setIsOpen(true);
              }}
              type="button"
            >
              Reset
            </button>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {isLoading ? (
                <div className="space-y-2 p-1">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : null}

              {!isLoading && error ? (
                <div className="space-y-2 p-2">
                  <p className="text-sm text-rose-700">{error}</p>
                  <Button
                    onClick={() => {
                      if (canSearch) {
                        void loadSuggestions(trimmedQuery);
                      }
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Riprova
                  </Button>
                </div>
              ) : null}

              {!isLoading && !error && !canSearch ? (
                <p className="p-2 text-sm text-slate-600">
                  Digita almeno {minimumQueryLength} caratteri per vedere i suggerimenti.
                </p>
              ) : null}

              {!isLoading && !error && canSearch && suggestions.length === 0 ? (
                <p className="p-2 text-sm text-slate-600">
                  Nessuna corrispondenza trovata. Prova con un nome completo, ad esempio "Torino" o
                  "Piemonte".
                </p>
              ) : null}

              {!isLoading && !error && canSearch && suggestions.length > 0 ? (
                <ul className="space-y-1" id="location-suggestions">
                  {suggestions.map((suggestion, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <li key={`${suggestion.type}-${suggestion.id}`}>
                        <button
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors',
                            isActive ? 'bg-slate-100' : 'hover:bg-slate-50',
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectSuggestion(suggestion);
                          }}
                          type="button"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {suggestion.label}
                            </p>
                            {suggestion.secondaryLabel ? (
                              <p className="truncate text-xs text-slate-600">
                                {suggestion.secondaryLabel}
                              </p>
                            ) : null}
                          </div>
                          <Badge
                            className="ml-3 shrink-0"
                            variant={scopeBadgeVariant[suggestion.locationIntent.scope]}
                          >
                            {scopeLabel[suggestion.locationIntent.scope]}
                          </Badge>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={selectItaly} size="sm" variant="outline">
          Seleziona tutta Italia
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
          Form state (LocationIntent)
        </p>
        <p className="mt-1 text-sm text-slate-900">
          Scope: <span className="font-medium">{value ? scopeLabel[value.scope] : '-'}</span>
        </p>
        <p className="text-sm text-slate-900">
          Selezione: <span className="font-medium">{value?.label ?? '-'}</span>
        </p>
        <p className="text-sm text-slate-900">
          Contesto: <span className="font-medium">{value?.secondaryLabel ?? '-'}</span>
        </p>
        <p className="text-xs text-slate-600">
          regionId={value?.regionId ?? 'null'} | provinceId={value?.provinceId ?? 'null'} |
          comuneId={value?.comuneId ?? 'null'}
        </p>
      </div>
    </section>
  );
}
