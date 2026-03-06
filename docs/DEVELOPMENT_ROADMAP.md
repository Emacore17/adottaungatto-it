# DEVELOPMENT_ROADMAP.md

Roadmap unica per i prossimi sviluppi. Sostituisce i vecchi execution plan separati (`auth`, `backend hardening`, `web ux`).

Ultimo aggiornamento: 2026-03-06

Per dettaglio operativo auth/account usare `docs/AUTH_REGISTRATION_AGENT_GUIDE.md`.

## Come usarla

- trattare questa roadmap come backlog operativo unico
- aprire PR per slice complete (codice + test + doc)
- chiudere i blocchi in ordine, salvo urgenze di bugfix

## Stato sintetico per area

- `Auth`: base completata (OIDC web/admin, registrazione, recovery, profilo), social ancora da completare; verifica telefono API+BFF+UI base e delivery `console|webhook|twilio` presenti, restano onboarding SMS prod e hardening finale; linked identities aperti
- `Backend`: hardening P0/P1 quasi chiuso, resta estendere integration E2E reali e operativita prod
- `Web/Admin UX`: refactor mobile principale completato, resta estensione copertura E2E e riduzione aree mock

## Backlog aperto

### R1 - Social login reale end-to-end

Priorita: P0  
Area: `apps/web`, `apps/api`, `infra/keycloak`, `docs`

Task:

- configurare provider Google nel realm locale (`infra/keycloak/adottaungatto-realm.json`) e negli ambienti non locali
- validare route provider-aware:
  - `GET /api/auth/login/[provider]`
  - `GET /api/auth/register/[provider]`
- aggiungere smoke E2E condizionale stabile con provider attivo

Acceptance:

- login/registrazione Google operativi in locale/stage
- fallback pulito quando provider non configurato

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

Task:

- introdurre modello dati consensi versionati (privacy/termini/marketing opzionali)
- esporre endpoint API per lettura/aggiornamento consensi utente
- audit eventi sensibili aggiuntivi (es. cambi dati profilo sensibili)

Acceptance:

- consensi persistiti e tracciabili nel tempo
- API contract e test aggiornati

### R4 - Avatar upload reale end-to-end

Priorita: P1  
Area: `apps/web`, `apps/api`, `apps/worker`, `docs`

Task:

- passare da sola `avatarStorageKey` a upload file validato (mime/size)
- gestire replace e cleanup dell'avatar precedente
- coprire error handling lato web

Acceptance:

- upload/update/delete avatar completo e stabile
- test API + smoke web aggiornati

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

Task:

- introdurre tabella `user_linked_identities` (provider, provider_subject, linked_at, last_seen_at)
- esporre API per listing/link/unlink provider dell'utente
- aggiungere job periodico di riconciliazione Keycloak -> `app_users`/linked identities
- gestire drift (email cambiata, provider scollegato, role changes) con audit eventi

Acceptance:

- identita multiple per utente gestite senza duplicazioni
- riconciliazione periodica ripetibile con runbook
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

Task:

- definire metriche minime per API, worker, outbox, search
- definire alert principali (error rate, queue pending/failed, job failures)
- completare runbook incident (search rebuild, restore backup, rollback applicativo)

Acceptance:

- runbook operativo minimale documentato
- segnali osservabilita minimi pronti per ambienti non locali

### R7 - Riduzione superfici mock (web/admin)

Priorita: P1  
Area: `apps/web`, `apps/admin`, `apps/api`, `docs`

Task:

- implementare o nascondere esplicitamente aree admin mock (`utenti`, `segnalazioni`, `audit-log`)
- pianificare backend preferiti server-side
- definire strategia per profilo pubblico venditore e recensioni reali

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
