# ARCHITECTURE.md

Documento sintetico per orientarsi nel repo senza dover inseguire piu file spec.

## Fonte di verita

- il codice e la fonte primaria
- questa documentazione descrive lo stato attuale del repo e le regole di estensione
- quando si cambia un contratto, una dipendenza di runtime o una feature core, questo file va riallineato

## Topologia di sistema

```text
apps/web ----\
              -> apps/api -> Postgres/PostGIS
apps/admin --/            -> Redis
                           -> OpenSearch
                           -> MinIO
                           -> Keycloak

apps/worker -> Postgres/Redis/OpenSearch/SMTP
```

Dettagli:

- `web` e `admin` sono app Next.js separate, con login e cookie di sessione distinti
- entrambe espongono route handler same-origin per autenticazione e proxy verso l'API
- `api` contiene tutta la logica di business persistente
- `worker` gestisce job asincroni: reindex search e consegna email della messaggistica

## Struttura del monorepo

### Apps

- `apps/web`
  - sito pubblico, discovery e workspace utente
  - usa route handler in `app/api/**` per evitare chiamate cross-origin dirette dal browser
- `apps/admin`
  - pannello admin/moderazione separato
  - RBAC lato UI e route handler dedicati per login e moderazione
- `apps/api`
  - API REST NestJS + Fastify
  - moduli implementati: `users`, `auth`, `geography`, `listings`, `moderation`, `messaging`, `analytics`, `promotions`, `security`
- `apps/worker`
  - worker standalone per notifiche email e reindex OpenSearch

### Packages

- `packages/config`: schema env con Zod per tutte le app
- `packages/sdk`: helper condivisi, incluso password grant Keycloak
- `packages/types`: tipi condivisi, inclusi `LocationIntent` e cataloghi
- `packages/ui`: primitive UI riusabili

## Moduli backend presenti

- `users`
  - profilo utente corrente
  - preferenze notifiche messaggi
- `auth`
  - ruoli, decorators, guard, integrazione token Keycloak
- `geography`
  - regioni, province, comuni, search semantica
- `listings`
  - CRUD annunci, media, catalogo pubblico, ricerca, contatto, razze
- `moderation`
  - queue e azioni admin/moderator
- `messaging`
  - thread 1:1 collegati agli annunci, SSE, typing, archive/delete
- `analytics`
  - eventi pubblici e KPI admin
- `promotions`
  - piani e assegnazioni boost, solo backend/admin API

## Frontend: modello delle route

Il sito `web` e organizzato per sezioni logiche, non ancora con route groups fisici dedicati:

- `marketing`
  - `/`
  - pagine istituzionali: `/chi-siamo`, `/faq`, `/contatti`, `/privacy`, `/termini`, `/cookie`, `/sicurezza`, `/lavora-con-noi`
- `discovery`
  - `/annunci`
  - `/annunci/[listingId]`
  - `/cerca`
- `auth`
  - `/login`
  - `/registrati`
  - `/password-dimenticata`
- `workspace`
  - `/account/**`
  - `/messaggi/**`
  - `/preferiti`
  - `/pubblica`
  - `/annunci/[listingId]/modifica`
- `system`
  - `/500`
  - `app/error.tsx`
  - `app/not-found.tsx`

Il controllo di visibilita per header/footer e sezioni passa oggi da `apps/web/components/shell-route-visibility.tsx`.

## Auth e sessioni

### Web/Admin

Flow attuale:

1. il form login posta a `/api/auth/login` dell'app Next
2. il route handler usa `packages/sdk` per fare password grant verso Keycloak
3. il token viene salvato in cookie HttpOnly dell'app (`WEB_SESSION_COOKIE_NAME` o `ADMIN_SESSION_COOKIE_NAME`)
4. server components e route handler interrogano `GET /v1/users/me` sull'API con `Authorization: Bearer`

### API

- in locale resta disponibile anche l'autenticazione via header di sviluppo se `AUTH_DEV_HEADERS_ENABLED=true`
- e utile per smoke script e curl, non per i flussi browser canonici

## Ricerca, dati geografici e media

- il dataset geografico versionato vive in `apps/api/data/geography/istat-current.json`
- `pnpm db:seed` popola geografia e demo listings
- la ricerca listings usa:
  - OpenSearch come percorso primario
  - fallback SQL quando OpenSearch non risponde
  - fallback geografico anti zero risultati tramite `LocationIntent`
- i media listing sono salvati su MinIO e referenziati nel database

## Messaggistica

- il backend espone REST + SSE sotto `/v1/messages`
- Redis serve per Pub/Sub realtime e typing state effimero
- il worker legge `notification_outbox` e invia email tramite SMTP/Mailpit
- il dettaglio completo e in `docs/MESSAGING.md`

## Mock mode e superfici parziali

Mock/fallback intenzionali:

- `NEXT_PUBLIC_USE_MOCKS=1` e attivo di default in `web` e `admin`
- web/admin fanno fallback a mock su errori di rete, `404`, `501` o `>= 502`
- superfici ancora parziali:
  - `web /registrati` e `/password-dimenticata`: informative only
  - `web /profilo/[username]`: dati venditore e recensioni mock
  - `web /preferiti`: stato locale browser, non server-synced
  - admin `utenti`, `segnalazioni`, `audit-log`, parte di `impostazioni`: mock o UI-first

## Regole di estensione

- nuove entita persistenti: migration SQL + repository/service/controller + test
- nuovi flussi browser autenticati: route handler same-origin, non fetch client-side diretto verso l'API
- nuovi tipi condivisi: `packages/types`
- nuove integrazioni auth/client condivise: `packages/sdk`
- nuovi token/env: `packages/config`
- ogni modifica a setup, contratti o superfici mock deve aggiornare `README.md` e il documento canonico pertinente

