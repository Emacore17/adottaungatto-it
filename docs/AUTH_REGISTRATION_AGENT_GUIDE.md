# AUTH_REGISTRATION_AGENT_GUIDE.md

Guida operativa per coding agent AI su registrazione, onboarding account, profilo utente e hardening auth.

Stato audit: 2026-03-06.

## Obiettivo

Portare il dominio auth/account a uno stato completo e prod-ready:

- registrazione reale
- gestione dati personali
- recupero credenziali
- verifica email e telefono
- login social (Google + provider futuri)
- sincronizzazione identita utenti
- area personale completa (impostazioni, sicurezza, avatar, preferenze)
- UI login/registrazione moderna, animata, accessibile

## Audit rapido (stato reale)

| Area richiesta | Stato | Evidenze principali | Note |
| --- | --- | --- | --- |
| Registrarsi al sito | `PARZIALE` | `apps/web/app/registrati/page.tsx`, `apps/web/app/api/auth/register/route.ts` | Flow reale via redirect OIDC Keycloak; dipende dalla configurazione realm. |
| Inserimento dati personali | `PARZIALE` | `apps/web/components/profile-settings-form.tsx`, `apps/api/src/users/users.controller.ts` (`/v1/users/me/profile`) | Profilo persistito; avatar e solo `avatarStorageKey`, non upload file reale. |
| Recupero password/credenziali | `PARZIALE` | `apps/web/app/password-dimenticata/page.tsx`, `apps/web/app/api/auth/password-recovery/route.ts`, `apps/api/src/auth/auth.controller.ts` | Endpoint anti-enumeration presente; dipende da Keycloak + SMTP per email reali. |
| Verifica email | `PARZIALE` | `apps/web/app/verifica-account/page.tsx`, `apps/web/app/api/auth/email-verification/resend/route.ts`, `apps/api/src/auth/auth.controller.ts` | Resend disponibile; enforcement `emailVerified` su listing owner mutativi e messaging. |
| Verifica telefono | `PARZIALE` | `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/services/auth-phone-verification-delivery.service.ts`, `apps/web/app/api/auth/phone-verification/*`, `apps/web/app/account/sicurezza/page.tsx`, migration `0018` | Flow API+BFF+UI base attivo; delivery OTP configurabile (`console`/`webhook`/`twilio`) con `devCode` solo non-prod. Restano hardening UX/security e onboarding provider SMS reale in produzione. |
| Accesso account terzi (Google ecc.) | `PARZIALE` | `apps/web/app/api/auth/login/[provider]/route.ts`, `register/[provider]`, `KEYCLOAK_SOCIAL_PROVIDERS` | Route provider-aware pronte; IdP Google non configurato nel realm file. |
| Sincronizzazione utenti | `PARZIALE` | `apps/api/src/users/upsert-app-user-by-identity.ts` | Upsert runtime + dedup su email verificata; manca sync periodica e gestione link multi-provider esplicita. |
| Area personale, impostazioni, foto profilo | `PARZIALE` | `apps/web/app/account/*`, `apps/web/components/profile-settings-form.tsx` | Dashboard/impostazioni/sicurezza presenti; manca sicurezza avanzata (sessioni, account linked reali, upload avatar reale). |
| Sicurezza/privacy | `PARZIALE` | PKCE/state/nonce, CSRF BFF, guard email verificata, audit security events, rate-limit auth dedicato | Mancano consensi versionati, runbook operativita SMS prod e session management completo. |
| Login/registrazione nuovi, animati, accattivanti | `PARZIALE` | `apps/web/app/login/page.tsx`, `registrati/page.tsx`, `PageShell`, `PageTransition`, `SectionReveal` | UI gia moderna con motion base; serve redesign auth-first piu distintivo e funnel onboarding completo. |

## Verifica richiesta utente (check operativo)

Questa sezione traduce la richiesta funzionale in controlli rapidi per coding agent.

| Richiesta | Stato | Come verificare oggi | Prossimo step |
| --- | --- | --- | --- |
| Registrarsi al sito | `PARZIALE` | `/registrati` -> `GET /api/auth/register` -> redirect Keycloak signup | E2E stabile con Mailpit per conferma completa |
| Inserire dati personali | `PARZIALE` | `/account/impostazioni` + `PATCH /v1/users/me/profile` | validazioni UX migliori + campi consenso/profilazione |
| Recupero password/credenziali | `PARZIALE` | `/password-dimenticata` -> `POST /v1/auth/password-recovery` (risposta neutra) | scenario e2e con email reale consegnata |
| Verifica email | `PARZIALE` | `/verifica-account` + `POST /v1/auth/email-verification/resend` | flusso auto-verifica testato end-to-end |
| Verifica telefono | `PARZIALE` | API + BFF + form in `/account/sicurezza` (stati pending + validazione inline), provider delivery `console|webhook|twilio` | completare integrazione provider SMS in produzione e rifinire UX |
| Accesso con account terzi (Google) | `PARZIALE` | route provider-aware presenti, Google non nel realm | configurare IdP Google e smoke dedicato |
| Sincronizzazione utenti | `PARZIALE` | upsert runtime su login/authenticated request | tabella linked identities + job di riconciliazione |
| Area personale (UI/settings/avatar/profilazione) | `PARZIALE` | pagine account esistenti + profile API | upload avatar reale + sezioni security/consensi |
| Modifiche interfaccia da fare | `PARZIALE` | vedere sezione `Gap da chiudere (interfaccia)` | implementare funnel completo auth-first |
| Modifiche dati/backend da fare | `PARZIALE` | vedere sezione `Gap da chiudere (backend/dati)` | migrations + API nuove (telefono/consensi/link) |
| Sicurezza/privacy | `PARZIALE` | PKCE/state/nonce, CSRF, anti-enumeration, guard email, rate-limit auth | tuning threshold + policy consensi versionata |
| Nuova pagina login/registrazione | `PARZIALE` | UI attuale moderna, ma non ancora design target finale | redesign UI auth con acceptance mobile/desktop |

## Stato tecnico corrente (as-is)

### Flussi auth reali oggi

- Web e admin usano OIDC Authorization Code + PKCE con Keycloak.
- BFF auth web: `apps/web/app/api/auth/*`
  - login/register/callback/refresh/logout
  - provider-aware login/register
  - recovery password e resend verifica email
  - request/confirm verifica telefono
- BFF auth admin: `apps/admin/app/api/auth/*`
- Cookie sessione httpOnly separati web/admin.
- Logout mutativo via `POST /api/auth/logout`; `GET` blocca con `405`.
- CSRF same-origin su route auth mutative (`Origin`/`Referer`).

### Stato utenti/profilo

- Upsert utente applicativo su ogni richiesta autenticata.
- Endpoint presenti:
  - `GET /v1/users/me`
  - `PATCH /v1/users/me/preferences`
  - `GET/PATCH /v1/users/me/profile`
  - `POST/DELETE /v1/users/me/avatar`
- endpoint auth telefono:
  - `POST /v1/auth/phone-verification/request`
  - `POST /v1/auth/phone-verification/confirm`
- Dati profilo in `user_profiles` (migration `0016`, estesa in `0018` con `phone_verified_at`).
- Challenge OTP in `user_phone_verification_challenges` (migration `0018`).
- Eventi security auth in `user_security_events` (migration `0017`).

### Vincoli gia applicati

- Guard globale auth + ruoli + email verificata.
- Endpoint sensibili con `@RequireVerifiedEmail()`:
  - listing owner mutativi/media
  - dominio messaging
- `AUTH_DEV_HEADERS_ENABLED` supportato solo in `development/test` (runtime safety).

## Gap da chiudere (interfaccia)

### UI auth pubblica (`/login`, `/registrati`, `/password-dimenticata`, `/verifica-account`)

- creare funnel auth coerente:
  - `login` e `registrazione` con hero distintivo, trust signals, CTA principali e secondarie chiare
  - copy coerente per errori OIDC, provider unavailable, callback state/nonce failure
- mantenere full-document navigation per CTA OIDC (evitare submit intercettati che rompono redirect).
- aggiungere stato onboarding post-callback:
  - email non verificata -> percorso guidato a `/verifica-account`
  - email verificata -> `/account`

File target:

- `apps/web/app/login/page.tsx`
- `apps/web/app/registrati/page.tsx`
- `apps/web/app/password-dimenticata/page.tsx`
- `apps/web/app/verifica-account/page.tsx`
- `apps/web/components/page-shell.tsx`
- `apps/web/app/styles/*` (solo se servono token/layout auth dedicati)

### Area personale e sicurezza

- in `/account/impostazioni` aggiungere sezioni mancanti:
  - consensi privacy/termini/versione
  - controllo preferenze profilazione (quando backend disponibile)
- in `/account/sicurezza` aggiungere:
  - stato email/telefono
  - sessioni attive
  - provider collegati (Google/email-password)
  - azioni revoca/disconnessione account linked
- avatar:
  - passare da campo `avatarStorageKey` a upload reale con preview

File target:

- `apps/web/app/account/impostazioni/page.tsx`
- `apps/web/app/account/sicurezza/page.tsx`
- `apps/web/components/profile-settings-form.tsx`
- nuove route BFF sotto `apps/web/app/api/users/me/**`

## Gap da chiudere (backend/dati)

### Modello dati da introdurre / stato

Migration suggerite (ordine):

1. `user_linked_identities`:
- relazione N:1 con `app_users`
- campi: `provider`, `provider_subject`, `email_at_link`, `linked_at`, `last_seen_at`
- unique `(provider, provider_subject)`

2. `user_consents`:
- `user_id`, `consent_type`, `version`, `granted`, `granted_at`, `source`, `ip`, `user_agent`
- storico append-only (no update distruttivo)

3. `user_phone_verification_challenges` (`IMPLEMENTATO` in `0018`):
- `user_id`, `phone_e164`, `code_hash`, `attempts`, `expires_at`, `verified_at`
- supporto rate-limit e lockout
- `user_profiles.phone_verified_at` aggiunto in `0018`

4. opzionale `user_sessions_audit`:
- tracciamento sessioni/revoche lato applicazione (se non delegato interamente a Keycloak)

### API da aggiungere/estendere (residuo)

- Auth:
  - delivery OTP disponibile (`PHONE_VERIFICATION_DELIVERY_PROVIDER=console|webhook|twilio`)
  - residuo: runbook monitoraggio errori provider e fallback operativo cross-provider
- Users:
  - `GET /v1/users/me/consents`
  - `PATCH /v1/users/me/consents`
  - `GET /v1/users/me/linked-identities`
  - `POST /v1/users/me/linked-identities/:provider/start`
  - `DELETE /v1/users/me/linked-identities/:provider`
  - `GET /v1/users/me/sessions`
  - `DELETE /v1/users/me/sessions/:sessionId`
- Avatar:
  - endpoint upload reale (multipart o upload token + storage flow)

### Sincronizzazione utenti

Stato attuale:

- upsert runtime su ogni richiesta autenticata
- dedup su email verificata in `upsert-app-user-by-identity.ts`

Da aggiungere:

- job di riconciliazione periodica Keycloak -> `app_users` / `user_linked_identities`
- gestione drift (email cambiata, provider unlinked, role changes)
- audit eventi sicurezza su link/unlink provider e modifiche sensibili

## Sicurezza e privacy: checklist implementativa

Gia presente:

- PKCE + `state` + `nonce` in callback OIDC
- CSRF same-origin sulle route auth BFF mutative
- anti-enumeration recovery/resend
- rate-limit dedicato su:
  - `/v1/auth/password-recovery`
  - `/v1/auth/email-verification/resend`
  - `/v1/auth/phone-verification/request`
  - `/v1/auth/phone-verification/confirm`
- delivery OTP configurabile (`console`/`webhook`/`twilio`), con provider `console` bloccato in `production`
- enforcement `emailVerified` su superfici sensibili
- audit `user_security_events` per recovery/resend/link identita

Da completare:

- rate-limit endpoint auth sensibili:
  - tuning threshold e monitoraggio produzione per endpoint telefono
- provider OTP in produzione:
  - configurare `webhook` o `twilio` verso gateway SMS reale e monitorare errori `503` delivery
- realm Keycloak:
  - verifica email obbligatoria
  - SMTP configurato (locale Mailpit, prod SMTP reale)
  - IdP social configurati e testati
- disattivare `AUTH_DEV_HEADERS_ENABLED` fuori locale
- data minimization:
  - non loggare PII in chiaro
  - retention definita per dati auth sensibili
- policy consensi versionata e tracciabile

## UX/UI target per login/registrazione (nuova versione)

### Direzione visuale

- mantenere design system esistente, ma con shell auth dedicata:
  - hero a forte identita visiva
  - card azione primaria alta leggibilita
  - trust strip (sicurezza, privacy, tempi)
- motion:
  - page enter + section stagger (gia disponibili via `motionPresets`)
  - rispetto `prefers-reduced-motion`
- accessibilita:
  - target touch >= 44px
  - focus visibile
  - contrasto AA
  - stati errore/form consistenti

### Acceptance UI

- da `/login` o `/registrati` il redirect OIDC parte sempre al primo click
- nessun blocco su mobile (`360x800`, `390x844`) e desktop (`1280x720+`)
- onboarding coerente post-callback:
  - non verificato -> `/verifica-account`
  - verificato -> `/account`

## Locale e produzione

### Locale (baseline)

```bash
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm auth:seed
pnpm minio:bootstrap
pnpm dev
pnpm dev:worker
```

Note runtime:

- web locale usa `next dev --webpack -p 3000` come default prudenziale
- Playwright web usa la stessa modalita in `apps/web/playwright.config.ts`
- verifica locale 2026-03-06: `/login`, `/registrati`, `/password-dimenticata`, `/verifica-account` rispondono `200` sia con `pnpm dev` root sia con `pnpm dev:web:turbopack`
- smoke rapido pagine auth pubbliche: `pnpm test:smoke:web:auth-pages` (richiede web attivo su `localhost:3000`)
- se `/login` non renderizza con `pnpm dev`:
  - verificare `http://localhost:3000/login`
  - verificare che il processo web sia attivo (evitare collisioni porta 3000)
  - rilanciare solo web con `pnpm dev:web` (o `pnpm dev:web:turbopack` per confronto)
- verifica telefono locale:
  - `PHONE_VERIFICATION_DELIVERY_PROVIDER=console` per vedere OTP nei log API e `devCode` in UI
  - opzionale `PHONE_VERIFICATION_DELIVERY_PROVIDER=webhook` con `PHONE_VERIFICATION_DELIVERY_WEBHOOK_URL` per integrare un gateway SMS reale
  - opzionale `PHONE_VERIFICATION_DELIVERY_PROVIDER=twilio` con credenziali Twilio (`ACCOUNT_SID`, `AUTH_TOKEN`, `FROM_NUMBER` o `MESSAGING_SERVICE_SID`)

### Produzione (minimo richiesto)

- `NODE_ENV=production`
- `AUTH_DEV_HEADERS_ENABLED=false`
- `API_TRUST_PROXY_ENABLED=true` dietro reverse proxy affidabile
- `API_CORS_ALLOWED_ORIGINS` esplicito su domini reali
- delivery OTP telefono:
  - non usare `console` in produzione (bloccato a runtime con `503`)
  - configurare `PHONE_VERIFICATION_DELIVERY_PROVIDER=webhook` + URL gateway + token auth opzionale
  - oppure `PHONE_VERIFICATION_DELIVERY_PROVIDER=twilio` + credenziali dedicate
- realm Keycloak allineato (no direct grants su client pubblici, SMTP, IdP social)
- secret management esterno (no credenziali statiche nel repo)

## Piano di esecuzione consigliato

1. Baseline auth testabile:
- riallineare smoke auth legacy (`apps/api/scripts/smoke-auth-session.ts`) al flow OIDC attuale
- consolidare test web auth Playwright come gate minimo

2. Social login reale:
- configurazione IdP Google in realm
- smoke E2E condizionale ma stabile

3. Profilo completo:
- upload avatar reale
- affinamento UI impostazioni/sicurezza

4. Telefono + consensi:
- nuove migration + endpoint + BFF + UI
- audit e rate-limit dedicati

5. Sync identita avanzata:
- tabella linked identities
- worker/job riconciliazione e runbook operativo

## Test plan obbligatorio

### API

- unit + e2e su:
  - recovery/resend/telefono
  - consensi
  - linked identities
  - enforcement email/telefono verificati

### Web

- Playwright:
  - registrazione -> verifica email -> login -> account
  - password recovery (esito neutro)
  - social login (quando IdP disponibile)
  - update profilo + avatar
  - logout e invalidazione sessione

### Security

- state/nonce mismatch callback
- CSRF negative tests su BFF mutative
- rate-limit auth endpoints
- no enumeration su recovery/resend

## Definition of Done

- registrazione/recovery/verifica email/telefono funzionanti end-to-end
- social login Google operativo (locale/stage) con fallback gestito
- area personale completa (profilo, avatar reale, sicurezza, consensi)
- sincronizzazione identita affidabile con audit
- documentazione aggiornata:
  - `docs/API_CONTRACT.md`
  - `docs/TESTING.md`
  - `docs/DEVELOPMENT_ROADMAP.md`
  - `README.md`
