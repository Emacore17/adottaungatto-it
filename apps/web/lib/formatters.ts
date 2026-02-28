const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

const getCurrencyFormatter = (currency: string) => {
  const normalizedCurrency = currency.trim().toUpperCase() || 'EUR';
  const cacheKey = `it-IT:${normalizedCurrency}`;
  const cachedFormatter = currencyFormatterCache.get(cacheKey);
  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  });

  currencyFormatterCache.set(cacheKey, formatter);
  return formatter;
};

export const formatCurrencyAmount = (value: string | null, currency: string): string => {
  if (value === null) {
    return 'Prezzo su richiesta';
  }

  const parsedValue = Number.parseFloat(value);
  if (!Number.isFinite(parsedValue)) {
    return `${value} ${currency}`.trim();
  }

  return getCurrencyFormatter(currency).format(parsedValue);
};

export const formatDate = (value: string | null): string => {
  if (!value) {
    return 'Non disponibile';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
};
