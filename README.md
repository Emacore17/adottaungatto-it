# adottaungatto-it

Monorepo local-first per il marketplace `web + admin + api + worker` di annunci dedicati ai gatti.

## Stato attuale

Implementato e usabile in locale:

- autenticazione Keycloak con sessioni separate per `web` e `admin`
- dataset geografico Italia con seed ISTAT versionato
- CRUD annunci, media, moderazione, ricerca pubblica, contatto inserzionista
- messaggistica privata con SSE, Redis e worker email
- analytics e promotions lato backend

Parziale o ancora mock-backed:

- `registrati` e `password-dimenticata` sono pagine informative, non flussi completi
- profilo pubblico venditore e recensioni usano mock locali
- preferiti sono persistiti nel browser corrente, non sul backend
- backend assente per ricerche salvate, recommendation/profilazione e consenso cookie persistito
- diverse pagine admin (`utenti`, `segnalazioni`, `audit-log`, parte di `impostazioni`) sono ancora UI-first o mock-backed

## Stack

- frontend pubblico: Next.js 16, React 19, Tailwind, TanStack Query
- frontend admin: Next.js 16, React 19, Tailwind
- backend: NestJS 11 + Fastify
- worker: NestJS standalone
- infra locale: PostgreSQL/PostGIS, Redis, OpenSearch, MinIO, Keycloak, Mailpit
- workspace: pnpm + Turborepo

## Mappa repo

- `apps/web`: sito pubblico e workspace utente
- `apps/admin`: pannello moderazione/admin
- `apps/api`: API REST versionata `/v1`
- `apps/worker`: reindex search, cleanup indici search inattivi, notifiche email e cleanup retention
- `packages/config`: validazione env condivisa
- `packages/sdk`: helper client condivisi, incluso login Keycloak
- `packages/types`: tipi condivisi
- `packages/ui`: primitive UI condivise

## Setup rapido

Prerequisiti:

- Node.js 22
- pnpm 10
- Docker Desktop

1. Installare dipendenze:

```bash
pnpm install
```

2. Copiare gli env locali:

```powershell
Copy-Item .env.example .env.local
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/api/.env.example apps/api/.env.local
Copy-Item apps/worker/.env.example apps/worker/.env.local
```

3. Avviare l'infrastruttura:

```bash
pnpm infra:up
```

4. Preparare i dati locali:

```bash
pnpm db:migrate
pnpm db:seed
pnpm auth:seed
pnpm minio:bootstrap
```

5. Avviare le app:

```bash
pnpm dev
```

Note operative:

- `NEXT_PUBLIC_USE_MOCKS=1` e attivo di default in `web` e `admin`
- la ricerca usa OpenSearch come motore primario, ma ha fallback SQL lato API
- per riallineare l'indice search dopo modifiche dati rilevanti usare `pnpm search:reindex`: crea un indice versionato e fa swap atomico di `listings_read` e `listings_write`
- `pnpm search:cleanup` esegue un ciclo manuale di cleanup degli indici `listings_v*` non piu referenziati dagli alias, mantenendo una finestra minima di rollback
- `pnpm search:verify` confronta gli ID annunci `published` nel DB con i documenti presenti dietro `listings_read` e fallisce se rileva drift
- `pnpm cleanup:retention` esegue un ciclo di purge locale per analytics, audit log, outbox concluso e thread chat gia soft-deleted
- `pnpm backup:smoke` crea un backup locale minimo e verifica restore Postgres + MinIO in isolamento sotto `apps/api/backups/local`
- il restore search oggi non usa snapshot OpenSearch: la strategia documentata e rebuild alias-safe da DB con `pnpm search:reindex`
- per audit backend, hardening dati e priorita prod usare `docs/BACKEND_GUIDE.md`

## URL locali

- web: `http://localhost:3000`
- admin: `http://localhost:3001`
- api: `http://localhost:3002`
- api health: `http://localhost:3002/health`
- api search health: `http://localhost:3002/health/search`
- OpenSearch: `http://localhost:9200`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Keycloak: `http://localhost:8080`
- Mailpit UI: `http://localhost:8025`

## Credenziali demo

- `utente.demo / demo1234`
- `moderatore.demo / demo1234`
- `admin.demo / demo1234`

## Comandi piu usati

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm dev:worker`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm auth:seed`
- `pnpm auth:token <username> <password> <clientId>`
- `pnpm minio:bootstrap`
- `pnpm search:reindex`
- `pnpm search:cleanup`
- `pnpm search:verify`
- `pnpm cleanup:retention`
- `pnpm backup:create`
- `pnpm backup:verify`
- `pnpm backup:smoke`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:e2e:web`

## Documentazione canonica

- `README.md`: entrypoint rapido e stato del progetto
- `docs/ARCHITECTURE.md`: architettura reale del repo e confini tra app/packages
- `docs/BACKEND_GUIDE.md`: audit backend canonico, gap reali, hardening dati e priorita tecniche
- `docs/ROADMAP.md`: scope attuale, gap noti e priorita dei prossimi sviluppi
- `docs/FRONTEND_GUIDE.md`: regole per web/admin, route model e superfici mock/reali
- `docs/API_CONTRACT.md`: mappa endpoint e contratti API da trattare come canonici
- `docs/TESTING.md`: comandi, suite reali e smoke/manual check correnti
- `docs/DATA_GEO_ITALIA.md`: dataset geografico, snapshot e seed
- `docs/MESSAGING.md`: architettura e limiti della messaggistica privata

## Regole di lavoro

- se codice e doc divergono, il codice vince e la doc va aggiornata nello stesso change
- logica di business persistente in `apps/api`, non nei route handler Next
- per il browser preferire route handler same-origin in `apps/web/app/api` e `apps/admin/app/api`
- ogni modifica a contratti, setup o workflow locali deve aggiornare almeno uno dei documenti canonici
