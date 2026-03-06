# adottaungatto-it

Monorepo local-first per il marketplace `web + admin + api + worker` dedicato ad annunci per gatti.

## Stato rapido

Implementato e usabile in locale:

- autenticazione Keycloak con sessioni separate `web` e `admin`
- registrazione account e recupero password disponibili nel web pubblico
- endpoint API di verifica telefono disponibili (`/v1/auth/phone-verification/request`, `/confirm`) con lockout tentativi
- delivery OTP telefono configurabile via provider (`PHONE_VERIFICATION_DELIVERY_PROVIDER=console|webhook|twilio`), con `devCode` in sviluppo
- predisposizione social login web con route provider-aware (`/api/auth/login/[provider]`, `/api/auth/register/[provider]`) e CTA Google condizionale via `KEYCLOAK_SOCIAL_PROVIDERS`
- deduplicazione utenti applicativi su identita verificate (`email` uguale, `provider_subject` diverso) per evitare duplicati tra login standard/social
- profilo account persistente in `/account/impostazioni` (dati personali + avatar key + notifiche messaggi)
- geografia Italia da snapshot ISTAT versionata nel repo
- CRUD annunci, media MinIO, moderazione, ricerca pubblica, contatto inserzionista
- messaggistica privata (REST + SSE + worker email)
- analytics e promotions lato backend

Parziale o mock-backed:

- profilo pubblico venditore e recensioni usano mock
- preferiti solo browser-local (`localStorage`)
- pagine admin `utenti`, `segnalazioni`, `audit-log`, parte di `impostazioni` ancora mock/UI-first

Assente:

- backend preferiti server-side
- ricerche salvate e recommendation
- consenso cookie/profilazione persistito lato backend

## Stack

- frontend pubblico: Next.js 16 + React 19 + Tailwind + TanStack Query
- frontend admin: Next.js 16 + React 19 + Tailwind
- backend: NestJS 11 + Fastify
- worker: NestJS standalone
- infra locale: PostgreSQL/PostGIS, Redis, OpenSearch, MinIO, Keycloak, Mailpit
- workspace: pnpm + Turborepo

## Mappa repo

- `apps/web`: sito pubblico e workspace utente
- `apps/admin`: pannello admin/moderazione
- `apps/api`: API REST `/v1`
- `apps/worker`: notifiche email, retention cleanup, promotions lifecycle, reindex/cleanup search
- `packages/config`: validazione env condivisa
- `packages/sdk`: helper client condivisi (incluso login Keycloak)
- `packages/types`: tipi condivisi
- `packages/ui`: componenti UI condivisi

## Setup rapido

Prerequisiti:

- Node.js 22
- pnpm 10
- Docker Desktop

1. Install dipendenze:

```bash
pnpm install
```

2. Copia env locali:

```powershell
Copy-Item .env.example .env.local
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/api/.env.example apps/api/.env.local
Copy-Item apps/worker/.env.example apps/worker/.env.local
```

3. Avvio infrastruttura:

```bash
pnpm infra:up
```

4. Bootstrap dati:

```bash
pnpm db:migrate
pnpm db:seed
pnpm auth:seed
pnpm minio:bootstrap
```

5. Avvio app:

```bash
pnpm dev
```

Note operative:

- `NEXT_PUBLIC_USE_MOCKS=1` e attivo di default in `web` e `admin`
- `apps/web` mantiene `next dev --webpack` come default locale prudenziale; verifica locale del 2026-03-06: `/login`, `/registrati`, `/password-dimenticata`, `/verifica-account` renderizzano correttamente anche con `pnpm dev:web:turbopack` e con `pnpm dev` root
- se le pagine auth non renderizzano: verificare che `web` sia attivo su `localhost:3000`, chiudere processi Next duplicati e rilanciare `pnpm dev:web`
- la ricerca usa OpenSearch come primario con fallback SQL
- `pnpm search:reindex` crea un indice versionato e fa swap atomico di `listings_read` / `listings_write`
- `pnpm search:cleanup` elimina indici `listings_v*` inattivi oltre la finestra di rollback
- `pnpm search:verify` verifica drift tra DB e OpenSearch
- `pnpm cleanup:retention` esegue retention run-once su analytics, audit, outbox, contact requests, promotion events, thread soft-deleted e thread inattivi archiviati
- `pnpm backup:smoke` testa backup/restore locale minimo (Postgres + MinIO)
- `pnpm backup:restore -- --yes` ripristina DB+MinIO dall'ultimo backup locale e rilancia il rebuild search
  - comando distruttivo sul dataset locale corrente (conferma obbligatoria `--yes`)
- nel realm Keycloak baseline i direct grants sono disabilitati (`directAccessGrantsEnabled=false`) su web/admin/mobile

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

## Comandi usati spesso

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:web:turbopack`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm dev:worker`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm auth:seed`
- `pnpm minio:bootstrap`
- `pnpm search:reindex`
- `pnpm search:cleanup`
- `pnpm search:verify`
- `pnpm cleanup:retention`
- `pnpm backup:create`
- `pnpm backup:verify`
- `pnpm backup:restore -- --yes`
- `pnpm backup:smoke`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:e2e:web`
- `pnpm test:smoke:auth`
- `pnpm test:smoke:web:auth-pages`

## Documentazione canonica

- `docs/README.md`: indice rapido e ordine di lettura
- `docs/PROJECT_CONTEXT.md`: contesto tecnico unico per agenti AI (architettura, stato, regole, priorita)
- `docs/DEVELOPMENT_ROADMAP.md`: backlog unico per i prossimi sviluppi (auth, backend, web/admin)
- `docs/AUTH_REGISTRATION_AGENT_GUIDE.md`: guida esecutiva auth/onboarding/account (UI, backend, dati, sicurezza)
- `docs/API_CONTRACT.md`: contratti endpoint e payload realmente supportati
- `docs/TESTING.md`: test e smoke reali disponibili oggi
- `docs/MESSAGING.md`: dominio messaggistica (modello, flussi, limiti)
- `docs/DATA_GEO_ITALIA.md`: snapshot ISTAT, sync e seed geografia

## Regole di lavoro

- se codice e doc divergono, il codice vince e la doc si aggiorna nello stesso change
- logica di business persistente in `apps/api`, non nei route handler Next
- per browser, preferire route handler same-origin in `apps/web/app/api` e `apps/admin/app/api`
- ogni modifica a contratti, setup o workflow locali deve aggiornare i documenti canonici coinvolti
