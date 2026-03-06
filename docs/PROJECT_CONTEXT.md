# PROJECT_CONTEXT.md

Contesto tecnico canonico per coding agent AI.

## Fonte di verita

- il codice e la fonte primaria
- questa documentazione descrive lo stato reale del repository al 2026-03-06
- quando cambia runtime, contratto o setup locale, la doc si aggiorna nello stesso change

## Set documentale canonico (ridotto)

- il set documentale supportato e quello indicato in `docs/README.md`
- evitare reintroduzione di piani paralleli o documenti duplicati
- per contenere il contesto agente AI, aggiornare file esistenti invece di crearne di nuovi

## Topologia sistema

```text
apps/web ----\
              -> apps/api -> Postgres/PostGIS
apps/admin --/            -> Redis
                           -> OpenSearch
                           -> MinIO
                           -> Keycloak

apps/worker -> Postgres/Redis/OpenSearch/SMTP
```

## Struttura monorepo

- `apps/web`: frontend pubblico + workspace utente
- `apps/admin`: frontend admin/moderazione
- `apps/api`: API NestJS/Fastify (`/v1`) con logica persistente
- `apps/worker`: job asincroni (email outbox, retention, promotions lifecycle, search cleanup)
- `packages/config`: schema env condiviso con Zod
- `packages/sdk`: helper client condivisi (OIDC incluso)
- `packages/types`: tipi condivisi
- `packages/ui`: componenti UI condivisi

## Stato prodotto

Implementato e operativo in locale:

- auth Keycloak web/admin con OIDC code flow + PKCE
- registrazione web (`/registrati`), verifica account (`/verifica-account`), recupero password (`/password-dimenticata`)
- endpoint API verifica telefono (`/v1/auth/phone-verification/request`, `/confirm`) con challenge OTP backend, lockout tentativi e delivery configurabile (`console|webhook|twilio`)
- route social provider-aware (`/api/auth/login/[provider]`, `/api/auth/register/[provider]`) con allow-list env
- dev web locale con default `next dev --webpack -p 3000`; verifica 2026-03-06: pagine auth pubbliche renderizzano correttamente anche con Turbopack (`pnpm dev:web:turbopack`)
- sessioni web/admin in cookie httpOnly separati
- logout hardenizzato: solo `POST /api/auth/logout`; `GET` disabilitato (`405`)
- CSRF guard su route auth BFF mutative (`Origin/Referer` same-origin)
- enforcement `emailVerified` su endpoint sensibili (listing owner mutativi + messaging)
- profile account persistente (`/v1/users/me/profile`) e avatar key (`/v1/users/me/avatar`)
- geografia Italia seedata da snapshot ISTAT versionata
- listings CRUD + media MinIO + moderazione + ricerca OpenSearch con fallback SQL
- messaggistica privata con SSE + worker email
- retention, cleanup search e promotions lifecycle nel worker

Parziale o mock-backed:

- `web /profilo/[username]` e recensioni venditore: mock
- `web /preferiti`: solo `localStorage`
- admin `utenti`, `segnalazioni`, `audit-log`, parte `impostazioni`: mock/UI-first

Mancante:

- preferiti server-side
- recensioni reali e profilo pubblico venditore reale
- ricerche salvate/recommendation
- consenso cookie/profilazione persistito backend
- OpenAPI/SDK generati da sorgente

## Vincoli architetturali

- business logic persistente in `apps/api`, non nei route handler Next
- browser -> API tramite route handler same-origin (`apps/web/app/api/**`, `apps/admin/app/api/**`)
- separare ID pubblico (`providerSubject`) da ID DB interno (`app_users.id`)
- per search usare alias `listings_read` / `listings_write`; rebuild canonico: `pnpm search:reindex`
- ogni feature persistente deve includere:
  - migration SQL
  - repository/service/controller coerenti
  - test o smoke osservabile
  - update documentazione canonica

## Stato operativo backend/worker

- backup locale minimo disponibile (`backup:create`, `backup:verify`, `backup:restore -- --yes`, `backup:smoke`)
- retention schedulata su analytics, audit, outbox, contact requests, promotion events, thread deleted e thread inattivi archiviati
- lifecycle promotions schedulato (`scheduled -> active -> expired`) con sync search
- cleanup indici search inattivi schedulato
- job worker core protetti da advisory lock PostgreSQL
- reindex search con keyset pagination (`id > last_id`)

## Priorita aperte

Priorita e ordine di esecuzione vivono in `docs/DEVELOPMENT_ROADMAP.md`.

## Checklist rapida per ogni change

- codice e test passano in locale
- comportamento verificato (test/smoke/check manuale)
- nessun nuovo mock non dichiarato
- documentazione canonica aggiornata:
  - `README.md`
  - `docs/PROJECT_CONTEXT.md` se cambia contesto/architettura
  - `docs/DEVELOPMENT_ROADMAP.md` se cambia backlog/priorita
  - `docs/AUTH_REGISTRATION_AGENT_GUIDE.md` se cambia onboarding/auth/account
  - `docs/API_CONTRACT.md` se cambia API
  - `docs/TESTING.md` se cambia strategia test/smoke
  - `docs/MESSAGING.md` se cambia dominio chat
  - `docs/DATA_GEO_ITALIA.md` se cambia pipeline geografia
