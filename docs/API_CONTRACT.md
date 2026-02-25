# API_CONTRACT.md

Contratti API pubblici e protetti per lo stato corrente del progetto.

## Versioning

- Base path: `/v1`
- Formato: `application/json`

## Listings Search (M3.3-M3.5)

Endpoint pubblico:

- `GET /v1/listings/search`

### Query params

- `q` (opzionale): testo libero su titolo/descrizione.
- `locationScope` (opzionale): `italy | region | province | comune | comune_plus_province`.
- `regionId` (opzionale): richiesto per `locationScope=region`, richiesto insieme a `provinceId` e `comuneId` per `locationScope=comune`.
- `provinceId` (opzionale): richiesto per `locationScope=province|comune_plus_province`; richiesto anche per `locationScope=comune`.
- `comuneId` (opzionale): richiesto per `locationScope=comune`.
- `locationLabel` (opzionale): label UI dell'intento selezionato.
- `locationSecondaryLabel` (opzionale): label secondaria UI.
- `listingType` (opzionale): filtro tipo annuncio.
- `priceMin` (opzionale): prezzo minimo.
- `priceMax` (opzionale): prezzo massimo.
- `ageText` (opzionale): filtro età testuale.
- `sex` (opzionale): filtro sesso.
- `breed` (opzionale): filtro razza.
- `sort` (opzionale): `relevance | newest | price_asc | price_desc` (default `relevance`).
- `limit` (opzionale): default `24`, range `1..100`.
- `offset` (opzionale): default `0`, minimo `0`.

### Contratto `LocationIntent`

Il contratto canonico lato API/UI è:

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

### Response shape

```json
{
  "items": [
    {
      "distanceKm": null
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

Note:

- `fallbackApplied`, `fallbackLevel`, `fallbackReason` sono sempre presenti nel payload.
- ogni item include `distanceKm` (km approssimati, 1 decimale) quando la ricerca ha un riferimento geografico risolvibile; altrimenti `null`.
- In M3.3 la query server-side usa OpenSearch (`listings_v1`) come motore primario.
- Se OpenSearch non risponde, l'API applica fallback tecnico su query SQL per mantenere la ricerca disponibile in locale.
- In M3.4 il fallback geografico anti-zero-results è attivo con sequenza:
  1. area richiesta
  2. area parent (comune -> provincia, provincia -> regione)
  3. province vicine (level `nearby`)
  4. regione
  5. Italia
- `fallbackReason` può assumere:
  - `WIDENED_TO_PARENT_AREA`
  - `WIDENED_TO_NEARBY_AREA`
  - `NO_EXACT_MATCH`
  - `NO_LOCATION_FILTER`
- In M3.5, con `locationIntent` geolocalizzato, l'ordinamento `relevance` usa la distanza (`_geo_distance`) come segnale principale o tie-break.
- In M5.2, con `sort=relevance` e `q` valorizzato, la search applica un boost sponsored controllato (`isSponsored` + `promotionWeight`) con cap massimo `1.2`, mantenendo la pertinenza testuale come segnale primario.
- Se OpenSearch non e disponibile, il fallback SQL mantiene una regola equivalente: sponsored come tie-break regolato, senza sovrascrivere i bucket di pertinenza.

### Errori validazione

Su query invalida: `400` con payload:

```json
{
  "message": "Invalid search listings query.",
  "issues": [
    {
      "path": "string",
      "message": "string"
    }
  ]
}
```

## Admin Promotions (M5.1)

Endpoint protetti admin:

- `GET /v1/admin/promotions/plans`
- `GET /v1/admin/promotions/listings/:listingId`
- `POST /v1/admin/promotions/listings/:listingId/assign`

Autorizzazione:

- ruolo richiesto: `admin` (utente/moderator ricevono `403`)

### GET `/v1/admin/promotions/plans`

Query params:

- `includeInactive` (opzionale): `true|false` (default `false`)

Response shape:

```json
{
  "includeInactive": false,
  "plans": [
    {
      "id": "11",
      "code": "boost_24h",
      "boostType": "boost_24h",
      "durationHours": 24,
      "promotionWeight": "1.120",
      "isActive": true
    }
  ]
}
```

### GET `/v1/admin/promotions/listings/:listingId`

Response shape:

```json
{
  "listingId": "101",
  "promotions": [
    {
      "id": "9001",
      "listingId": "101",
      "status": "active",
      "startsAt": "2026-02-25T10:00:00.000Z",
      "endsAt": "2026-02-26T10:00:00.000Z",
      "plan": {
        "code": "boost_24h",
        "durationHours": 24
      }
    }
  ]
}
```

### POST `/v1/admin/promotions/listings/:listingId/assign`

Request body:

```json
{
  "planCode": "boost_24h",
  "startsAt": "2026-02-26T08:00:00.000Z",
  "metadata": {
    "source": "admin-panel"
  }
}
```

Note:

- `planCode` obbligatorio (`[a-z0-9_]{3,80}`)
- `startsAt` opzionale ISO datetime; se omesso la promozione parte subito
- stato assegnato automaticamente:
  - `active` se `startsAt <= now`
  - `scheduled` se `startsAt > now`
- `endsAt` calcolato da `durationHours` del piano
- per listing `published`, l'assegnazione promozione innesca sync dell'indice search (`listings_v1`) per riflettere subito il ranking sponsored

Response shape:

```json
{
  "promotion": {
    "id": "9001",
    "listingId": "101",
    "status": "active",
    "plan": {
      "code": "boost_24h"
    }
  },
  "events": [
    {
      "eventType": "created"
    },
    {
      "eventType": "activated"
    }
  ]
}
```

Errori principali:

- `400` payload non valido (`planCode`, `startsAt`, `listingId`)
- `401` non autenticato
- `403` ruolo non autorizzato
- `404` listing o piano non trovati

## Analytics Events + KPI (M5.3 - M5.4)

Endpoint:

- `POST /v1/analytics/events` (pubblico, ingest eventi contatto)
- `GET /v1/admin/analytics/kpis` (protetto moderator/admin)

### POST `/v1/analytics/events`

Request body:

```json
{
  "eventType": "contact_clicked",
  "listingId": "101",
  "source": "web_public",
  "metadata": {
    "channel": "email"
  }
}
```

Regole:

- `eventType` consentiti: `contact_clicked | contact_sent`
- `listingId` obbligatorio (integer string)
- l'evento viene registrato solo se il listing esiste ed e `published`
- `source` opzionale (default `web_public`)

Response shape:

```json
{
  "event": {
    "id": "9100",
    "eventType": "contact_clicked",
    "actorUserId": null,
    "listingId": "101",
    "source": "web_public"
  }
}
```

### GET `/v1/admin/analytics/kpis`

Query params:

- `windowDays` opzionale (`1..365`, default `30`)

Response shape:

```json
{
  "windowDays": 30,
  "from": "2026-01-26T00:00:00.000Z",
  "to": "2026-02-25T00:00:00.000Z",
  "metrics": {
    "listingView": 120,
    "searchPerformed": 70,
    "searchFallbackApplied": 9,
    "contactClicked": 35,
    "contactSent": 12,
    "listingCreated": 28,
    "listingPublished": 14
  },
  "moderation": {
    "pendingReview": 4,
    "approved": 18,
    "rejected": 3
  },
  "funnel": {
    "listingCreated": 28,
    "listingPublished": 14,
    "contactClicked": 35,
    "contactSent": 12,
    "publishRatePct": 50,
    "contactFromPublishedRatePct": 85.7,
    "contactClickToSendRatePct": 34.3
  },
  "derived": {
    "fallbackRatePct": 12.9,
    "contactRatePct": 10,
    "publishRatePct": 50
  }
}
```

Note:

- KPI principali disponibili: `listingView`, `searchPerformed`, `searchFallbackApplied`, `contactClicked`, `contactSent`, `listingCreated`, `listingPublished`
- metriche moderazione incluse:
  - `pendingReview`: snapshot coda `pending_review` corrente
  - `approved`: numero azioni moderazione `approve` nel range selezionato
  - `rejected`: numero azioni moderazione `reject` nel range selezionato
- funnel base incluso:
  - volumi: `listingCreated`, `listingPublished`, `contactClicked`, `contactSent`
  - rate: `publishRatePct`, `contactFromPublishedRatePct`, `contactClickToSendRatePct`
- eventi server-side tracciati automaticamente:
  - `listing_created`
  - `listing_view`
  - `search_performed`
  - `search_fallback_applied` (solo se fallback attivo)
  - `listing_published` (transizione reale a `published`)

## Listing Contact (M5.5)

Endpoint pubblico:

- `POST /v1/listings/:id/contact`

### POST `/v1/listings/:id/contact`

Request body:

```json
{
  "name": "Mario Rossi",
  "email": "mario.rossi@example.test",
  "phone": "+393401112233",
  "message": "Ciao, sono interessato all'annuncio...",
  "privacyConsent": true,
  "website": "",
  "source": "web_public_form"
}
```

Regole:

- `name`, `email`, `message`, `privacyConsent=true` obbligatori
- `message` minimo 20 caratteri, massimo 2000
- `phone` opzionale
- `website` e honeypot anti-spam: deve restare vuoto
- listing target deve essere `published`
- anti-abuso:
  - rate limit per `listingId + senderIp` (finestra breve)
  - blocco messaggi duplicati (`listingId + senderEmail + messageHash`) in finestra 24h

Response shape:

```json
{
  "contactRequest": {
    "id": "5001",
    "listingId": "101",
    "createdAt": "2026-02-25T23:00:00.000Z"
  },
  "confirmation": {
    "message": "Richiesta inviata con successo. L'inserzionista ti contattera tramite i recapiti indicati."
  }
}
```

Errori principali:

- `400` payload non valido o anti-spam payload (honeypot/link eccessivi)
- `404` listing non trovato/non pubblicato
- `429` rate limit o richiesta duplicata recente

Note:

- l'invio form registra analytics server-side su evento `contact_sent`
- i click su CTA email/telefono restano tracciati come `contact_clicked`
