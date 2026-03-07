import type { ListingStatus } from './listings';

const listingStatusLabels: Record<ListingStatus, string> = {
  draft: 'Bozza',
  pending_review: 'In attesa di revisione',
  published: 'Pubblicato',
  rejected: 'Rifiutato',
  suspended: 'Sospeso',
  archived: 'Archiviato',
};

const capitalizeFirstLetter = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const formatListingStatusLabel = (status: string | null | undefined): string => {
  if (!status) {
    return 'Bozza';
  }

  const normalized = status.trim().toLowerCase() as ListingStatus;
  const label = listingStatusLabels[normalized];
  if (label) {
    return label;
  }

  return capitalizeFirstLetter(normalized.replaceAll('_', ' '));
};
