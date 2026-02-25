# adottaungatto-it

Bootstrap locale del monorepo (`M0`) + baseline auth/geografia (`M1`) per avviare:
- `apps/web` (Next.js pubblico)
- `apps/admin` (Next.js admin separato)
- `apps/api` (NestJS + Fastify con `/health`)
- `apps/worker` (NestJS worker base)
- servizi infrastrutturali locali via Docker Compose

## Prerequisiti

- Node.js LTS (`.nvmrc` = `22`)
- pnpm
- Docker + Docker Compose

## Setup rapido

1. Installare dipendenze:
```bash
pnpm install
```

2. Creare gli env locali (PowerShell):
```powershell
Copy-Item .env.example .env.local
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/api/.env.example apps/api/.env.local
Copy-Item apps/worker/.env.example apps/worker/.env.local
```

3. Avviare l'infrastruttura:
```bash
pnpm infra:up
```

4. Avviare le app:
```bash
pnpm dev
```

## URL locali

- Web: http://localhost:3000
- Admin: http://localhost:3001
- Web login: http://localhost:3000/login
- Web nuovo annuncio (protetto): http://localhost:3000/account/listings/new
- Web miei annunci (protetto): http://localhost:3000/account/listings
- Web annunci pubblici: http://localhost:3000/annunci
- Admin login: http://localhost:3001/login
- API: http://localhost:3002
- API healthcheck: http://localhost:3002/health
- API search healthcheck: http://localhost:3002/health/search
- API utente corrente (protetto): http://localhost:3002/v1/users/me
- API geography regions: http://localhost:3002/v1/geography/regions
- API listings miei annunci (protetto): http://localhost:3002/v1/listings/me
- API creazione annuncio (protetto): `POST /v1/listings`
- API upload media annuncio (protetto): `POST /v1/listings/:id/media`
- API lista media annuncio (protetto): `GET /v1/listings/:id/media`
- API rimozione media annuncio (protetto): `DELETE /v1/listings/:id/media/:mediaId`
- API riordino media annuncio (protetto): `PATCH /v1/listings/:id/media/order`
- API coda moderazione admin (protetto): `GET /v1/admin/moderation/queue`
- API azioni moderazione admin (protetto): `POST /v1/admin/moderation/:listingId/{approve|reject|suspend|restore}`
- API lista annunci pubblici (pubblico): `GET /v1/listings/public`
- API dettaglio annuncio pubblico (pubblico): `GET /v1/listings/public/:id`
- API ricerca annunci (pubblico): `GET /v1/listings/search`
- Postgres/PostGIS: localhost:5432
- Redis: localhost:6379
- OpenSearch: http://localhost:9200
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001
- Keycloak: http://localhost:8080
- Mailpit UI: http://localhost:8025

## Script principali

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm dev:worker`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:e2e:web`
- `pnpm test:smoke`
- `pnpm test:smoke:listings`
- `pnpm test:smoke:listings-media`
- `pnpm test:smoke:media-upload`
- `pnpm test:smoke:seed-listings`
- `pnpm test:smoke:worker-minio`
- `pnpm minio:bootstrap`
- `pnpm geo:sync`
- `pnpm auth:seed`
- `pnpm auth:token`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm search:reindex`

## Credenziali locali (solo development)

- Postgres:
  - user: `adottaungatto`
  - password: `adottaungatto`
  - db: `adottaungatto`
- MinIO:
  - access key: `minio`
  - secret key: `minio123`
- Keycloak admin:
  - user: `admin`
  - password: `admin`
- Keycloak utenti demo (realm `adottaungatto`):
  - `utente.demo` / `demo1234` (`user`)
  - `moderatore.demo` / `demo1234` (`moderator`)
  - `admin.demo` / `demo1234` (`admin`)

## Verifica manuale minima (checkpoint M0)

1. `pnpm infra:up`
2. `pnpm dev`
3. Aprire web/admin:
   - http://localhost:3000
   - http://localhost:3001
4. Verificare API:
```bash
curl http://localhost:3002/health
```
Output atteso:
```json
{"status":"ok","service":"api","timestamp":"..."}
```

5. Verificare endpoint protetto (auth header locale M1.1):
```bash
curl -H "x-auth-user-id: user-1" -H "x-auth-email: user-1@example.test" -H "x-auth-roles: user" http://localhost:3002/v1/users/me
```

6. Verificare token Keycloak (M1.2):
```bash
pnpm auth:token utente.demo demo1234 adottaungatto-web
```
Usare il token restituito:
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3002/v1/users/me
```

7. Verificare login web/admin (M1.3):
- Web:
  - login `utente.demo` / `demo1234`
  - redirect automatico verso `/account`
- Admin:
  - login `moderatore.demo` / `demo1234`
  - redirect automatico verso `/moderation`
  - con utente senza ruolo admin/moderator, redirect a `/unauthorized`

8. Applicare migration geografia (M1.4):
```bash
pnpm db:migrate
```
La migration crea:
- `regions`
- `provinces`
- `comuni`
- `app_users`
- `listings`
- `listing_media`
- `admin_audit_logs`
- `schema_migrations`

9. Importare dataset geografia italiana (M1.5):
```bash
# opzionale: riallinea snapshot locale da fonte ISTAT ufficiale
pnpm geo:sync

pnpm db:seed
```
Output atteso:
- `regions=20`
- `provinces=110`
- `comuni=7895`
- `centroid_lat/lng` popolati per `regions/provinces/comuni` (M3.5)
- `demo listings >= 30`
- distribuzione stati mista (`published`, `pending_review`, `rejected`, `suspended`)
- placeholder media associati su MinIO

Dettaglio fonte e processo aggiornamento dataset: `docs/DATA_GEO_ITALIA.md`.
Linee guida UX/UI (M4): `docs/UX_UI_GUIDELINES.md`.

10. Verificare endpoint geography lookup (M1.6):
```bash
curl http://localhost:3002/v1/geography/regions
curl "http://localhost:3002/v1/geography/provinces?regionId=1"
curl "http://localhost:3002/v1/geography/comuni?provinceId=11"
curl "http://localhost:3002/v1/geography/search?q=Tor&limit=5"
```

11. Verificare `LocationSelector` (M1.7) in web home:
- aprire `http://localhost:3000`
- digitare `Torino` e verificare suggerimenti semantici:
  - `Torino (TO)` (Comune)
  - `Torino e provincia (TO)` (Comune + provincia)
  - eventuale `Torino (TO)` (Provincia)
- digitare `Piemonte` e verificare opzione `Regione`
- controllare il box `Form state (LocationIntent)` aggiornato in tempo reale

12. Seed utenti demo Keycloak idempotente (M1.8):
```bash
pnpm auth:seed
pnpm auth:seed
```

13. Verificare login/token per tutti i ruoli demo:
```bash
pnpm auth:token utente.demo demo1234 adottaungatto-web
pnpm auth:token moderatore.demo demo1234 adottaungatto-admin
pnpm auth:token admin.demo demo1234 adottaungatto-admin
```

14. Verificare CRUD repository annunci (M2.1):
```bash
pnpm test:smoke:listings
```
Output atteso:
- `createdStatus: "pending_review"`
- `updatedStatus: "published"`
- `archivedStatus: "archived"`
- `listedAfterCount: 0`

15. Verificare schema media annunci (M2.2):
```bash
pnpm test:smoke:listings-media
```
Output atteso:
- `mediaRowsInserted: 3`
- `orderedPositions: [1,2,3]`
- `duplicatePositionRejected: true`
- `secondPrimaryRejected: true`
- `cascadeDeleteRemainingRows: 0`

16. Verificare integrazione MinIO upload (M2.3):
```bash
pnpm minio:bootstrap
pnpm test:smoke:media-upload
pnpm test:smoke:worker-minio
```
Output atteso (`test:smoke:media-upload`):
- `objectExists: true`
- `dbRowsForListing: 1`

17. Verificare API creazione annuncio (M2.4):
```bash
curl -X POST "http://localhost:3002/v1/listings" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: user-1" \
  -H "x-auth-email: user-1@example.test" \
  -H "x-auth-roles: user" \
  -d '{"title":"Micio in cerca di casa","description":"Socievole e abituato in appartamento.","listingType":"adozione","ageText":"2 anni","sex":"maschio","regionId":1,"provinceId":11,"comuneId":101}'
```
Output atteso:
- `listing.status = "pending_review"`
- `listing.ownerUserId` associato all'utente autenticato
- payload con chiave `status` lato client rifiutato (`400`)

18. Verificare API media annuncio (M2.5):
```bash
# lista media
curl -H "x-auth-user-id: user-1" -H "x-auth-email: user-1@example.test" -H "x-auth-roles: user" \
  "http://localhost:3002/v1/listings/<LISTING_ID>/media"

# riordino media
curl -X PATCH "http://localhost:3002/v1/listings/<LISTING_ID>/media/order" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: user-1" -H "x-auth-email: user-1@example.test" -H "x-auth-roles: user" \
  -d '{"mediaIds":["<MEDIA_ID_2>","<MEDIA_ID_1>"]}'

# rimozione media
curl -X DELETE -H "x-auth-user-id: user-1" -H "x-auth-email: user-1@example.test" -H "x-auth-roles: user" \
  "http://localhost:3002/v1/listings/<LISTING_ID>/media/<MEDIA_ID>"
```
Output atteso:
- lista restituita ordinata per `position`
- riordino con `mediaIds` duplicati o incompleti rifiutato (`400`)
- rimozione media non posseduto/non esistente rifiutata (`404`)

19. Verificare form creazione annuncio web (M2.6):
- aprire `http://localhost:3000/login`
- login con `utente.demo / demo1234`
- aprire `http://localhost:3000/account/listings/new`
- compilare il form RHF + Zod, selezionare un comune con `LocationSelector`, caricare almeno 1 immagine
- inviare e verificare redirect a `/account/listings/submitted`
- verificare in schermata conferma:
  - `ID annuncio` valorizzato
  - `Immagini caricate` > 0
  - stato backend iniziale `pending_review` (via API)

20. Verificare lista “I miei annunci” web (M2.7):
- aprire `http://localhost:3000/account/listings`
- verificare elenco annunci con badge stato (`In revisione`, `Pubblicato`, `Rifiutato`, ...)
- verificare empty state curato quando la lista e vuota
- aprire un elemento con `Dettaglio privato` e verificare route `/account/listings/<ID>`

21. Verificare backend moderazione (M2.8):
- recuperare un token admin/moderator:
```bash
pnpm auth:token moderatore.demo demo1234 adottaungatto-admin
```
- leggere coda pending review:
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3002/v1/admin/moderation/queue?limit=20"
```
- approvare o rifiutare un annuncio in coda:
```bash
curl -X POST "http://localhost:3002/v1/admin/moderation/<LISTING_ID>/approve" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Contenuto conforme alle policy"}'

curl -X POST "http://localhost:3002/v1/admin/moderation/<LISTING_ID>/reject" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Contenuto non conforme alle policy"}'
```
- verificare audit log su DB:
```bash
docker exec -it adottaungatto-postgres psql -U adottaungatto -d adottaungatto \
  -c "SELECT id, action, target_type, target_id, reason, from_status, to_status FROM admin_audit_logs ORDER BY created_at DESC LIMIT 5;"
```

22. Verificare lista + dettaglio annunci pubblici (M2.10):
- creare un annuncio in `pending_review` (step 19) e approvarlo (step 21)
- verificare endpoint pubblico lista:
```bash
curl "http://localhost:3002/v1/listings/public?limit=20&offset=0"
```
- verificare endpoint pubblico dettaglio:
```bash
curl "http://localhost:3002/v1/listings/public/<LISTING_ID>"
```
- verificare web pubblico:
  - `http://localhost:3000/annunci`
  - `http://localhost:3000/annunci/<LISTING_ID>`
- comportamento atteso:
  - solo annunci `published` visibili
  - annuncio approvato compare in lista e dettaglio
  - annuncio non pubblicato/non esistente restituisce `404` lato API e pagina `not found` lato web

23. Verificare seed demo annunci + immagini (M2.11):
```bash
pnpm db:seed
pnpm test:smoke:seed-listings
```
Output atteso (`test:smoke:seed-listings`):
- `listingsTotal >= 30`
- `mediaTotal >= listingsTotal`
- copertura geografica multi area (`regionsTotal >= 5`, `provincesTotal >= 10`, `comuniTotal >= 15`)
- stati misti presenti (`published`, `pending_review`, `rejected`, `suspended`)

24. Verificare contratto ricerca annunci (M3.1-M3.4):
```bash
curl "http://localhost:3002/v1/listings/search?locationScope=comune&regionId=1&provinceId=11&comuneId=101&listingType=adozione&sort=newest&limit=12&offset=0"
```
Output atteso:
- payload con `items`, `pagination`, `metadata`
- metadata fallback sempre presenti:
  - `fallbackApplied`
  - `fallbackLevel`
  - `fallbackReason`
- path primario ricerca su OpenSearch (`listings_v1`)
- fallback tecnico su query SQL se OpenSearch non disponibile
- fallback geografico anti-zero-results attivo (comune -> provincia -> nearby -> regione -> Italia)

25. Verificare OpenSearch index/reindex (M3.2):
```bash
curl http://localhost:3002/health/search
pnpm search:reindex
curl "http://localhost:9200/listings_v1/_count"
```
Output atteso:
- `/health/search` raggiungibile con `service=search`
- script `search:reindex` completa con totale documenti indicizzati
- `_count` su `listings_v1` coerente con annunci `published`

Nota:
- `pnpm search:reindex` richiede env worker validi (`WORKER_NAME`, `DATABASE_URL`, `REDIS_URL`, `OPENSEARCH_URL`).

26. Verificare test ricerca M3.3 (OpenSearch + fallback tecnico):
```bash
pnpm --filter @adottaungatto/api test -- test/search-index.service.spec.ts test/listings.service.spec.ts test/listings-search.e2e-spec.ts
```
Output atteso:
- tutti i test verdi
- copertura filtri/sort/paginazione endpoint search
- copertura fallback tecnico API da OpenSearch a SQL

27. Verificare test fallback geografico M3.4:
```bash
pnpm --filter @adottaungatto/api test -- test/search-fallback.service.spec.ts test/listings-search.e2e-spec.ts
```
Output atteso:
- metadata fallback valorizzati quando si allarga l'area
- sequenza fallback coperta fino a `nearby`
- reason code coerenti (`WIDENED_TO_PARENT_AREA`, `WIDENED_TO_NEARBY_AREA`, `NO_LOCATION_FILTER`)

28. Verificare distanza geo M3.5:
```bash
curl "http://localhost:3002/v1/listings/search?locationScope=comune&regionId=1&provinceId=11&comuneId=101&sort=relevance&limit=12&offset=0"
```
Output atteso:
- `items[*].distanceKm` presente (numero o `null` quando non calcolabile)
- ordinamento `relevance` distance-aware su ricerca geolocalizzata

Esempio payload endpoint server-side:
```bash
curl -X POST "http://localhost:3002/v1/listings/<LISTING_ID>/media" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: user-1" \
  -H "x-auth-email: user-1@example.test" \
  -H "x-auth-roles: user" \
  -d '{"mimeType":"image/png","contentBase64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApMBgX4+7a8AAAAASUVORK5CYII=","fileName":"cat.png","isPrimary":true}'
```

## Troubleshooting rapido

- Porta occupata:
  - usare override host port in `.env.local` (es. `MINIO_API_PORT=19000`, `MINIO_CONSOLE_PORT=19001`).
  - se si cambia porta di un servizio usato dalle app, allineare anche URL applicativi (`MINIO_ENDPOINT`, ecc.).
- Docker non in esecuzione:
  - avviare Docker Desktop prima di `pnpm infra:up`.
- OpenSearch non healthy:
  - attendere 30-60s dopo il primo boot.
- Realm Keycloak non importato:
  - eseguire `pnpm infra:down` e poi `docker volume rm adottaungatto-it_keycloak-data` prima di `pnpm infra:up`.
- Errori env mancanti:
  - ricontrollare tutti i `.env.local`; la validazione Zod fallisce con messaggio esplicito.
