# TESTING.md

Guida compatta ai test realmente presenti nel repo.

Ultima verifica documentata: 2026-03-07.

## Comandi principali

Da root workspace:

```bash
pnpm lint
pnpm typecheck
pnpm openapi:check
pnpm test
pnpm test:e2e
pnpm test:e2e:web:install
pnpm test:e2e:web
pnpm test:smoke:auth
pnpm test:smoke:web:auth-pages
```

Comandi operativi utili:

```bash
pnpm test:smoke
pnpm test:smoke:listings
pnpm test:smoke:listings-media
pnpm test:smoke:media-upload
pnpm test:smoke:worker-minio
pnpm backup:smoke
pnpm backup:restore -- --yes
pnpm search:reindex
pnpm search:cleanup
pnpm search:verify
pnpm cleanup:retention
pnpm promotions:lifecycle
pnpm users:reconcile-identities
pnpm ops:metrics
pnpm ops:alerts
```

Note:

- `backup:restore -- --yes` e distruttivo sul dataset locale corrente
- `pnpm test:e2e:web:install` scarica browser/runtime Playwright richiesti in locale
- `test:smoke:auth` richiede web (`localhost:3000`), api (`localhost:3002`) e Keycloak attivi
- `test:smoke:web:auth-pages` richiede web attivo su `localhost:3000` (override con `AUTH_PAGES_BASE_URL`)
- `test:smoke:auth` usa flow OIDC reale (no password grant legacy) e fallisce in preflight se `/health` API non e raggiungibile
- le suite E2E API (`apps/api/test/**/*.e2e-spec.ts`) girano in modo sequenziale (`fileParallelism: false`, `maxWorkers: 1`) per evitare flakiness da stato condiviso (`process.env`, Redis, DB)
- le spec `auth-phone-verification*.e2e-spec.ts` usano un `RATE_LIMIT_KEY_PREFIX` univoco per run per evitare collisioni Redis tra esecuzioni ravvicinate
- `pnpm ops:alerts` ritorna exit code `1` quando lo stato alert supera la policy `OPS_ALERT_FAIL_ON` (default: solo `critical`)
- `pnpm openapi:check` fallisce se `packages/sdk/src/generated/openapi.ts` non e allineato a `packages/sdk/openapi/openapi.v1.json`

## Prerequisiti locali consigliati

```bash
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm auth:seed
pnpm minio:bootstrap
pnpm dev
pnpm dev:worker
```

## Copertura attuale

### API (`apps/api/test`)

Presente copertura su:

- health e runtime safety
- auth RBAC/recovery/identity-linking
- users e profile/avatar upload
- consensi utente versionati (`GET/PATCH /v1/users/me/consents`)
- preferiti utente (`GET/PUT/DELETE /v1/users/me/favorites`)
- linked identities e session management account (`GET/POST/DELETE /v1/users/me/linked-identities*`, `GET/DELETE /v1/users/me/sessions*`)
- listings create/update/public/search/media/contact + integrazione reale iniziale
- messaging
- moderation
- analytics
- promotions
- geography
- rate limiting pubblico
- rate limiting auth dedicato (password recovery + email verification resend + phone verification)
- delivery provider OTP (`console`, `webhook`, `twilio`) con unit test dedicato

Spec di riferimento:

- `auth-rbac.e2e-spec.ts`
- `auth-recovery.e2e-spec.ts`
- `auth-phone-verification.e2e-spec.ts`
- `auth-phone-verification-integration.e2e-spec.ts`
- `auth-phone-verification-delivery.service.spec.ts`
- `auth-identity-linking.e2e-spec.ts`
- `users.e2e-spec.ts`
- `listings-integration.e2e-spec.ts`
- `messaging.e2e-spec.ts`
- `moderation.e2e-spec.ts`
- `public-rate-limit.e2e-spec.ts`

Batch utile per regressioni auth telefono + rate-limit:

```bash
pnpm --filter @adottaungatto/api exec vitest run --config vitest.e2e.config.ts test/auth-phone-verification.e2e-spec.ts test/auth-phone-verification-integration.e2e-spec.ts test/public-rate-limit.e2e-spec.ts
```

### Web unit (`apps/web/app/**/*.unit.spec.ts`)

Spec presenti:

- `app/api/auth/phone-verification/request/route.unit.spec.ts`
- `app/api/auth/phone-verification/confirm/route.unit.spec.ts`

Copertura attuale:

- mapping redirect/status route BFF OTP (`request`/`confirm`)
- propagazione `retryAfterSeconds` da `Retry-After` header/body JSON
- mapping errori UX (`delivery_unavailable`, `invalid_phone`, `missing_phone`, `missing_code`, `invalid_code`, `request_required`, `expired`, fallback `request_failed`/`confirm_failed`)

Comando:

- `pnpm --filter @adottaungatto/web test`

### Web E2E (`apps/web/tests/e2e`)

Spec presenti:

- `scaffold-smoke.spec.ts`
- `auth-smoke.spec.ts` (condizionale con `E2E_WEB_AUTH_SMOKE=1`)
- `social-auth-smoke.spec.ts` (fallback sempre attivo + ramo provider attivo condizionale con `E2E_WEB_SOCIAL_SMOKE=1`)

Copertura attuale:

- smoke home/catalogo/dettaglio annuncio
- navbar mobile (open/close, focus trap, Esc, focus restore)
- filtri mobile `/annunci` e mapping query
- ricerca home mobile con controlli principali
- ordine blocchi mobile su `/annunci/[listingId]` (gallery prima del titolo)
- smoke auth: redirect anonimo, login demo, invalidazione sessione logout via `POST /api/auth/logout` in modalita SPA
- smoke social auth:
  - fallback `social_provider_unavailable` su provider non ammesso
  - redirect OIDC provider-aware con `kc_idp_hint` e parametri signup (`screen_hint`, `kc_action`) quando provider abilitato

Comando social smoke (provider attivo):

```bash
CI=1 E2E_WEB_SOCIAL_SMOKE=1 KEYCLOAK_SOCIAL_PROVIDERS=google pnpm --filter @adottaungatto/web exec playwright test tests/e2e/social-auth-smoke.spec.ts
```

## Check manuale rapido

Web:

- `/`
- `/annunci`
- `/annunci/[listingId]`
- `/login`
- `/registrati`
- `/password-dimenticata`
- `/account`
- `/messaggi`

Admin:

- `http://localhost:3001/login`
- `http://localhost:3001/admin/moderazione`

Verifiche essenziali:

- login demo `utente.demo` e logout
- creazione/modifica annuncio
- invio messaggio da thread
- approve/reject/suspend/restore in moderazione admin
- `GET /api/auth/logout` deve rispondere `405`

## Checklist auth/registrazione (manuale)

Precondizioni minime:

- `pnpm infra:up`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm auth:seed`
- `pnpm dev`

Passi:

1. aprire `/registrati` e cliccare `Continua con registrazione`
2. verificare redirect a Keycloak (flow signup)
3. completare registrazione e tornare al web
4. se email non verificata: aspettarsi redirect/landing su `/verifica-account`
5. da `/verifica-account` usare resend e verificare esito neutro
6. aprire `/password-dimenticata`, inviare identificatore e verificare esito neutro (`status=sent`)
7. aprire `/login`, completare login demo e verificare accesso a `/account`
8. eseguire logout via UI/API (`POST /api/auth/logout`) e verificare redirect successivo a `/login`
9. aprire `/account/sicurezza`, richiedere OTP telefono e confermare codice (flow BFF `/api/auth/phone-verification/*`, in locale usare `devCode` mostrato in pagina)
10. verificare rendering pagine auth pubbliche (`/login`, `/registrati`, `/password-dimenticata`, `/verifica-account`) con `pnpm dev` root

Esiti attesi:

- nessun errore 500 nel flow auth pubblico
- callback con mismatch `state/nonce` deve tornare a `/login?error=...`
- `GET /api/auth/logout` resta bloccato con `405`
- endpoint mutativi auth BFF senza origin/referer trusted devono rispondere `403` (CSRF)
- endpoint auth telefono devono rispettare lockout tentativi e rate-limit dedicato (`429` con `Retry-After`)
- su lockout/rate-limit telefono, il redirect BFF deve includere anche `retryAfterSeconds` quando disponibile
- con provider `webhook` o `twilio`, un errore delivery deve produrre `delivery_unavailable` lato BFF (`/account/sicurezza?phoneVerification=delivery_unavailable`)
- con JS attivo, form OTP in `/account/sicurezza` deve mostrare validazione inline (telefono E.164, codice OTP numerico 4-8 cifre) senza invio richiesta invalida

## Gap test aperti

- Playwright non copre ancora in profondita workspace, messaging e moderazione UI
- manca E2E web completo registrazione -> verifica email -> login con Mailpit stabile
- le integration E2E API reali senza override provider vanno estese a messaging/moderation/search
- `auth-phone-verification.e2e-spec.ts` resta controller-focused con override, ma il percorso reale e ora coperto da `auth-phone-verification-integration.e2e-spec.ts`
- mancano test multi-process reali per contesa lock worker cross-instance

Per priorita di chiusura gap usare `docs/DEVELOPMENT_ROADMAP.md`.
