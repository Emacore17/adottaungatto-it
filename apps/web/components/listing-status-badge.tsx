import { Badge } from '@adottaungatto/ui';
import type { ListingStatus } from '../lib/listings';

const statusConfig: Record<
  ListingStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info';
  }
> = {
  draft: {
    label: 'Bozza',
    variant: 'info',
  },
  pending_review: {
    label: 'In revisione',
    variant: 'warning',
  },
  published: {
    label: 'Pubblicato',
    variant: 'success',
  },
  rejected: {
    label: 'Rifiutato',
    variant: 'danger',
  },
  suspended: {
    label: 'Sospeso',
    variant: 'warning',
  },
  archived: {
    label: 'Archiviato',
    variant: 'secondary',
  },
};

interface ListingStatusBadgeProps {
  status: ListingStatus;
}

export function ListingStatusBadge({ status }: ListingStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
