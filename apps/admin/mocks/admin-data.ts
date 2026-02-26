import type { AdminKpiCard, AdminModerationListing, AdminTrendPoint } from '@adottaungatto/types';

const toIso = (input: string) => new Date(input).toISOString();

export const mockAdminKpis: AdminKpiCard[] = [
  {
    id: 'kpi-listings-live',
    label: 'Annunci pubblicati',
    value: 1248,
    trendLabel: '+8.4% vs settimana scorsa',
    trendDirection: 'up',
  },
  {
    id: 'kpi-pending-review',
    label: 'In moderazione',
    value: 38,
    trendLabel: '-12% backlog',
    trendDirection: 'down',
  },
  {
    id: 'kpi-contact-rate',
    label: 'Contact rate',
    value: '4.6%',
    trendLabel: '+0.8 punti',
    trendDirection: 'up',
  },
  {
    id: 'kpi-reports',
    label: 'Segnalazioni aperte',
    value: 17,
    trendLabel: 'stabile',
    trendDirection: 'neutral',
  },
];

export const mockAdminTrend: AdminTrendPoint[] = [
  { id: 'trend-1', label: 'Lun', value: 21 },
  { id: 'trend-2', label: 'Mar', value: 18 },
  { id: 'trend-3', label: 'Mer', value: 26 },
  { id: 'trend-4', label: 'Gio', value: 24 },
  { id: 'trend-5', label: 'Ven', value: 28 },
  { id: 'trend-6', label: 'Sab', value: 16 },
  { id: 'trend-7', label: 'Dom', value: 12 },
];

export const mockModerationListings: AdminModerationListing[] = [
  {
    id: '901',
    listingTitle: 'Cuccioli trovati in provincia',
    sellerUsername: 'catsolidale',
    sellerVerified: false,
    submittedAt: toIso('2026-02-25T10:15:00.000Z'),
    city: 'Napoli',
    province: 'NA',
    reasonHint: 'Descrizione incompleta e foto duplicate.',
    media: [
      {
        id: '901-media-1',
        src: '/mock/cat-1.svg',
        alt: 'Preview annuncio 901',
        width: 1200,
        height: 800,
      },
    ],
  },
  {
    id: '902',
    listingTitle: 'Adozione urgente zona Milano',
    sellerUsername: 'miaofamily',
    sellerVerified: true,
    submittedAt: toIso('2026-02-25T08:50:00.000Z'),
    city: 'Milano',
    province: 'MI',
    reasonHint: 'Richiesto check policy prezzo.',
    media: [
      {
        id: '902-media-1',
        src: '/mock/cat-2.svg',
        alt: 'Preview annuncio 902',
        width: 1200,
        height: 800,
      },
    ],
  },
  {
    id: '903',
    listingTitle: 'Stallo temporaneo Torino centro',
    sellerUsername: 'rescuepiemonte',
    sellerVerified: true,
    submittedAt: toIso('2026-02-24T19:20:00.000Z'),
    city: 'Torino',
    province: 'TO',
    reasonHint: 'Confermare recapiti inserzionista.',
    media: [
      {
        id: '903-media-1',
        src: '/mock/cat-3.svg',
        alt: 'Preview annuncio 903',
        width: 1200,
        height: 800,
      },
    ],
  },
];

export const mockAuditLog = [
  {
    id: 'audit-1',
    actor: 'moderator.demo',
    action: 'approve',
    targetId: '892',
    reason: 'Contenuti completi e conformi policy.',
    createdAt: toIso('2026-02-25T17:01:00.000Z'),
  },
  {
    id: 'audit-2',
    actor: 'admin.demo',
    action: 'reject',
    targetId: '883',
    reason: 'Foto non pertinenti al listing.',
    createdAt: toIso('2026-02-25T14:40:00.000Z'),
  },
  {
    id: 'audit-3',
    actor: 'moderator.demo',
    action: 'suspend',
    targetId: '870',
    reason: 'Segnalazioni multiple da utenti.',
    createdAt: toIso('2026-02-24T11:10:00.000Z'),
  },
];

export const mockUsers = [
  {
    id: 'u-1001',
    username: 'gattiroma',
    role: 'seller',
    verified: true,
    listingsCount: 24,
    reports: 0,
  },
  {
    id: 'u-1002',
    username: 'miaofamily',
    role: 'seller',
    verified: true,
    listingsCount: 12,
    reports: 1,
  },
  {
    id: 'u-1003',
    username: 'catsolidale',
    role: 'seller',
    verified: false,
    listingsCount: 6,
    reports: 3,
  },
];

export const mockReports = [
  {
    id: 'rep-1',
    listingId: '901',
    reason: 'Foto fuorvianti',
    status: 'open',
    createdAt: toIso('2026-02-25T09:00:00.000Z'),
  },
  {
    id: 'rep-2',
    listingId: '870',
    reason: 'Contatto sospetto',
    status: 'investigating',
    createdAt: toIso('2026-02-24T18:30:00.000Z'),
  },
];
