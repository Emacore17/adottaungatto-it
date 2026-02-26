import type {
  ListingCardData,
  ListingType,
  SellerProfileData,
  SellerReview,
} from '@adottaungatto/types';

const toIso = (input: string) => new Date(input).toISOString();

const createListing = (
  id: string,
  title: string,
  listingType: ListingType,
  city: string,
  province: string,
  region: string,
  sellerUsername: string,
  mediaSeed: number,
  overrides: Partial<ListingCardData> = {},
): ListingCardData => ({
  id,
  slug: `${title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${id}`,
  title,
  description:
    'Gatto equilibrato, abituato alla casa, vaccinato e con microchip. Cerca una famiglia affidabile con disponibilita a pre-affido.',
  listingType,
  priceAmount: listingType === 'adozione' ? 0 : 40,
  currency: 'EUR',
  ageText: '2 anni',
  sex: 'Femmina',
  breed: 'Europeo',
  city,
  province,
  region,
  distanceKm: Number.parseFloat((mediaSeed * 1.8).toFixed(1)),
  publishedAt: toIso(`2026-02-${String(10 + mediaSeed).padStart(2, '0')}T10:00:00.000Z`),
  isVerifiedSeller: true,
  sellerUsername,
  media: [
    {
      id: `${id}-media-primary`,
      src: `/mock/cat-${((mediaSeed - 1) % 6) + 1}.svg`,
      alt: `Foto principale ${title}`,
      width: 1200,
      height: 800,
      isPrimary: true,
    },
    {
      id: `${id}-media-secondary`,
      src: `/mock/cat-${(mediaSeed % 6) + 1}.svg`,
      alt: `Foto secondaria ${title}`,
      width: 1200,
      height: 800,
      isPrimary: false,
    },
  ],
  ...overrides,
});

export const mockListings: ListingCardData[] = [
  createListing('101', 'Milo cerca casa a Roma', 'adozione', 'Roma', 'RM', 'Lazio', 'gattiroma', 1),
  createListing(
    '102',
    'Luna dolce e socievole',
    'adozione',
    'Milano',
    'MI',
    'Lombardia',
    'miaofamily',
    2,
    { sex: 'Maschio', ageText: '8 mesi' },
  ),
  createListing(
    '103',
    'Stallo urgente per Frida',
    'stallo',
    'Torino',
    'TO',
    'Piemonte',
    'rescuepiemonte',
    3,
    { priceAmount: null, sex: 'Femmina', ageText: '1 anno' },
  ),
  createListing(
    '104',
    'Segnalazione colonia da supportare',
    'segnalazione',
    'Napoli',
    'NA',
    'Campania',
    'catsolidale',
    4,
    { priceAmount: null, isVerifiedSeller: false, breed: null },
  ),
  createListing(
    '105',
    'Nora, carattere tranquillo',
    'adozione',
    'Bologna',
    'BO',
    'Emilia-Romagna',
    'miaofamily',
    5,
    { ageText: '3 anni' },
  ),
  createListing(
    '106',
    'Stallo temporaneo per Simba',
    'stallo',
    'Firenze',
    'FI',
    'Toscana',
    'gattiroma',
    6,
  ),
  createListing(
    '107',
    'Adozione con preaffido Verona',
    'adozione',
    'Verona',
    'VR',
    'Veneto',
    'adozioniveneto',
    3,
  ),
  createListing(
    '108',
    'Micia sterilizzata e vaccinata',
    'adozione',
    'Bari',
    'BA',
    'Puglia',
    'catsolidale',
    2,
    { ageText: '4 anni' },
  ),
  createListing(
    '109',
    'Segnalazione cucciolata in provincia',
    'segnalazione',
    'Perugia',
    'PG',
    'Umbria',
    'rescuepiemonte',
    1,
    { priceAmount: null, ageText: '4 mesi' },
  ),
  createListing(
    '110',
    'Adozione responsabile a Genova',
    'adozione',
    'Genova',
    'GE',
    'Liguria',
    'gattiliguria',
    5,
  ),
];

export const mockSellerProfiles: SellerProfileData[] = [
  {
    username: 'gattiroma',
    displayName: 'Gatti Roma Rescue',
    locationLabel: 'Roma, Lazio',
    verified: true,
    ratingAverage: 4.8,
    reviewsCount: 42,
    responseRatePct: 94,
    responseTimeLabel: 'entro 2 ore',
    joinedAt: toIso('2024-04-11T08:00:00.000Z'),
    bio: 'Associazione locale con focus su adozioni controllate e percorsi pre-affido.',
  },
  {
    username: 'miaofamily',
    displayName: 'Miao Family Milano',
    locationLabel: 'Milano, Lombardia',
    verified: true,
    ratingAverage: 4.7,
    reviewsCount: 19,
    responseRatePct: 89,
    responseTimeLabel: 'entro 4 ore',
    joinedAt: toIso('2025-01-15T09:15:00.000Z'),
    bio: 'Network di volontari per adozioni tracciate e supporto post-affido.',
  },
  {
    username: 'rescuepiemonte',
    displayName: 'Rescue Piemonte',
    locationLabel: 'Torino, Piemonte',
    verified: true,
    ratingAverage: 4.6,
    reviewsCount: 27,
    responseRatePct: 91,
    responseTimeLabel: 'entro 3 ore',
    joinedAt: toIso('2023-10-04T12:00:00.000Z'),
    bio: 'Team specializzato in stalli urgenti e adozioni interprovinciali.',
  },
  {
    username: 'catsolidale',
    displayName: 'Cat Solidale',
    locationLabel: 'Napoli, Campania',
    verified: false,
    ratingAverage: 4.4,
    reviewsCount: 14,
    responseRatePct: 84,
    responseTimeLabel: 'entro 8 ore',
    joinedAt: toIso('2025-02-20T12:00:00.000Z'),
    bio: 'Volontari indipendenti attivi su segnalazioni e supporto veterinario.',
  },
];

export const mockSellerReviews: SellerReview[] = [
  {
    id: 'review-1',
    sellerUsername: 'gattiroma',
    author: 'Chiara M.',
    rating: 5,
    comment: 'Affido seguito in modo serio e professionale, supporto anche dopo l adozione.',
    createdAt: toIso('2026-02-20T09:00:00.000Z'),
  },
  {
    id: 'review-2',
    sellerUsername: 'gattiroma',
    author: 'Paolo T.',
    rating: 4,
    comment: 'Comunicazione rapida, processo chiaro e trasparente.',
    createdAt: toIso('2026-02-02T18:10:00.000Z'),
  },
  {
    id: 'review-3',
    sellerUsername: 'miaofamily',
    author: 'Martina F.',
    rating: 5,
    comment: 'Mi hanno guidata in ogni passaggio. Esperienza ottima.',
    createdAt: toIso('2026-01-25T14:00:00.000Z'),
  },
  {
    id: 'review-4',
    sellerUsername: 'rescuepiemonte',
    author: 'Luca P.',
    rating: 4,
    comment: 'Ottima disponibilita sugli orari e supporto veterinario preciso.',
    createdAt: toIso('2026-01-11T11:30:00.000Z'),
  },
];

const findById = (listingId: string) =>
  mockListings.find((listing) => listing.id === listingId) ?? null;

export const findMockListingBySlug = (slug: string) => {
  const normalizedSlug = slug.trim().toLowerCase();
  const bySlug = mockListings.find((listing) => listing.slug === normalizedSlug);
  if (bySlug) {
    return bySlug;
  }

  const maybeId = normalizedSlug.split('-').at(-1) ?? normalizedSlug;
  return findById(maybeId);
};

export const findMockSellerProfile = (username: string) =>
  mockSellerProfiles.find((profile) => profile.username === username) ?? null;

export const findMockReviewsBySeller = (username: string) =>
  mockSellerReviews.filter((review) => review.sellerUsername === username);

export const findMockListingsBySeller = (username: string) =>
  mockListings.filter((listing) => listing.sellerUsername === username);

export const findMockRecommendedListings = (listingId: string) =>
  mockListings.filter((listing) => listing.id !== listingId).slice(0, 4);
