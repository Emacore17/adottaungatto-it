# Analisi Completa Stato Progetto e Piano di Completamento

Data analisi: 2026-03-07
Repository: `adottaungatto-it`

## 1) Metodo di analisi usato

Analisi effettuata su:

- documentazione canonica (`README.md`, `docs/PROJECT_CONTEXT.md`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/AUTH_REGISTRATION_AGENT_GUIDE.md`, `docs/API_CONTRACT.md`, `docs/TESTING.md`)
- scansione codice `apps/web`, `apps/admin`, `apps/api`, `apps/worker`, `packages/*`
- verifica migrazioni SQL disponibili in `apps/api/migrations`
- verifica workflow CI in `.github/workflows/ci.yml`
- esecuzione comandi tecnici principali:
  - `pnpm typecheck` (OK)
  - `pnpm test` (OK)
  - `pnpm test:e2e:web` (KO iniziale per browser Playwright mancante, poi rilanciato con browser installato: 13 pass, 2 fail, 2 skip)

## 2) Stato attuale sintetico

Il progetto e gia avanzato e usabile in locale su aree core:

- auth OIDC web/admin, registrazione, recovery password, verifica email, verifica telefono OTP (API + BFF + UI base)
- CRUD annunci, moderazione core, search OpenSearch + fallback SQL
- messaging con SSE e worker notifiche
- infra locale completa (Postgres, Redis, OpenSearch, MinIO, Keycloak, Mailpit)

Il completamento "end-to-end prodotto" non e ancora chiuso perche restano gap funzionali, operativi e di test automation.

## 3) Gap principali da chiudere

## G1 - Superfici mock ancora presenti (prodotto non totalmente reale)

Evidenze:

- `apps/admin/app/admin/utenti/page.tsx`
- `apps/admin/app/admin/segnalazioni/page.tsx`
- `apps/admin/app/admin/audit-log/page.tsx`
- `apps/admin/app/admin/impostazioni/page.tsx`
- `apps/web/app/profilo/[username]/page.tsx` (profilo venditore + recensioni da mock)
- `apps/web/app/preferiti/page.tsx` + `apps/web/lib/favorites-storage.ts` (persistenza `localStorage`)

Impatto:

- funzionalita chiave visibili all’utente non supportate da backend reale
- rischio disallineamento UX tra ambiente demo e produzione

Priorita: P0/P1 (alta)

## G2 - Preferiti server-side mancanti

Evidenze:

- pagina preferiti usa storage locale browser (`FAVORITES_STORAGE_KEY`)
- API web `/api/favorites/listings` legge ID da query, non da stato utente persistito

Impatto:

- nessuna sincronizzazione multi-device
- nessuna consistenza tra sessioni/dispositivi

Priorita: P1

## G3 - Consensi privacy/versioning assenti

Evidenze:

- `docs/DEVELOPMENT_ROADMAP.md` e `docs/AUTH_REGISTRATION_AGENT_GUIDE.md` li marcano come aperti
- nessuna migration `user_consents` in `apps/api/migrations`
- nessun endpoint `GET/PATCH /v1/users/me/consents` implementato

Impatto:

- gap compliance/privacy
- tracciabilita consenso non auditabile nel tempo

Priorita: P0/P1 (dipende da requisiti legali go-live)

## G4 - Avatar upload reale non implementato

Evidenze:

- `apps/web/components/profile-settings-form.tsx` usa `avatarStorageKey` testuale
- `apps/api/src/users/users.controller.ts` espone solo `POST /me/avatar` con stringa storage key

Impatto:

- esperienza utente incompleta
- flusso upload media profilo non reale

Priorita: P1

## G5 - Social login reale quasi chiuso

Evidenze:

- route provider-aware presenti in web BFF con fallback `social_provider_unavailable`
- realm locale ora include template IdP Google (`infra/keycloak/adottaungatto-realm.json`, disabilitato di default)
- provisioning IdP Google idempotente in `pnpm auth:seed` (env-gated)
- smoke Playwright dedicata presente (`apps/web/tests/e2e/social-auth-smoke.spec.ts`)

Impatto:

- per locale/stage manca solo configurare credenziali Google reali in ambiente (segreti esterni)

Priorita: P1

## G6 - Linked identities e session management avanzato incompleti

Evidenze:

- dedup/linking via email verificata presente (`apps/api/src/users/upsert-app-user-by-identity.ts`)
- mancano API esplicite per listing/link/unlink provider e gestione sessioni utente
- manca job periodico di riconciliazione Keycloak -> DB

Impatto:

- gestione identita federate non governata in modo completo
- audit e controllo account avanzato incompleti

Priorita: P1

## G7 - OpenAPI/SDK generata assenti

Evidenze:

- `docs/PROJECT_CONTEXT.md` lo dichiara mancante
- nessuna traccia di pipeline OpenAPI/codegen nel codice

Impatto:

- rischio drift tra contratto API e client
- integrazioni future piu lente

Priorita: P1

## G8 - Gap test/E2E

Evidenze reali da run locale:

- `pnpm test` OK
- `pnpm test:e2e:web`:
  - inizialmente KO: browser Playwright mancante (dipendenza runtime locale non bootstrapata)
  - dopo install browser: 13 pass, 2 fail, 2 skip
- fail correnti:
  - `apps/web/tests/e2e/scaffold-smoke.spec.ts:28` (atteso bottone "Continua con account", UI attuale espone link)
  - `apps/web/tests/e2e/scaffold-smoke.spec.ts:129` (assert su espansione filtri mobile fragile/outdated)
- auth E2E smoke e `skip` di default senza `E2E_WEB_AUTH_SMOKE=1`

Impatto:

- pipeline E2E non abbastanza affidabile come gate regressioni UI
- rischio falsi negativi/positivi sui cambi frontend

Priorita: P0 (stabilita quality gate)

## G9 - Operativita produzione non ancora completa

Evidenze:

- roadmap aperta su metriche, alerting, runbook incident
- OTP delivery prod reale da consolidare (webhook/twilio + monitoraggio)
- parita Keycloak realm tra ambienti da formalizzare

Impatto:

- rischio operativo in stage/prod (incident response, observability)

Priorita: P1

## 4) Rischi tecnici trasversali

- dipendenza da variabili env numerose e sensibili (necessario hardening di onboarding + validazione preflight)
- aree admin con fallback mock possono nascondere regressioni backend
- alcune suite test sono presenti ma non tutte le aree hanno coverage equivalente (diversi package senza test)

## 5) Piano step-by-step da implementare ora

Ordine consigliato (pragmatico, orientato al completamento reale):

### Step 1 - Stabilizza quality gate E2E (subito)

Obiettivo:

- rendere i test E2E ripetibili e affidabili su ogni macchina/CI

Attivita:

- aggiornare selector/assert obsoleti in:
  - `apps/web/tests/e2e/scaffold-smoke.spec.ts:28`
  - `apps/web/tests/e2e/scaffold-smoke.spec.ts:129`
- mantenere robustezza sul login CTA accettando ruolo `link|button` (gia fatto in `auth-smoke.spec.ts`)
- aggiungere check bootstrap Playwright esplicito nella doc setup e, se utile, script root dedicato

Definition of Done:

- `pnpm test:e2e:web` verde localmente senza interventi manuali extra

### Step 2 - Chiudi superfici mock ad alta visibilita

Obiettivo:

- eliminare ambiguita tra area reale e area demo

Stato esecuzione (2026-03-07):

- completato con approccio "hide/disclaimer" invece di mock
- `apps/admin/app/admin/moderazione/page.tsx` ora API-only (nessun fallback mock)
- `apps/admin/app/admin/moderazione/[listingId]/page.tsx` disabilitata esplicitamente
- aree admin `utenti`, `segnalazioni`, `audit-log`, `impostazioni` gia disabilitate con disclaimer
- `apps/web/app/profilo/[username]/page.tsx` temporaneamente disabilitata in attesa di API reali

Attivita:

- admin:
  - implementare backend reale per `utenti`, `segnalazioni`, `audit-log`
  - oppure nascondere chiaramente le sezioni non ancora implementate
- web:
  - sostituire `profilo/[username]` + recensioni con API reali

Definition of Done:

- nessuna pagina core mostra dati mock senza disclaimer esplicito

### Step 3 - Implementa preferiti server-side

Obiettivo:

- sincronizzazione preferiti multi-device e persistente

Stato esecuzione (2026-03-07):

- completato
- migration `0019_create_user_favorites.sql` con tabella `user_favorite_listings`
- endpoint API utenti disponibili:
  - `GET /v1/users/me/favorites`
  - `PUT /v1/users/me/favorites/:listingId`
  - `DELETE /v1/users/me/favorites/:listingId`
- proxy web same-origin disponibili:
  - `GET /api/users/me/favorites`
  - `PUT /api/users/me/favorites/:listingId`
  - `DELETE /api/users/me/favorites/:listingId`
- UI web aggiornata con sync da API e fallback locale per utenti non autenticati (`401`)

Attivita:

- migration: tabella `user_favorite_listings` (user_id, listing_id, created_at)
- API: add/remove/list preferiti autenticati
- web: sostituire `localStorage` come source-of-truth (puoi mantenere cache client ottimistica)

Definition of Done:

- preferiti coerenti tra browser/sessioni diverse

### Step 4 - Consensi versionati + endpoint utente

Obiettivo:

- completare requisito privacy e audit storico

Stato esecuzione (2026-03-07):

- completato
- migration `0020_create_user_consents.sql` con storico append-only (`user_consents`)
- endpoint API utenti disponibili:
  - `GET /v1/users/me/consents`
  - `PATCH /v1/users/me/consents`
- proxy web same-origin disponibili:
  - `GET /api/users/me/consents`
  - `PATCH /api/users/me/consents`
- UI web aggiornata in `/account/impostazioni` con form dedicato consensi e versioni policy

Attivita:

- migration `user_consents` append-only
- API `GET/PATCH /v1/users/me/consents`
- UI in `/account/impostazioni` con versione policy e stato consenso

Definition of Done:

- ogni consenso tracciato con timestamp/version/source

### Step 5 - Avatar upload reale

Obiettivo:

- sostituire `avatarStorageKey` manuale con upload reale

Stato esecuzione (2026-03-07):

- completato
- upload avatar reale attivo su `POST /v1/users/me/avatar` con payload file base64 validato (`mimeType`, `contentBase64`, `fileName`)
- cleanup avatar precedente implementato su replace/delete
- UI `/account/impostazioni` aggiornata con selezione file, preview e gestione errori

Attivita:

- endpoint upload validato (mime/size)
- gestione replace + cleanup oggetto precedente
- UI preview/stati errore

Definition of Done:

- utente carica, aggiorna e rimuove avatar da UI senza passaggi tecnici manuali

### Step 6 - Social login reale end-to-end

Obiettivo:

- rendere operativo il login social in ambienti non mock

Stato esecuzione (2026-03-07):

- completato lato codice/infrastruttura locale
- template IdP Google aggiunto nel realm locale (`infra/keycloak/adottaungatto-realm.json`)
- `pnpm auth:seed` ora crea/aggiorna IdP Google in modo idempotente quando `KEYCLOAK_GOOGLE_IDP_ENABLED=true`
- smoke Playwright social aggiunta:
  - fallback provider non disponibile sempre testato
  - provider attivo testato in modalita condizionale con `E2E_WEB_SOCIAL_SMOKE=1`
- residuo operativo: valorizzare credenziali Google reali negli ambienti stage/prod e validare callback completa

Attivita:

- configurare IdP Google nel realm (`infra/keycloak/adottaungatto-realm.json`) e stage/prod
- validare allow-list `KEYCLOAK_SOCIAL_PROVIDERS`
- aggiungere smoke E2E condizionale stabile

Definition of Done:

- login/register Google funzionanti con fallback corretto quando provider off

### Step 7 - Linked identities + session security avanzata

Obiettivo:

- governance completa delle identita account

Stato esecuzione (2026-03-07):

- completato
- migration `0021_create_user_linked_identities.sql` + API `/v1/users/me/linked-identities*` e `/v1/users/me/sessions*` + UI sicurezza gia completati nei passi precedenti
- job periodico di riconciliazione Keycloak -> DB completato nel worker:
  - `UserIdentityReconciliationWorkerService` (interval + advisory lock)
  - repository dedicato per sync `app_users` + `user_linked_identities`
  - comando run-once `pnpm users:reconcile-identities`
- residuo: estendere audit eventi sicurezza account e gestione drift avanzata (role changes/mismatch policy)

Attivita:

- migration `user_linked_identities`
- API link/unlink/list provider
- API sessioni attive + revoca sessione
- job periodico riconciliazione Keycloak -> DB

Definition of Done:

- utente gestisce identita collegate e sessioni da UI sicurezza

### Step 8 - Operativita prod (runbook + metriche + alert)

Obiettivo:

- ridurre rischio operativo al go-live

Stato esecuzione (2026-03-07):

- completato baseline operativa locale
- introdotti strumenti worker:
  - `pnpm ops:metrics` (snapshot outbox/promotions/search)
  - `pnpm ops:alerts` (valutazione soglie con exit code non-zero su alert)
- aggiunte soglie env configurabili (`OPS_ALERT_*`, `OPS_ALERT_FAIL_ON`)
- runbook operativo minimo documentato in `docs/PROJECT_CONTEXT.md`
- residuo: integrazione esterna alert routing/monitoring in ambienti non locali (Slack/PagerDuty/Grafana/Datadog)

Attivita:

- metriche minime API/worker/outbox/search
- alerting su failure rate, queue lag, OTP delivery failures
- runbook incident (search rebuild, restore backup, rollback)

Definition of Done:

- check-list incident response testata almeno in stage

### Step 9 - OpenAPI e SDK generation

Obiettivo:

- allineamento contratto/implementazione/client

Stato esecuzione (2026-03-07):

- baseline completata
- sorgente OpenAPI v1 introdotta in `packages/sdk/openapi/openapi.v1.json`
- generazione tipi SDK con `openapi-typescript` in `packages/sdk/src/generated/openapi.ts`
- client SDK tipizzato introdotto in `packages/sdk/src/openapi-client.ts`
- drift check automatico introdotto (`pnpm openapi:check`) e agganciato in CI (`.github/workflows/ci.yml`)
- residuo: estendere coverage OpenAPI a tutte le aree API (`listings`, `messaging`, `moderation`, `analytics`, `promotions`, `geography`)

Attivita:

- introdurre sorgente OpenAPI
- generazione SDK tipizzata e versionata
- integrazione in CI con drift check

Definition of Done:

- contract-first verificabile automaticamente

## 6) Priorita consigliata (esecuzione)

1. Step 1 (E2E stable)
2. Step 2 (riduzione mock visibili)
3. Step 3 (preferiti server-side)
4. Step 4 (consensi)
5. Step 5 (avatar reale)
6. Step 6 (social login reale, completato lato codice)
7. Step 7 (linked identities/sessioni)
8. Step 8 (operativita prod)
9. Step 9 (OpenAPI/SDK)

## 7) Checklist operativa immediata (settimana corrente)

- [ ] correggere i 2 test Playwright falliti in `scaffold-smoke.spec.ts`
- [ ] fissare comando bootstrap browser Playwright nel setup locale
- [ ] decidere strategia admin mock: implementare subito o nascondere sezioni
- [ ] aprire PR per schema `user_favorites` + API base CRUD
- [x] aprire PR per schema `user_consents` + endpoint `GET/PATCH`

## 8) Nota finale di realismo

La base tecnica e buona e il core backend e solido. Il completamento totale non richiede riscrittura: richiede chiusura disciplinata dei gap "parziali/mock" e rafforzamento quality gate + operativita.
