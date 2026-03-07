# PROJECT_CONTEXT.md

Contesto tecnico canonico per coding agent AI.

## Fonte di verita

- il codice e la fonte primaria
- questa documentazione descrive lo stato reale del repository al 2026-03-07
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
- `apps/worker`: job asincroni (email outbox, retention, promotions lifecycle, search cleanup, riconciliazione identita utenti Keycloak->DB)
- `packages/config`: schema env condiviso con Zod
- `packages/sdk`: helper client condivisi (OIDC + client/tipi OpenAPI generati)
- `packages/types`: tipi condivisi
- `packages/ui`: componenti UI condivisi

## Stato prodotto

Implementato e operativo in locale:

- auth Keycloak web/admin con OIDC code flow + PKCE
- registrazione web (`/registrati`), verifica account (`/verifica-account`), recupero password (`/password-dimenticata`)
- endpoint API verifica telefono (`/v1/auth/phone-verification/request`, `/confirm`) con challenge OTP backend, lockout tentativi e delivery configurabile (`console|webhook|twilio`)
- route social provider-aware (`/api/auth/login/[provider]`, `/api/auth/register/[provider]`) con allow-list env + template IdP Google nel realm locale e provisioning idempotente via `pnpm auth:seed`
- dev web locale con default `next dev --webpack -p 3000`; verifica 2026-03-06: pagine auth pubbliche renderizzano correttamente anche con Turbopack (`pnpm dev:web:turbopack`)
- sessioni web/admin in cookie httpOnly separati
- logout hardenizzato: solo `POST /api/auth/logout`; `GET` disabilitato (`405`)
- CSRF guard su route auth BFF mutative (`Origin/Referer` same-origin)
- enforcement `emailVerified` su endpoint sensibili (listing owner mutativi + messaging)
- profile account persistente (`/v1/users/me/profile`) e upload avatar reale (`/v1/users/me/avatar`)
- consensi utente versionati e tracciabili (`/v1/users/me/consents`) con UI in `/account/impostazioni`
- sicurezza account con linked identities + sessioni attive (`/v1/users/me/linked-identities`, `/v1/users/me/sessions`) e azioni di unlink/revoke da `/account/sicurezza`
- preferiti account persistiti (`/v1/users/me/favorites`) con BFF web same-origin e sync multi-device
- geografia Italia seedata da snapshot ISTAT versionata
- listings CRUD + media MinIO + moderazione + ricerca OpenSearch con fallback SQL
- messaggistica privata con SSE + worker email
- retention, cleanup search, promotions lifecycle e riconciliazione identita utenti nel worker

Parziale o mock-backed:

- `web /profilo/[username]`: temporaneamente disabilitato in attesa di backend reale
- admin `utenti`, `segnalazioni`, `audit-log`, `impostazioni`, `admin/moderazione/[listingId]`: disabilitati finche non collegati a endpoint reali

Mancante:

- recensioni reali e profilo pubblico venditore reale
- ricerche salvate/recommendation
- consenso cookie/profilazione persistito backend

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
- snapshot operativo/alert baseline disponibili (`ops:metrics`, `ops:alerts`) per outbox, lag promotions e stato search
- pipeline OpenAPI/SDK tipizzata disponibile (`openapi:generate`, `openapi:check`) con drift check in CI
- retention schedulata su analytics, audit, outbox, contact requests, promotion events, thread deleted e thread inattivi archiviati
- lifecycle promotions schedulato (`scheduled -> active -> expired`) con sync search
- cleanup indici search inattivi schedulato
- riconciliazione periodica identita utenti Keycloak -> `app_users`/`user_linked_identities` schedulata con batch + advisory lock
- job worker core protetti da advisory lock PostgreSQL
- reindex search con keyset pagination (`id > last_id`)

## Runbook operativo minimo (R6)

Checklist monitoraggio periodico:

- eseguire `pnpm ops:metrics` e archiviare output JSON (outbox, promotions lag, search)
- eseguire `pnpm ops:alerts` in scheduler CI/cron (exit `1` su stato alert secondo `OPS_ALERT_FAIL_ON`)
- validare `GET /health` e `GET /health/search` da API edge monitor

Soglie baseline (env worker):

- `OPS_ALERT_OUTBOX_PENDING_WARN` (default `200`)
- `OPS_ALERT_OUTBOX_PROCESSING_STALE_CRITICAL` (default `10`)
- `OPS_ALERT_OUTBOX_FAILED_LAST_HOUR_WARN` (default `20`)
- `OPS_ALERT_OUTBOX_OLDEST_PENDING_SECONDS_WARN` (default `900`)
- `OPS_ALERT_PROMOTIONS_DUE_WARN` (default `50`)
- `OPS_ALERT_FAIL_ON` (`critical` default, opzionale `warning`)

Incident quick actions:

- backlog outbox alto: verificare worker `dev:worker`/deployment, SMTP e tabella `notification_outbox`
- promotions due backlog: eseguire `pnpm promotions:lifecycle` e verificare lock/worker loop
- search degradato o alias mancanti: eseguire `pnpm search:verify`, poi `pnpm search:reindex` e `pnpm search:cleanup`
- recovery dataset locale: `pnpm backup:verify` + `pnpm backup:restore -- --yes`

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
