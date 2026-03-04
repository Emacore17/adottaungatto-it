# API_CONTRACT.md

Contratti API correnti da trattare come canonici finche non esiste una OpenAPI generata.

## Convenzioni generali

- base path: `/v1`
- payload: `application/json`
- ID numerici serializzati come stringhe in molti response payload
- auth browser canonica: `Authorization: Bearer <token>`
- auth locale alternativa per smoke script: header dev (`x-auth-user-id`, `x-auth-email`, `x-auth-roles`) se `AUTH_DEV_HEADERS_ENABLED=true`
- quando un rate limit pubblico blocca la richiesta, l'API restituisce `429` con body JSON e header `Retry-After`

## Mappa endpoint

### Health

- `GET /health`
- `GET /health/search`

### Users

- `GET /v1/users/me`
- `PATCH /v1/users/me/preferences`
- `GET /v1/users/moderation-space`
- `GET /v1/users/admin-space`

### Shape attuale di `GET /v1/users/me`

Response tipica:

```json
{
  "user": {
    "id": "kc-admin-1",
    "provider": "keycloak",
    "providerSubject": "kc-admin-1",
    "email": "admin.demo@adottaungatto.local",
    "roles": ["admin"],
    "preferences": {
      "messageEmailNotificationsEnabled": true
    }
  }
}
```

Nota importante:

- `providerSubject` e il subject esterno stabile dell'identita
- `user.id` e allineato al subject pubblico stabile, quindi oggi coincide con `providerSubject`
- `app_users.id` resta un identificatore interno lato server e non va esposto come ID pubblico canonico
- le nuove feature relazionali devono preservare questa separazione tra ID pubblico e ID interno

### Geography

- `GET /v1/geography/regions`
- `GET /v1/geography/provinces`
- `GET /v1/geography/comuni`
- `GET /v1/geography/search`

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

### Moderation

- `GET /v1/admin/moderation/queue`
- `POST /v1/admin/moderation/:listingId/approve`
- `POST /v1/admin/moderation/:listingId/reject`
- `POST /v1/admin/moderation/:listingId/suspend`
- `POST /v1/admin/moderation/:listingId/restore`

### Messaging

- `POST /v1/messages/listings/:listingId/thread`
- `GET /v1/messages/threads`
- `GET /v1/messages/events`
- `GET /v1/messages/threads/:threadId`
- `POST /v1/messages/threads/:threadId/messages`
- `POST /v1/messages/threads/:threadId/read`
- `DELETE /v1/messages/threads/:threadId`
- `DELETE /v1/messages/threads/:threadId/everyone`
- `POST /v1/messages/threads/:threadId/typing`

### Analytics

- `POST /v1/analytics/events`
- `GET /v1/admin/analytics/kpis`

### Promotions

- `GET /v1/admin/promotions/plans`
- `GET /v1/admin/promotions/listings/:listingId`
- `POST /v1/admin/promotions/listings/:listingId/assign`

## Search listings: contratto chiave

Endpoint pubblico:

- `GET /v1/listings/search`

### Query params supportati

- `q` o `query`
- `locationScope` o `scope`
- `regionId`
- `provinceId`
- `comuneId`
- `locationLabel`
- `locationSecondaryLabel`
- `referenceLat`
- `referenceLon`
- `listingType`, `listing_type` o `type`
- `priceMin`
- `priceMax`
- `ageText`
- `ageMinMonths`
- `ageMaxMonths`
- `sex`
- `breed`
- `sort`: `relevance | newest | price_asc | price_desc`
- `limit` (default `24`, max `100`)
- `offset` (default `0`)

### Contratto `LocationIntent`

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

### Regole di validazione principali

- se si passa qualunque filtro location, `locationScope` diventa obbligatorio
- `locationScope=italy` non accetta `regionId/provinceId/comuneId`
- `locationScope=region` richiede `regionId`
- `locationScope=province` e `comune_plus_province` richiedono `provinceId`
- `locationScope=comune` richiede `regionId + provinceId + comuneId`
- `referenceLat` e `referenceLon` devono arrivare insieme
- `priceMin <= priceMax`
- `ageMinMonths <= ageMaxMonths`

### Shape della risposta

```json
{
  "items": [
    {
      "id": "101",
      "distanceKm": 12.4
    }
  ],
  "pagination": {
    "limit": 24,
    "offset": 0,
    "total": 0,
    "hasMore": false
  },
  "metadata": {
    "fallbackApplied": false,
    "fallbackLevel": "none",
    "fallbackReason": null,
    "requestedLocationIntent": null,
    "effectiveLocationIntent": null
  }
}
```

### Note di comportamento

- OpenSearch e il motore primario
- in caso di indisponibilita di OpenSearch l'API usa fallback SQL
- il fallback geografico anti-zero-results allarga progressivamente l'area di ricerca
- `distanceKm` e valorizzato quando c'e un riferimento geografico utilizzabile

### Errori validazione

```json
{
  "message": "Invalid search listings query.",
  "issues": [
    {
      "path": "locationScope",
      "message": "..."
    }
  ]
}
```

## Preferences utente

Endpoint:

- `PATCH /v1/users/me/preferences`

Body:

```json
{
  "messageEmailNotificationsEnabled": true
}
```

Vincoli:

- il body deve essere un oggetto JSON
- `messageEmailNotificationsEnabled` deve essere boolean

## Contatto inserzionista

Endpoint:

- `POST /v1/listings/:id/contact`

Body minimo:

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

Note:

- `privacyConsent` deve essere `true`
- `website` e honeypot anti-spam e deve restare vuoto
- rate limit e anti-abuso sono applicati lato backend

## Messaging

Per payload, flussi e modello dati della messaggistica usare `docs/MESSAGING.md`.

## Promotions e analytics

Promotions:

- `GET /v1/admin/promotions/plans`
- `GET /v1/admin/promotions/listings/:listingId`
- `POST /v1/admin/promotions/listings/:listingId/assign`

Vincoli promotions:

- area admin-only (`role=admin`)
- `planCode` deve matchare `[a-z0-9_]{3,80}`
- `startsAt` e opzionale

Analytics:

- `POST /v1/analytics/events`
- `GET /v1/admin/analytics/kpis?windowDays=30`

Vincoli analytics:

- endpoint pubblico analytics accetta solo gli event type pubblici supportati
- `windowDays` deve essere un intero tra `1` e `365`
