export const MAX_LISTING_AGE_MONTHS = 480;

const normalizedWhitespaceRegex = /\s+/g;
const normalizedAgeTextRegex = /^(\d+)\s*(mese|mesi|anno|anni)$/;

export const formatListingAgeText = (ageMonths: number): string => {
  if (!Number.isInteger(ageMonths) || ageMonths <= 0) {
    throw new Error('Age months must be a positive integer.');
  }

  if (ageMonths >= 12 && ageMonths % 12 === 0) {
    const years = ageMonths / 12;
    return `${years} ${years === 1 ? 'anno' : 'anni'}`;
  }

  return `${ageMonths} ${ageMonths === 1 ? 'mese' : 'mesi'}`;
};

export const parseListingAgeTextToMonths = (value: string): number | null => {
  const normalized = value.trim().toLowerCase().replace(normalizedWhitespaceRegex, ' ');

  if (!normalized) {
    return null;
  }

  const match = normalized.match(normalizedAgeTextRegex);
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1] ?? '', 10);
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }

  const unit = match[2];
  if (unit === 'anno' || unit === 'anni') {
    return amount * 12;
  }

  return amount;
};

export const normalizeListingAge = (input: {
  ageText?: string | null;
  ageMonths?: number | null;
}):
  | {
      ageText: string;
      ageMonths: number;
    }
  | {
      error: string;
    } => {
  const normalizedAgeMonths =
    input.ageMonths !== null && input.ageMonths !== undefined ? Math.trunc(input.ageMonths) : null;

  if (normalizedAgeMonths !== null) {
    if (normalizedAgeMonths < 1 || normalizedAgeMonths > MAX_LISTING_AGE_MONTHS) {
      return {
        error: `Field "ageMonths" must be between 1 and ${MAX_LISTING_AGE_MONTHS}.`,
      };
    }

    return {
      ageText: formatListingAgeText(normalizedAgeMonths),
      ageMonths: normalizedAgeMonths,
    };
  }

  if (!input.ageText) {
    return {
      error: 'Field "ageText" or "ageMonths" is required.',
    };
  }

  const parsedAgeMonths = parseListingAgeTextToMonths(input.ageText);
  if (parsedAgeMonths === null) {
    return {
      error: 'Field "ageText" must use months or years, for example "6 mesi" or "2 anni".',
    };
  }

  if (parsedAgeMonths > MAX_LISTING_AGE_MONTHS) {
    return {
      error: `Field "ageText" exceeds the maximum supported age (${MAX_LISTING_AGE_MONTHS} months).`,
    };
  }

  return {
    ageText: formatListingAgeText(parsedAgeMonths),
    ageMonths: parsedAgeMonths,
  };
};
