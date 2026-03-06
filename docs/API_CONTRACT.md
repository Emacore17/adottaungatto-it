# API_CONTRACT.md

Contratto API corrente da trattare come canonico finche non esiste OpenAPI generata.

## Convenzioni generali

- base path: `/v1` (tranne health: `/health`, `/health/search`)
- payload: `application/json`
- molti ID numerici sono serializzati come stringhe nel payload
- auth standard browser: `Authorization: Bearer <token>`
- auth locale alternativa: dev headers (`x-auth-user-id`, `x-auth-email`, `x-auth-roles`, opzionale `x-auth-subject`, opzionale `x-auth-email-verified`) se `AUTH_DEV_HEADERS_ENABLED=true`
- su rate limit: risposta `429` con `Retry-After`

## Mappa endpoint

### Health

- `GET /health`
- `GET /health/search`

### Users

- `GET /v1/users/me`
- `PATCH /v1/users/me/preferences`
- `GET /v1/users/me/profile`
- `PATCH /v1/users/me/profile`
- `POST /v1/users/me/avatar`
- `DELETE /v1/users/me/avatar`
- `GET /v1/users/moderation-space`
- `GET /v1/users/admin-space`

### Auth

- `POST /v1/auth/password-recovery`
- `POST /v1/auth/email-verification/resend`
- `POST /v1/auth/phone-verification/request`
- `POST /v1/auth/phone-verification/confirm`

Note:

- endpoint soggetti a rate-limit dedicato (`RATE_LIMIT_AUTH_PASSWORD_RECOVERY_*`, `RATE_LIMIT_AUTH_EMAIL_VERIFICATION_RESEND_*`, `RATE_LIMIT_AUTH_PHONE_VERIFICATION_REQUEST_*`, `RATE_LIMIT_AUTH_PHONE_VERIFICATION_CONFIRM_*`)
- `POST /v1/auth/phone-verification/request` puo rispondere `503` se il provider delivery OTP non e disponibile/configurato

### Geography

- `GET /v1/geography/regions`
- `GET /v1/geography/provinces?regionId=<id>`
- `GET /v1/geography/comuni?provinceId=<id>`
- `GET /v1/geography/search?q=<text>&limit=<1..50>`

Note:

- endpoint pubblici soggetti a profilo rate limit dedicato `geography` (configurato via `RATE_LIMIT_GEOGRAPHY_*`)

### Web same-origin proxy (BFF)

- `GET /api/geography/search?q=<text>&limit=<1..50>`

Note:

- route handler: `apps/web/app/api/geography/search/route.ts`
- il frontend web deve usare questo endpoint same-origin al posto di chiamare direttamente `NEXT_PUBLIC_API_URL` dal browser
- il proxy mantiene status code e payload upstream (`/v1/geography/search`) e ritorna `502` se l'API non e raggiungibile

### Web auth BFF (`apps/web/app/api/auth/**`)

- `GET /api/auth/login?next=<path-opzionale>`
- `POST /api/auth/login` (compat route: reindirizza a flow OIDC)
- `GET /api/auth/login/:provider?next=<path-opzionale>`
- `GET /api/auth/register?next=<path-opzionale>`
- `POST /api/auth/register` (compat route: reindirizza a flow OIDC signup)
- `GET /api/auth/register/:provider?next=<path-opzionale>`
- `GET /api/auth/callback?code=<...>&state=<...>`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/password-recovery`
- `POST /api/auth/email-verification/resend`
- `POST /api/auth/phone-verification/request`
- `POST /api/auth/phone-verification/confirm`

Note:

- i flow `login/register` usano redirect browser (`303`) verso Keycloak
- `POST /api/auth/login` e `POST /api/auth/register` sono route compat: leggono `formData` (campo opzionale `next`) e poi eseguono redirect OIDC
- `POST /api/auth/logout` e mutativo; `GET /api/auth/logout` e bloccato con `405`
- in UI SPA, `POST /api/auth/logout` supporta header `x-auth-mode: spa` e ritorna JSON `{ redirectTo }`
- route auth BFF mutative applicano validazione CSRF same-origin su `Origin/Referer`
- `POST /api/auth/password-recovery` legge `formData` (`identifier`) e risponde sempre con redirect neutro su `/password-dimenticata?status=...`
- `POST /api/auth/email-verification/resend` richiede sessione valida; su sessione assente/401 upstream redirige a `/login?next=/verifica-account`
- route telefono (`request`/`confirm`) leggono `formData`, inoltrano a `/v1/auth/phone-verification/*` e redirigono a `/account/sicurezza?phoneVerification=<status>`
- quando upstream ritorna un `Retry-After`/`retryAfterSeconds` valido, il BFF aggiunge `retryAfterSeconds` alla query string di redirect
- in locale/sviluppo il redirect della route `request` puo includere `devCode` (`/account/sicurezza?phoneVerification=requested&devCode=...`)
- route `POST /api/auth/phone-verification/request` mappa gli esiti principali su:
  - `requested`
  - `rate_limited`
  - `delivery_unavailable` (`503` upstream provider delivery non disponibile)
  - `missing_phone`
  - `invalid_phone`
  - `request_failed`
- route `POST /api/auth/phone-verification/confirm` mappa gli esiti principali su:
  - `verified`
  - `rate_limited`
  - `missing_code`
  - `invalid_code`
  - `expired`
  - `request_required`
  - `missing_phone`
  - `confirm_failed`
- `next` viene sanitizzato: sono ammessi solo path relativi che iniziano con `/` (niente URL esterni o `//`)
- `:provider` e valido solo se presente in allow-list env (`KEYCLOAK_SOCIAL_PROVIDERS`), altrimenti redirect con errore `social_provider_unavailable`

### Admin auth BFF (`apps/admin/app/api/auth/**`)

- `GET /api/auth/login?next=<path-opzionale>`
- `POST /api/auth/login` (compat route: reindirizza a flow OIDC)
- `GET /api/auth/callback?code=<...>&state=<...>`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Note:

- `GET /api/auth/logout` e bloccato con `405`
- mutazioni auth admin usano validazione CSRF same-origin su `Origin/Referer`
- `POST /api/auth/login` e route compat con `formData` (`next` opzionale), poi redirect OIDC
- `next` viene sanitizzato: ammessi solo path relativi (`/admin...`)

### Listings

- `GET /v1/listings/breeds`
- `POST /v1/listings`
- `GET /v1/listings/public`
- `GET /v1/listings/public/:id`
- `POST /v1/listings/:id/contact`
- `GET /v1/listings/search`
- `GET /v1/listings/me`
- `PATCH /v1/listings/:id`
- `DELETE /v1/listings/:id`
- `POST /v1/listings/:id/media`
- `GET /v1/listings/:id/media`
- `PATCH /v1/listings/:id/media/:mediaId/cover`
- `DELETE /v1/listings/:id/media/:mediaId`
- `PATCH /v1/listings/:id/media/order`

Note:

- `PATCH /v1/listings/:id` non accetta modifiche `status`; lo stato annuncio e gestito da moderazione admin oppure da `DELETE /v1/listings/:id` (archive owner)
- endpoint owner mutativi richiedono email verificata (`POST /v1/listings`, `PATCH/DELETE /v1/listings/:id`, media upload/update/delete/reorder); se `emailVerified` non e `true` rispondono `403`

### Moderation

- `GET /v1/admin/moderation/queue?limit=<1..100>`
- `POST /v1/admin/moderation/:listingId/approve`
- `POST /v1/admin/moderation/:listingId/reject`
- `POST /v1/admin/moderation/:listingId/suspend`
- `POST /v1/admin/moderation/:listingId/restore`

Body richiesto per le action moderation:

```json
{
  "reason": "testo obbligatorio (3..2000)"
}
```

### Messaging

- `POST /v1/messages/listings/:listingId/thread`
- `GET /v1/messages/threads?limit=<1..50>&offset=<0..10000>`
- `GET /v1/messages/events?threadId=<opzionale>`
- `GET /v1/messages/threads/:threadId?limit=<1..100>&beforeMessageId=<opzionale>`
- `POST /v1/messages/threads/:threadId/messages`
- `POST /v1/messages/threads/:threadId/read`
- `DELETE /v1/messages/threads/:threadId`
- `DELETE /v1/messages/threads/:threadId/everyone`
- `POST /v1/messages/threads/:threadId/typing`

Note:

- `DELETE /v1/messages/threads/:threadId/everyone` elimina definitivamente il thread per entrambi i partecipanti
- tutti gli endpoint messaging richiedono email verificata; se `emailVerified` non e `true` rispondono `403`

### Analytics

- `POST /v1/analytics/events`
- `GET /v1/admin/analytics/kpis?windowDays=<1..365>`

Vincoli `POST /v1/analytics/events`:

- `metadata` opzionale, solo oggetto JSON (array non ammessi)
- chiavi top-level consentite:
  - `channel`, `surface`, `placement`, `campaign`, `referrer`, `queryText`, `locationScope`, `listingType`, `sort`, `device`, `page`, `cta`, `sessionId`, `experiment`, `variant`
- massimo 24 entry complessive (incluse nested), depth massima 3
- dimensione massima serializzata 2048 byte
- stringhe metadata massimo 180 caratteri

### Promotions

- `GET /v1/admin/promotions/plans?includeInactive=<true|false|1|0>`
- `GET /v1/admin/promotions/listings/:listingId`
- `POST /v1/admin/promotions/listings/:listingId/assign`

## `GET /v1/users/me` shape

```json
{
  "user": {
    "id": "kc-admin-1",
    "provider": "keycloak",
    "providerSubject": "kc-admin-1",
    "email": "admin.demo@adottaungatto.local",
    "emailVerified": true,
    "roles": ["admin"],
    "preferences": {
      "messageEmailNotificationsEnabled": true
    },
    "createdAt": "2026-03-04T10:00:00.000Z",
    "updatedAt": "2026-03-04T10:00:00.000Z"
  }
}
```

Note identita:

- `providerSubject` e il subject esterno stabile
- `user.id` e oggi allineato al subject pubblico stabile
- `app_users.id` resta interno e non va esposto come ID pubblico canonico

## `POST /v1/auth/password-recovery` shape

Request:

```json
{
  "identifier": "utente.demo@adottaungatto.local"
}
```

Response (sempre neutra):

```json
{
  "accepted": true,
  "message": "If the account exists, recovery instructions will be sent."
}
```

## `POST /v1/auth/email-verification/resend` shape

Auth:

- richiesto utente autenticato (Bearer o dev headers)

Request:

- body non richiesto

Response (neutra):

```json
{
  "accepted": true,
  "message": "If verification is pending, a new email has been sent."
}
```

## `POST /v1/auth/phone-verification/request` shape

Auth:

- richiesto utente autenticato (Bearer o dev headers)

Request:

```json
{
  "phoneE164": "+393331112233"
}
```

Note request:

- `phoneE164` opzionale: se assente, viene usato il numero presente nel profilo utente
- se `phoneE164` e invalido o non disponibile, risposta `400`

Response:

```json
{
  "accepted": true,
  "message": "If the phone number is eligible, a verification code has been issued.",
  "phoneE164": "+393331112233",
  "expiresInSeconds": 600,
  "devCode": "123456"
}
```

Note response:

- `devCode` e presente solo fuori produzione (`NODE_ENV != production`)
- delivery OTP configurata via env:
  - `PHONE_VERIFICATION_DELIVERY_PROVIDER=console|webhook|twilio`
  - `PHONE_VERIFICATION_DELIVERY_PROVIDER=console` in `production` ritorna `503`
  - `PHONE_VERIFICATION_DELIVERY_PROVIDER=webhook` richiede `PHONE_VERIFICATION_DELIVERY_WEBHOOK_URL`
  - `PHONE_VERIFICATION_DELIVERY_PROVIDER=twilio` richiede:
    - `PHONE_VERIFICATION_TWILIO_ACCOUNT_SID`
    - `PHONE_VERIFICATION_TWILIO_AUTH_TOKEN`
    - almeno uno tra `PHONE_VERIFICATION_TWILIO_FROM_NUMBER` e `PHONE_VERIFICATION_TWILIO_MESSAGING_SERVICE_SID`

Errori rilevanti:

- `400`: numero mancante/non valido
- `429`: rate-limit pubblico endpoint
- `503`: provider delivery OTP non raggiungibile o non configurato

## `POST /v1/auth/phone-verification/confirm` shape

Auth:

- richiesto utente autenticato (Bearer o dev headers)

Request:

```json
{
  "phoneE164": "+393331112233",
  "code": "123456"
}
```

Note request:

- `phoneE164` opzionale: se assente, viene usato il numero presente nel profilo utente
- `code` deve essere numerico con lunghezza configurata (`PHONE_VERIFICATION_CODE_LENGTH`)

Errori rilevanti:

- `400`: codice non valido/scaduto o challenge assente
- `429`: lockout tentativi (`retryAfterSeconds` nel body) o rate-limit endpoint

Response:

```json
{
  "verified": true,
  "phoneE164": "+393331112233",
  "verifiedAt": "2026-03-06T13:05:00.000Z"
}
```

## `GET /v1/users/me/profile` shape

```json
{
  "profile": {
    "firstName": "Mario",
    "lastName": "Rossi",
    "displayName": "Gatto Lover",
    "phoneE164": "+393331112233",
    "phoneVerifiedAt": "2026-03-06T13:05:00.000Z",
    "city": "Milano",
    "province": "MI",
    "bio": "Volontario in stallo.",
    "avatarStorageKey": "avatars/user-123/avatar.webp",
    "createdAt": "2026-03-05T12:00:00.000Z",
    "updatedAt": "2026-03-05T12:00:00.000Z"
  }
}
```

## Search listings: contratto chiave

Endpoint:

- `GET /v1/listings/search`

Query params supportati:

- `q` o `query`
- `locationScope` o `scope`
- `regionId`, `provinceId`, `comuneId`
- `locationLabel`, `locationSecondaryLabel`
- `referenceLat`, `referenceLon`
- `listingType` o `listing_type` o `type`
- `priceMin`, `priceMax`
- `ageText`, `ageMinMonths`, `ageMaxMonths`
- `sex`, `breed`
- `sort`: `relevance | newest | price_asc | price_desc`
- `limit` (default `24`, max `100`)
- `offset` (default `0`)

Contratto `LocationIntent`:

```json
{
  "scope": "italy | region | province | comune | comune_plus_province",
  "regionId": "string | null",
  "provinceId": "string | null",
  "comuneId": "string | null",
  "label": "string",
  "secondaryLabel": "string | null"
}
```

Regole validazione principali:

- se ci sono filtri location, `locationScope` diventa obbligatorio
- `locationScope=italy` non accetta `regionId/provinceId/comuneId`
- `region` richiede `regionId`
- `province` e `comune_plus_province` richiedono `provinceId`
- `comune` richiede `regionId + provinceId + comuneId`
- `referenceLat` e `referenceLon` devono arrivare insieme
- `priceMin <= priceMax`
- `ageMinMonths <= ageMaxMonths`
- `breed` deve appartenere al catalogo supportato

Shape risposta (estratto):

```json
{
  "items": [{ "id": "101", "distanceKm": 12.4 }],
  "pagination": { "limit": 24, "offset": 0, "total": 0, "hasMore": false },
  "metadata": {
    "fallbackApplied": false,
    "fallbackLevel": "none",
    "fallbackReason": null,
    "requestedLocationIntent": null,
    "effectiveLocationIntent": null
  }
}
```

Errore validazione:

```json
{
  "message": "Invalid search listings query.",
  "issues": [{ "path": "locationScope", "message": "..." }]
}
```

## Payload minimi utili

Preferences utente:

```json
{
  "messageEmailNotificationsEnabled": true
}
```

Contatto inserzionista:

```json
{
  "name": "Mario Rossi",
  "email": "mario@example.com",
  "phone": "+39 333 1234567",
  "message": "Messaggio di almeno 20 caratteri...",
  "privacyConsent": true,
  "website": "",
  "source": "web_public_form"
}
```

Vincoli contatto:

- `privacyConsent` deve essere `true`
- `website` e honeypot e deve restare vuoto

Promotions assign:

```json
{
  "planCode": "homepage_boost_7d",
  "startsAt": "2026-03-10T09:00:00.000Z",
  "metadata": {}
}
```

Vincoli promotions:

- area admin-only (`role=admin`)
- `planCode` deve matchare `[a-z0-9_]{3,80}`

## Note

- per dettaglio completo dominio chat usare `docs/MESSAGING.md`
- quando si modifica un controller o DTO, riallineare questo documento nello stesso change
