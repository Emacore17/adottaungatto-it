# LOCAL_SETUP.md

Riferimento operativo locale per M0 bootstrap.

## 1. Preparazione

- `pnpm install`
- Copiare `.env.example` in `.env.local` (root + app)

## 2. Infrastruttura locale

```bash
pnpm infra:up
```

Se alcune porte host sono già occupate, usare override in `.env.local`:
- `POSTGRES_PORT`
- `REDIS_PORT`
- `OPENSEARCH_PORT`
- `MINIO_API_PORT`
- `MINIO_CONSOLE_PORT`
- `KEYCLOAK_PORT`
- `MAILPIT_SMTP_PORT`
- `MAILPIT_UI_PORT`

Servizi inclusi:
- PostgreSQL + PostGIS
- Redis
- OpenSearch
- MinIO
- Keycloak
- Mailpit

## 3. Avvio applicazioni

```bash
pnpm dev
```

Oppure singolarmente:
- `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm dev:worker`

## 4. Sanity check

- Web: http://localhost:3000
- Admin: http://localhost:3001
- API health: http://localhost:3002/health
- API auth check: `GET http://localhost:3002/v1/users/me` con header `x-auth-user-id`
- Web login: `http://localhost:3000/login`
- Admin login: `http://localhost:3001/login`

## 5. Keycloak locale (M1.2)

Il realm `adottaungatto` viene importato automaticamente da:
- `infra/keycloak/adottaungatto-realm.json`

Client locali:
- `adottaungatto-web`
- `adottaungatto-admin`
- `adottaungatto-mobile`

Utenti demo:
- `utente.demo` / `demo1234`
- `moderatore.demo` / `demo1234`
- `admin.demo` / `demo1234`

Flow login locale:
- `web` usa client Keycloak `adottaungatto-web`
- `admin` usa client Keycloak `adottaungatto-admin`
- sessione salvata in cookie HttpOnly per app (`WEB_SESSION_COOKIE_NAME`, `ADMIN_SESSION_COOKIE_NAME`)

## 6. DB migration (M1.4 + M2.1 + M2.2)

Eseguire:
```bash
pnpm db:migrate
```

Le migration correnti creano:
- `regions`
- `provinces`
- `comuni`
- `app_users`
- `listings`
- `listing_media`

Gestione migration:
- tabella `schema_migrations`
- controllo checksum per evitare drift di file gia applicati

## 7. Import geografia (M1.5)

Eseguire:
```bash
# opzionale: aggiorna snapshot locale da ISTAT
pnpm geo:sync

pnpm db:seed
```

Lo script:
- importa il dataset ufficiale ISTAT completo Italia (`20` regioni, `110` unita sovracomunali, `7895` comuni)
- allinea i nuovi codici amministrativi (incluso riassetto Sardegna dal `2026-01-01`)
- gestisce codici obsoleti con pruning controllato e upsert idempotente

Fonte dataset locale:
- `https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx`
- snapshot locale versionata in `apps/api/data/geography/istat-current.json`
- snapshot attuale: sheet `CODICI al 31_01_2026` (riferimento ISTAT `2026-01-31`)

## 8. Arresto

```bash
pnpm infra:down
```

## 9. Verifica lookup geography (M1.6)

Con API attiva:

```bash
curl http://localhost:3002/v1/geography/regions
curl "http://localhost:3002/v1/geography/provinces?regionId=1"
curl "http://localhost:3002/v1/geography/comuni?provinceId=11"
curl "http://localhost:3002/v1/geography/search?q=Tor&limit=5"
```

## 10. Verifica UI `LocationSelector` (M1.7)

Con `web` e `api` attivi:
- aprire `http://localhost:3000`
- usare la card `Selezione luogo`
- digitare `Torino` e verificare suggerimenti disambiguati (`Comune`, `Comune + provincia`, `Provincia`)
- digitare `Piemonte` e verificare suggerimento `Regione`
- verificare badge tipo area in ogni suggerimento
- verificare box `Form state (LocationIntent)`

## 11. Seed utenti demo Keycloak (M1.8)

Eseguire:

```bash
pnpm auth:seed
```

Lo script:
- usa Keycloak Admin API sul realm `adottaungatto`
- crea/aggiorna utenti demo (`utente.demo`, `moderatore.demo`, `admin.demo`)
- resetta password demo (`demo1234`)
- assegna ruoli realm (`user`, `moderator`, `admin`)
- e idempotente (ri-esecuzione sicura)

Verifica rapida token per i 3 ruoli:

```bash
pnpm auth:token utente.demo demo1234 adottaungatto-web
pnpm auth:token moderatore.demo demo1234 adottaungatto-admin
pnpm auth:token admin.demo demo1234 adottaungatto-admin
```

## 12. Smoke listings repository (M2.1)

Eseguire:

```bash
pnpm test:smoke:listings
```

Lo script:
- crea owner applicativo su `app_users` (upsert)
- crea un annuncio su `listings`
- verifica update stato/titolo
- esegue soft delete (stato `archived` + `deleted_at`)

Output atteso:
- `createdStatus = pending_review`
- `updatedStatus = published`
- `archivedStatus = archived`
- `listedAfterCount = 0`

## 13. Smoke listing media schema (M2.2)

Eseguire:

```bash
pnpm test:smoke:listings-media
```

Lo script verifica:
- inserimento di N media sullo stesso annuncio
- ordinamento stabile con `position` (`ORDER BY position`)
- vincolo univoco `listing_id + position`
- vincolo un solo media primario (`is_primary = true`) per annuncio
- cancellazione cascata `listing_media` quando il listing viene eliminato

Output atteso:
- `mediaRowsInserted = 3`
- `orderedPositions = [1,2,3]`
- `duplicatePositionRejected = true`
- `secondPrimaryRejected = true`
- `cascadeDeleteRemainingRows = 0`

## 14. MinIO upload integration (M2.3)

Eseguire:

```bash
pnpm minio:bootstrap
pnpm test:smoke:media-upload
pnpm test:smoke:worker-minio
```

Lo script `test:smoke:media-upload` verifica:
- bootstrap bucket MinIO (`listing-originals`, `listing-thumbs`)
- upload reale oggetto in `listing-originals`
- persistenza riferimento in tabella `listing_media`
- cleanup finale (delete DB e oggetto)

Output atteso:
- `objectExists = true`
- `dbRowsForListing = 1`

## 15. API create listing (M2.4)

Eseguire:

```bash
curl -X POST "http://localhost:3002/v1/listings" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: user-1" \
  -H "x-auth-email: user-1@example.test" \
  -H "x-auth-roles: user" \
  -d '{"title":"Micio in cerca di casa","description":"Socievole e abituato in appartamento.","listingType":"adozione","ageText":"2 anni","sex":"maschio","regionId":1,"provinceId":11,"comuneId":101}'
```

Comportamento atteso:
- validazione payload con schema Zod lato API
- `status` iniziale sempre `pending_review`
- ownership agganciata all'utente autenticato
- se il client invia `status` nel body, la richiesta viene rifiutata (`400`)

## 16. API listing media list/delete/reorder (M2.5)

Esempi:

```bash
# lista media
curl -H "x-auth-user-id: user-1" -H "x-auth-email: user-1@example.test" -H "x-auth-roles: user" \
  "http://localhost:3002/v1/listings/<LISTING_ID>/media"

# riordino media
curl -X PATCH "http://localhost:3002/v1/listings/<LISTING_ID>/media/order" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: user-1" \
  -H "x-auth-email: user-1@example.test" \
  -H "x-auth-roles: user" \
  -d '{"mediaIds":["<MEDIA_ID_2>","<MEDIA_ID_1>"]}'

# rimozione media
curl -X DELETE \
  -H "x-auth-user-id: user-1" \
  -H "x-auth-email: user-1@example.test" \
  -H "x-auth-roles: user" \
  "http://localhost:3002/v1/listings/<LISTING_ID>/media/<MEDIA_ID>"
```

Comportamento atteso:
- auth/ownership obbligatori su tutti gli endpoint
- lista sempre ordinata per `position`
- riordino accetta solo `mediaIds` univoci e completi rispetto ai media del listing
