import { type Page, expect, test } from '@playwright/test';

interface SearchResponsePayload {
  items: Array<{
    id: string;
    title: string;
    description: string;
    listingType: string;
    priceAmount: string | null;
    currency: string;
    ageText: string;
    sex: string;
    breed: string | null;
    publishedAt: string | null;
    createdAt: string;
    regionName: string;
    provinceName: string;
    provinceSigla: string;
    comuneName: string;
    distanceKm: number | null;
    mediaCount: number;
    primaryMedia: null;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  metadata: {
    fallbackApplied: boolean;
    fallbackLevel:
      | 'none'
      | 'italy'
      | 'region'
      | 'province'
      | 'comune'
      | 'comune_plus_province'
      | 'nearby';
    fallbackReason:
      | 'NO_EXACT_MATCH'
      | 'WIDENED_TO_PARENT_AREA'
      | 'WIDENED_TO_NEARBY_AREA'
      | 'NO_LOCATION_FILTER'
      | null;
    requestedLocationIntent: {
      scope: 'italy' | 'region' | 'province' | 'comune' | 'comune_plus_province';
      regionId: string | null;
      provinceId: string | null;
      comuneId: string | null;
      label: string;
      secondaryLabel: string | null;
    } | null;
    effectiveLocationIntent: {
      scope: 'italy' | 'region' | 'province' | 'comune' | 'comune_plus_province';
      regionId: string | null;
      provinceId: string | null;
      comuneId: string | null;
      label: string;
      secondaryLabel: string | null;
    } | null;
  };
}

const requestedComuneIntent = {
  scope: 'comune',
  regionId: '1',
  provinceId: '11',
  comuneId: '101',
  label: 'Torino (TO)',
  secondaryLabel: 'Comune',
} as const;

const exactMatchPayload: SearchResponsePayload = {
  items: [
    {
      id: 'listing-torino-1',
      title: 'Gattino rosso in adozione',
      description: 'Annuncio demo con match esatto sul comune richiesto.',
      listingType: 'adozione',
      priceAmount: null,
      currency: 'EUR',
      ageText: '4 mesi',
      sex: 'maschio',
      breed: 'Europeo',
      publishedAt: '2026-02-20T10:00:00.000Z',
      createdAt: '2026-02-20T10:00:00.000Z',
      regionName: 'Piemonte',
      provinceName: 'Torino',
      provinceSigla: 'TO',
      comuneName: 'Torino',
      distanceKm: 0,
      mediaCount: 0,
      primaryMedia: null,
    },
  ],
  pagination: {
    limit: 12,
    offset: 0,
    total: 1,
    hasMore: false,
  },
  metadata: {
    fallbackApplied: false,
    fallbackLevel: 'none',
    fallbackReason: null,
    requestedLocationIntent: requestedComuneIntent,
    effectiveLocationIntent: requestedComuneIntent,
  },
};

const fallbackPayload: SearchResponsePayload = {
  items: [
    {
      id: 'listing-pinerolo-1',
      title: 'Gatta adulta tranquilla',
      description: 'Annuncio demo trovato dopo allargamento alla provincia.',
      listingType: 'adozione',
      priceAmount: '80',
      currency: 'EUR',
      ageText: '2 anni',
      sex: 'femmina',
      breed: null,
      publishedAt: '2026-02-22T08:30:00.000Z',
      createdAt: '2026-02-22T08:30:00.000Z',
      regionName: 'Piemonte',
      provinceName: 'Torino',
      provinceSigla: 'TO',
      comuneName: 'Pinerolo',
      distanceKm: 26.4,
      mediaCount: 0,
      primaryMedia: null,
    },
  ],
  pagination: {
    limit: 12,
    offset: 0,
    total: 1,
    hasMore: false,
  },
  metadata: {
    fallbackApplied: true,
    fallbackLevel: 'province',
    fallbackReason: 'WIDENED_TO_PARENT_AREA',
    requestedLocationIntent: requestedComuneIntent,
    effectiveLocationIntent: {
      scope: 'province',
      regionId: '1',
      provinceId: '11',
      comuneId: null,
      label: 'Torino e provincia (TO)',
      secondaryLabel: 'Provincia',
    },
  },
};

const comuneSearchQuery = new URLSearchParams({
  locationScope: 'comune',
  regionId: '1',
  provinceId: '11',
  comuneId: '101',
  locationLabel: 'Torino (TO)',
  locationSecondaryLabel: 'Comune',
  sort: 'relevance',
  limit: '12',
  offset: '0',
});
const fallbackSearchQuery = new URLSearchParams(comuneSearchQuery);
fallbackSearchQuery.set('q', 'torino');

const mockSearchResponse = async (page: Page, payload: SearchResponsePayload): Promise<void> => {
  await page.route('**/v1/listings/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
};

test('mostra match esatto comune senza banner fallback', async ({ page }) => {
  await mockSearchResponse(page, exactMatchPayload);

  await page.goto(`/annunci?${comuneSearchQuery.toString()}`);

  await expect(page.getByRole('heading', { name: 'Trova il gatto giusto' })).toBeVisible();
  await expect(page.getByText('1 annunci trovati')).toBeVisible();
  await expect(page.getByText('Area selezionata: Torino (TO) - Comune')).toBeVisible();
  await expect(page.getByText('Nessun risultato esatto in')).toHaveCount(0);

  const detailLink = page.getByRole('link', { name: 'Apri dettaglio' }).first();
  await expect(detailLink).toHaveAttribute('href', '/annunci/listing-torino-1');
});

test('applica fallback comune -> provincia e mostra CTA dedicate', async ({ page }) => {
  await mockSearchResponse(page, fallbackPayload);

  await page.goto(`/annunci?${fallbackSearchQuery.toString()}`);

  await expect(page.getByText('Nessun risultato esatto in')).toBeVisible();
  await expect(page.getByText('Fallback: Provincia')).toBeVisible();
  await expect(page.getByText('Motivo: Area allargata al livello superiore')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usa area suggerita' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rimuovi filtri aggiuntivi' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerca in tutta Italia' })).toBeVisible();

  const detailLink = page.getByRole('link', { name: 'Apri dettaglio' }).first();
  await expect(detailLink).toHaveAttribute('href', '/annunci/listing-pinerolo-1');
});

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('rende fallback banner e drawer filtri su mobile', async ({ page }) => {
    await mockSearchResponse(page, fallbackPayload);

    await page.goto(`/annunci?${comuneSearchQuery.toString()}`);

    await expect(page.getByText('Nessun risultato esatto in')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filtri avanzati' })).toBeVisible();
  });
});
