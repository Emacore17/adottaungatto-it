import { describe, expect, it } from 'vitest';
import { formatListingStatusLabel } from '../../lib/listing-status';

describe('formatListingStatusLabel', () => {
  it('maps known status codes to italian labels', () => {
    expect(formatListingStatusLabel('pending_review')).toBe('In attesa di revisione');
    expect(formatListingStatusLabel('draft')).toBe('Bozza');
    expect(formatListingStatusLabel('published')).toBe('Pubblicato');
    expect(formatListingStatusLabel('rejected')).toBe('Rifiutato');
    expect(formatListingStatusLabel('suspended')).toBe('Sospeso');
    expect(formatListingStatusLabel('archived')).toBe('Archiviato');
  });

  it('normalizes unknown status values', () => {
    expect(formatListingStatusLabel('needs_manual_check')).toBe('Needs manual check');
  });

  it('falls back to bozza on empty values', () => {
    expect(formatListingStatusLabel(null)).toBe('Bozza');
    expect(formatListingStatusLabel(undefined)).toBe('Bozza');
    expect(formatListingStatusLabel('')).toBe('Bozza');
  });
});
