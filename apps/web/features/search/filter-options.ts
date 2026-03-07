import { CAT_BREEDS, NO_BREED_FILTER, type SearchSort } from '@adottaungatto/types';

export interface FilterOption {
  label: string;
  value: string;
}

export const BREEDS = [
  { value: '', label: 'Indifferente' },
  { value: NO_BREED_FILTER, label: 'Non di razza' },
  ...CAT_BREEDS.map((breed) => ({
    value: breed.label,
    label: breed.label,
  })),
] as const;

export const LISTING_TYPES = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'adozione', label: 'Adozione' },
  { value: 'stallo', label: 'Stallo' },
  { value: 'segnalazione', label: 'Segnalazione' },
] as const;

export const SEX_OPTIONS = [
  { value: '', label: 'Qualsiasi' },
  { value: 'maschio', label: 'Maschio' },
  { value: 'femmina', label: 'Femmina' },
] as const;

export const BOOLEAN_FILTER_OPTIONS = [
  { value: '', label: 'Indifferente' },
  { value: 'true', label: 'Si' },
  { value: 'false', label: 'No' },
] as const;

export const SORT_OPTIONS: ReadonlyArray<{ value: SearchSort; label: string }> = [
  { value: 'relevance', label: 'Più pertinenti' },
  { value: 'newest', label: 'Più recenti' },
  { value: 'price_asc', label: 'Prezzo crescente' },
  { value: 'price_desc', label: 'Prezzo decrescente' },
];

export const PRICE_FILTER_OPTIONS = [
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

export const AGE_FILTER_OPTIONS = [
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

export const numberOrNull = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const booleanOrNull = (value: string) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
};

export const booleanToFilterValue = (value: boolean | null) => {
  if (value === true) {
    return 'true';
  }

  if (value === false) {
    return 'false';
  }

  return '';
};

export const optionLabel = (options: ReadonlyArray<FilterOption>, value: string) =>
  options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';

export const formatAgeMonthsLabel = (months: number) => {
  if (months > 0 && months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? 'anno' : 'anni'}`;
  }

  return `${months} ${months === 1 ? 'mese' : 'mesi'}`;
};

export const buildAgeRangeLabel = (ageMinMonths: number | null, ageMaxMonths: number | null) => {
  if (ageMinMonths === null && ageMaxMonths === null) {
    return 'Qualsiasi età';
  }

  if (ageMinMonths !== null && ageMaxMonths !== null) {
    return `${formatAgeMonthsLabel(ageMinMonths)} - ${formatAgeMonthsLabel(ageMaxMonths)}`;
  }

  if (ageMinMonths !== null) {
    return `Da ${formatAgeMonthsLabel(ageMinMonths)}`;
  }

  return `Fino a ${formatAgeMonthsLabel(ageMaxMonths ?? 0)}`;
};

export const buildPriceRangeLabel = (priceMin: number | null, priceMax: number | null) => {
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
