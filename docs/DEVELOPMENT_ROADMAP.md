# DEVELOPMENT_ROADMAP.md

Roadmap unica per i prossimi sviluppi. Sostituisce i vecchi execution plan separati (`auth`, `backend hardening`, `web ux`).

Ultimo aggiornamento: 2026-03-07

Per dettaglio operativo auth/account usare `docs/AUTH_REGISTRATION_AGENT_GUIDE.md`.

## Come usarla

- trattare questa roadmap come backlog operativo unico
- aprire PR per slice complete (codice + test + doc)
- chiudere i blocchi in ordine, salvo urgenze di bugfix

## Stato sintetico per area

- `Auth`: base completata (OIDC web/admin, registrazione, recovery, profilo) + social provider-aware con provisioning IdP Google env-gated; restano onboarding credenziali reali stage/prod, verifica telefono API+BFF+UI base e delivery `console|webhook|twilio` presenti, oltre a hardening drift/audit account su linked identities
- `Backend`: hardening P0/P1 quasi chiuso, resta estendere integration E2E reali e operativita prod
- `Web/Admin UX`: refactor mobile principale completato; riduzione aree mock in corso con disabilitazione esplicita delle viste non collegate a backend reale

## Backlog aperto

### R1 - Social login reale end-to-end

Priorita: P0  
Area: `apps/web`, `apps/api`, `infra/keycloak`, `docs`

Stato corrente:

- template IdP Google aggiunto nel realm locale (`infra/keycloak/adottaungatto-realm.json`, `enabled=false` di default)
- provisioning IdP Google idempotente in `pnpm auth:seed` (via env `KEYCLOAK_GOOGLE_IDP_ENABLED`, `KEYCLOAK_GOOGLE_CLIENT_ID`, `KEYCLOAK_GOOGLE_CLIENT_SECRET`)
- smoke Playwright dedicata aggiunta (`apps/web/tests/e2e/social-auth-smoke.spec.ts`):
  - fallback provider non disponibile
  - percorso provider attivo condizionale con `E2E_WEB_SOCIAL_SMOKE=1`
- restano da configurare/validare le credenziali Google reali negli ambienti non locali

Task:

- configurare credenziali Google reali in stage/prod e rieseguire `pnpm auth:seed`
- validare operativamente in stage:
  - `GET /api/auth/login/[provider]`
  - `GET /api/auth/register/[provider]`
  - callback OIDC completa con account Google reale

Acceptance:

- fallback pulito quando provider non configurato (`COMPLETATO`)
- login/registrazione Google operativi in locale/stage con credenziali reali

### R2 - Parita realm e policy auth tra ambienti

Priorita: P0  
Area: `infra/keycloak`, `apps/api`, `docs`

Task:

- confermare `directAccessGrantsEnabled=false` sui client pubblici in tutti gli ambienti
- allineare policy verifica email e reset password
- documentare runbook di validazione realm

Acceptance:

- nessun ambiente non-locale con password grant attivo per client pubblici
- checklist di verifica realm ripetibile

### R3 - Consensi privacy/versioning e sicurezza account

Priorita: P1  
Area: `apps/api`, `apps/web`, `apps/api/migrations`, `docs`

Stato corrente:

- migration `0020_create_user_consents.sql` completata (storico append-only `user_consents`)
- endpoint `GET/PATCH /v1/users/me/consents` completati con BFF web (`/api/users/me/consents`)
- UI `/account/impostazioni` aggiornata con form consensi versionati
- restano audit eventi sensibili aggiuntivi su modifiche account

Task:

- estendere audit eventi sensibili aggiuntivi (es. cambi dati profilo sensibili)
- centralizzare governance versioni policy (es. config/env shared) per evitare drift UI/API

Acceptance:

- consensi persistiti e tracciabili nel tempo (`COMPLETATO`)
- API contract e test aggiornati (`COMPLETATO`)
- audit eventi sensibili account coperti end-to-end

### R4 - Avatar upload reale end-to-end

Priorita: P1  
Area: `apps/web`, `apps/api`, `apps/worker`, `docs`

Stato corrente:

- upload avatar reale completato (`POST /v1/users/me/avatar`) con payload file base64 validato (mime/size)
- cleanup automatico dell avatar precedente su replace/delete
- UI `/account/impostazioni` aggiornata con selezione file, preview e stato upload
- restano da aggiungere smoke web dedicati al flusso avatar

Task:

- aggiungere smoke E2E web dedicati al ciclo avatar (upload/replace/remove)

Acceptance:

- upload/update/delete avatar completo e stabile (`COMPLETATO`)
- test API + smoke web aggiornati (API completata, smoke web avatar da estendere)

### R9 - Verifica telefono e sicurezza account

Priorita: P1  
Area: `apps/api`, `apps/web`, `apps/api/migrations`, `docs`

Stato corrente:

- backend OTP completato (`0018`, endpoint `/v1/auth/phone-verification/request|confirm`, rate-limit dedicato, e2e base)
- BFF web + UI minima account sicurezza completati
- delivery OTP completato con provider `console|webhook|twilio` + unit test dedicato
- restano onboarding gateway SMS reale in ambienti non locali e hardening UX/security finale

Task:

- collegare `PHONE_VERIFICATION_DELIVERY_PROVIDER=webhook` o `twilio` a gateway SMS reale (locale/stage/prod) con runbook operativo
- rifinire UX di `/account/sicurezza` (messaggi errore granulari, stati loading/retry, gestione `retryAfterSeconds`)
- valutare enforcement `phoneVerified` per azioni sensibili addizionali
- aggiungere monitoraggio su errori delivery OTP (`503`) e saturazione rate-limit

Acceptance:

- numero telefono verificabile end-to-end in locale/stage
- tentativi abusivi limitati e tracciati
- stato verifica telefono visibile in area sicurezza account
- delivery OTP non-console operativo almeno in stage

### R10 - Linked identities e sync utenti avanzata

Priorita: P1  
Area: `apps/api`, `apps/worker`, `apps/api/migrations`, `infra/keycloak`, `docs`

Stato corrente:

- migration `0021_create_user_linked_identities.sql` completata con backfill da `app_users`
- API utenti completate:
  - `GET /v1/users/me/linked-identities`
  - `POST /v1/users/me/linked-identities/:provider/start`
  - `DELETE /v1/users/me/linked-identities/:provider`
  - `GET /v1/users/me/sessions`
  - `DELETE /v1/users/me/sessions/:sessionId`
- UI `/account/sicurezza` aggiornata con pannello linked identities + sessioni attive (unlink/revoke)
- sync linked identities best-effort da Keycloak in lettura endpoint utenti
- job periodico di riconciliazione Keycloak -> DB completato in worker (`UserIdentityReconciliationWorkerService`) con lock distribuito, batch e script run-once (`pnpm users:reconcile-identities`)
- restano gestione drift avanzata e audit eventi sicurezza account estesi

Task:

- gestire drift (email cambiata, provider scollegato, role changes) con audit eventi
- estendere audit eventi sicurezza dedicati a unlink/revoke sessione

Acceptance:

- identita multiple per utente gestite senza duplicazioni (`COMPLETATO`)
- riconciliazione periodica ripetibile con runbook (`COMPLETATO`)
- eventi sicurezza disponibili per link/unlink e mismatch corretti

### R5 - Integration E2E backend senza override provider

Priorita: P0  
Area: `apps/api/test`, `apps/api/src`, `docs`

Task:

- estendere approccio di `listings-integration.e2e-spec.ts` a:
  - messaging
  - moderation
  - search
- ridurre progressivamente gli override provider nelle E2E critiche

Acceptance:

- suite integration reale minima su aree core
- regressioni cross-layer individuabili senza mock service

### R6 - Operativita prod: metriche, alerting, runbook

Priorita: P1  
Area: `apps/api`, `apps/worker`, `docs`

Stato corrente:

- baseline observability operativa completata:
  - snapshot `pnpm ops:metrics` (outbox email, lag lifecycle promotions, stato OpenSearch/alias)
  - check alert `pnpm ops:alerts` con soglie env e policy fail (`OPS_ALERT_FAIL_ON`)
  - runbook operativo minimo documentato in `docs/PROJECT_CONTEXT.md`
- restano integrazioni esterne (monitoring platform/alert routing) per ambienti non locali

Task:

- collegare `ops:alerts` a scheduler CI/cron e canali notifiche (Slack/PagerDuty/email) in stage/prod
- estendere monitoraggio con metriche app-level addizionali (error rate API/worker per endpoint/queue)
- consolidare rollback applicativo in runbook deployment (oltre ai runbook search/backup gia presenti)

Acceptance:

- runbook operativo minimale documentato (`COMPLETATO`)
- segnali osservabilita minimi pronti per ambienti non locali (`COMPLETATO` lato codice locale, integrazione esterna pending)

### R7 - Riduzione superfici mock (web/admin)

Priorita: P1  
Area: `apps/web`, `apps/admin`, `apps/api`, `docs`

Stato corrente:

- aree admin non collegate (`utenti`, `segnalazioni`, `audit-log`, `impostazioni`) nascoste/disabilitate con disclaimer esplicito
- dettaglio `admin/moderazione/[listingId]` disabilitato per evitare contenuti mock
- profilo pubblico `web /profilo/[username]` temporaneamente disabilitato in attesa di API reali
- preferiti account server-side completati (`/v1/users/me/favorites` + BFF web)

Task:

- implementare API reali per profilo pubblico venditore e recensioni, poi riattivare `web /profilo/[username]`
- collegare endpoint reali alle aree admin oggi disabilitate (`utenti`, `segnalazioni`, `audit-log`, `impostazioni`, dettaglio moderazione)

Acceptance:

- nessuna area core ambigua tra real/mock senza disclaimer
- piano implementativo chiaro per feature ancora mancanti

### R8 - Estensione Playwright web

Priorita: P1  
Area: `apps/web/tests/e2e`, `docs`

Task:

- coprire flussi `workspace + messaging + auth recovery`
- aggiungere check su regressioni principali mobile/tablet
- mantenere smoke auth condizionale stabile

Acceptance:

- copertura UI core superiore agli smoke attuali
- regressioni su flussi utente principali intercettate automaticamente

### R11 - OpenAPI e SDK contract-first

Priorita: P1  
Area: `packages/sdk`, `apps/api`, `docs`, `.github/workflows`

Stato corrente:

- sorgente OpenAPI v1 introdotta (`packages/sdk/openapi/openapi.v1.json`)
- tipi SDK generati con `openapi-typescript` (`packages/sdk/src/generated/openapi.ts`)
- client SDK tipizzato aggiunto (`packages/sdk/src/openapi-client.ts`)
- drift check OpenAPI in CI (`pnpm openapi:check` nel workflow `core`)

Task:

- estendere progressivamente la coverage OpenAPI a tutti gli endpoint `v1` (auth, listings, messaging, moderation, analytics, promotions, geography)
- valutare export automatico OpenAPI direttamente dal runtime API (Nest) per ridurre manutenzione manuale
- aggiungere smoke/contract test che verifichino coerenza tra OpenAPI e comportamenti runtime su endpoint chiave

Acceptance:

- sorgente OpenAPI e codegen SDK versionati (`COMPLETATO`)
- drift check automatico in CI (`COMPLETATO`)
- copertura endpoint core `v1` tracciata e in espansione

## Ordine raccomandato

1. R1
2. R2
3. R5
4. R3
5. R4
6. R9
7. R10
8. R6
9. R7
10. R8
11. R11
