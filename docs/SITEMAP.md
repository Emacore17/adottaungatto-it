# SITEMAP.md

Mappa route aggiornata (web + area utente + admin) per adottaungatto-it.

## Web pubblico

- `/` Home premium: hero con ricerca centrale, sezioni curate, annunci in evidenza, policy, sicurezza, testimonianze.
- `/cerca` Ricerca annunci core: filtri, sorting, chips attivi, drawer mobile, stati loading/empty/error.
- `/annunci` Alias ricerca con stesso motore di `/cerca`.
- `/annunci/[slug]` Dettaglio annuncio core: gallery, CTA contatto sticky mobile, blocco inserzionista, recensioni mock, consigliati.
- `/annunci/[id]/modifica` Modifica annuncio (wizard UI mock-safe).
- `/pubblica` Wizard pubblicazione annuncio.
- `/profilo/[username]` Profilo inserzionista: rating/recensioni mock + annunci pubblicati.
- `/preferiti` Lista preferiti mock funzionale (aggiungi/rimuovi).
- `/messaggi` Inbox thread mock.
- `/messaggi/[threadId]` Chat thread mock con invio messaggi locale.

## Area utente

- `/account` Dashboard account.
- `/account/annunci` I miei annunci (stato + link modifica).
- `/account/impostazioni` Dati profilo e preferenze.
- `/account/sicurezza` Password, sessioni e placeholder 2FA.
- `/account/listings` Legacy redirect a `/account/annunci`.
- `/account/listings/new` Legacy redirect a `/pubblica`.
- `/account/listings/[listingId]` Dettaglio privato legacy.
- `/account/listings/submitted` Conferma invio annuncio.

## Auth

- `/login` Login premium.
- `/registrati` Registrazione (UI pronta, backend progressivo).
- `/password-dimenticata` Recupero password (UI placeholder).

## Istituzionali e supporto

- `/chi-siamo`
- `/faq`
- `/contatti`
- `/privacy`
- `/termini`
- `/cookie`
- `/sicurezza`
- `/lavora-con-noi`
- `/maintenance` Pagina manutenzione.

## Sistema (web)

- `/404` gestita da `app/not-found.tsx`.
- `/500` pagina errore server dedicata.
- `app/error.tsx` error boundary globale con retry.

## Admin (RBAC UI)

- `/admin` Dashboard KPI (API -> fallback mock).
- `/admin/moderazione` Coda moderazione.
- `/admin/moderazione/[listingId]` Dettaglio moderazione con media e azioni.
- `/admin/utenti` Lista utenti (mock quando endpoint non pronto).
- `/admin/segnalazioni` Lista segnalazioni (mock).
- `/admin/impostazioni` Config policy/cataloghi (UI mock-safe).
- `/admin/audit-log` Audit log moderazione (mock).

## Admin accesso e sistema

- `/login` Login admin.
- `/unauthorized` Access denied per ruoli non autorizzati.
- `/moderation` legacy redirect a `/admin/moderazione`.
- `/analytics` legacy redirect a `/admin`.
- `/404` gestita da `apps/admin/app/not-found.tsx`.
- `/500` pagina errore server admin.

## Mock/fallback

- Flag: `NEXT_PUBLIC_USE_MOCKS=1`.
- Regola: tentativo endpoint reale prima; fallback automatico a mock su endpoint non pronto/non disponibile.
- Feature mock coperte: preferiti, messaggi (thread+chat), recensioni venditore, notifiche, KPI/admin queue utenti/segnalazioni/audit.
