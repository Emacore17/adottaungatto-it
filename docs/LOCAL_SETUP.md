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
- API search health: http://localhost:3002/health/search
- API auth check: `GET http://localhost:3002/v1/users/me` con header `x-auth-user-id`
- Web login: `http://localhost:3000/login`
- Web nuovo annuncio (protetta): `http://localhost:3000/account/listings/new`
- Web miei annunci (protetta): `http://localhost:3000/account/listings`
- Web annunci pubblici: `http://localhost:3000/annunci`
- Admin login: `http://localhost:3001/login`
- API annunci pubblici: `GET http://localhost:3002/v1/listings/public`
- API ricerca annunci: `GET http://localhost:3002/v1/listings/search`

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
- `admin_audit_logs`

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
- arricchisce lo snapshot con centroidi ufficiali ISTAT (confini amministrativi generalizzati)
- usa fallback automatico anno confini (esempio: anagrafica `2026`, confini `2025` se `2026` non ancora pubblicati)
- gestisce codici obsoleti con pruning controllato e upsert idempotente
- genera seed demo M2.11 con almeno `30` listings distribuiti su piu province/regioni
- associa placeholder immagini su MinIO ai listings seedati
- mantiene idempotenza: ogni run sostituisce solo i listings demo seedati

Fonte dataset locale:
- `https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx`
- `https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati`
- snapshot locale versionata in `apps/api/data/geography/istat-current.json`
- snapshot attuale: sheet `CODICI al 31_01_2026` (riferimento ISTAT `2026-01-31`)

Verifica rapida centroidi (post-seed):
```bash
docker exec -it adottaungatto-postgres psql -U adottaungatto -d adottaungatto \
  -c "SELECT (SELECT COUNT(*) FROM regions WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS regions_with_centroids, (SELECT COUNT(*) FROM provinces WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS provinces_with_centroids, (SELECT COUNT(*) FROM comuni WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS comuni_with_centroids;"
```

Output atteso:
- `regions_with_centroids = 20`
- `provinces_with_centroids = 110`
- `comuni_with_centroids = 7895`

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

## 17. Form web create listing (M2.6)

Verifica manuale:
- login su `http://localhost:3000/login` con `utente.demo / demo1234`
- aprire `http://localhost:3000/account/listings/new`
- compilare il form (`react-hook-form` + validazione `zod`)
- selezionare luogo tramite `LocationSelector` (scope richiesto: comune)
- caricare almeno 1 immagine (drag&drop o file picker)
- inviare il form e verificare redirect su `/account/listings/submitted`

Comportamento atteso:
- submit con stato loading e gestione errore/successo
- chiamata API interna web `POST /api/listings` e upload immagini via `POST /api/listings/:id/media`
- schermata conferma con `id` annuncio e conteggio upload immagini

## 18. Lista web “I miei annunci” (M2.7)

Verifica manuale:
- aprire `http://localhost:3000/account/listings`
- verificare card elenco annunci in ordine recente
- verificare badge stato annuncio (`In revisione`, `Pubblicato`, `Rifiutato`, `Sospeso`, `Archiviato`)
- aprire `Dettaglio privato` su un annuncio e verificare route `/account/listings/<ID>`

Comportamento atteso:
- elenco coerente con dati API `GET /v1/listings/me`
- empty state con CTA “Crea ora” quando non ci sono annunci

## 19. Moderazione backend (M2.8)

Verifica manuale:
- ottenere token moderatore:
```bash
pnpm auth:token moderatore.demo demo1234 adottaungatto-admin
```
- leggere coda moderazione:
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3002/v1/admin/moderation/queue?limit=20"
```
- eseguire azione su annuncio in `pending_review`:
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

Comportamento atteso:
- accesso consentito solo a `moderator` / `admin` (utente standard riceve `403`)
- reason obbligatoria su tutte le azioni (`approve`, `reject`, `suspend`, `restore`)
- ogni azione crea un record in `admin_audit_logs`

Query utile audit log:
```bash
docker exec -it adottaungatto-postgres psql -U adottaungatto -d adottaungatto \
  -c "SELECT id, action, target_type, target_id, reason, from_status, to_status FROM admin_audit_logs ORDER BY created_at DESC LIMIT 10;"
```

## 20. Lista + dettaglio annunci pubblici (M2.10)

Verifica manuale:
- creare un annuncio (`M2.6`) e approvarlo (`M2.8` / `M2.9`)
- verificare endpoint lista pubblica:
```bash
curl "http://localhost:3002/v1/listings/public?limit=20&offset=0"
```
- verificare endpoint dettaglio pubblico:
```bash
curl "http://localhost:3002/v1/listings/public/<LISTING_ID>"
```
- verificare pagine web pubbliche:
  - `http://localhost:3000/annunci`
  - `http://localhost:3000/annunci/<LISTING_ID>`

Comportamento atteso:
- lista e dettaglio mostrano solo annunci `published`
- annuncio appena approvato compare nella lista pubblica
- route dettaglio di un annuncio non pubblicato/non esistente mostra stato `not found`

## 21. Seed demo annunci + immagini (M2.11)

Verifica manuale:
- eseguire seed completo:
```bash
pnpm db:seed
```
- eseguire smoke check seed demo:
```bash
pnpm test:smoke:seed-listings
```

Comportamento atteso:
- almeno `30` annunci demo presenti
- stati misti disponibili (`published`, `pending_review`, `rejected`, `suspended`)
- almeno una immagine placeholder per annuncio su MinIO
- copertura geografica multi area (regioni/province/comuni diversi)

## 22. Contratto ricerca annunci (M3.1-M3.4)

Verifica manuale:

```bash
curl "http://localhost:3002/v1/listings/search?locationScope=comune&regionId=1&provinceId=11&comuneId=101&listingType=adozione&sort=newest&limit=12&offset=0"
```

Comportamento atteso:
- payload con chiavi `items`, `pagination`, `metadata`
- `pagination` include `limit`, `offset`, `total`, `hasMore`
- `metadata` include sempre:
  - `fallbackApplied`
  - `fallbackLevel`
  - `fallbackReason`
  - `requestedLocationIntent`
  - `effectiveLocationIntent`
- `items[*].distanceKm` valorizzato quando la ricerca ha un riferimento geografico calcolabile
- ricerca primaria eseguita su OpenSearch (`listings_v1`)
- fallback geografico anti-zero-results attivo: comune -> provincia -> nearby -> regione -> Italia

Config fallback (API env):
- `SEARCH_FALLBACK_MAX_STEPS` (default `5`, range `1..5`)

## 23. OpenSearch index + reindex (M3.2)

Verifica manuale:

```bash
curl http://localhost:3002/health/search
pnpm search:reindex
curl "http://localhost:9200/listings_v1/_count"
```

Nota env worker:
- `pnpm search:reindex` richiede env worker validi (`WORKER_NAME`, `DATABASE_URL`, `REDIS_URL`, `OPENSEARCH_URL`).
- usare `apps/worker/.env.local` oppure esportare le variabili prima del comando.

Comportamento atteso:
- endpoint `health/search` risponde con `service=search`
- script worker `search:reindex` ricrea/aggiorna indice `listings_v1` e stampa totale indicizzato
- `_count` OpenSearch mostra un numero coerente con gli annunci `published`

## 24. UI ricerca fallback trasparente (M3.7)

Verifica manuale:
- aprire `http://localhost:3000/annunci`
- impostare un luogo specifico (es. comune) e una combinazione filtri restrittiva
- premere `Cerca annunci`
- in caso fallback geografico, verificare il banner informativo e le CTA:
  - `Usa area suggerita`
  - `Rimuovi filtri aggiuntivi`
  - `Cerca in tutta Italia`
- in caso `0 risultati` totale, verificare card con suggerimenti testuali e azioni rapide

Comportamento atteso:
- la UI mostra area richiesta e area effettiva della ricerca (badge + testo esplicito)
- il motivo fallback e il livello fallback sono leggibili per l'utente
- l'utente puo allargare ricerca o ridurre filtri senza dead-end
- lo stato zero risultati propone alternative concrete e non resta opaco

## 25. E2E Playwright ricerca + fallback (M3.8)

Verifica automatizzata:
```bash
pnpm --filter @adottaungatto/web test:e2e:install
pnpm test:e2e:web
```

Comportamento atteso:
- suite `apps/web/tests/e2e/search-fallback.spec.ts` verde
- copertura casi:
  - match esatto comune (senza banner fallback)
  - fallback comune -> provincia con banner e CTA dedicate
  - viewport mobile con banner fallback e drawer filtri

## 26. Design tokens e coerenza visuale (M4.1)

Verifica manuale:
- aprire:
  - `http://localhost:3000/annunci`
  - `http://localhost:3000/account/listings`
  - `http://localhost:3001/moderation`
- navigare componenti chiave (`Button`, `Badge`, `Card`, `Input`, `Dialog`)
- verificare stati semantici:
  - success
  - warning
  - danger
  - info

Comportamento atteso:
- stessi token visuali usati in web e admin (palette, radius, shadow, focus ring)
- badge status listing/moderazione coerenti e leggibili
- tipografia responsive con heading coerenti
- nessuna regressione di leggibilita su mobile/desktop

Riferimento:
- `docs/UX_UI_GUIDELINES.md`

## 27. Motion baseline (M4.2)

Verifica manuale:
- aprire `http://localhost:3000/annunci` e `http://localhost:3001/moderation`
- navigare tra pagine core (`/`, `/annunci`, `/account/listings`, `/moderation`)
- in `/annunci` osservare:
  - transizione da skeleton a contenuto risultati
  - hover/press sulle card annuncio
- in dialog moderazione osservare entrata/uscita overlay/contenuto

Comportamento atteso:
- animazioni leggere e consistenti (durate brevi, no jitter)
- page transitions non invasive ma percepibili
- microinterazioni card coerenti su web/admin
- nessun impatto negativo su leggibilita/usabilita mobile

## 28. Performance UX pass (M4.6)

Verifica manuale:
- aprire `http://localhost:3000/annunci` e applicare filtri/paginazione:
  - confermare che i dati restino fluidi tra una query e la successiva (cache TanStack attiva)
- aprire `http://localhost:3000/annunci/<LISTING_ID>`:
  - verificare hero e thumbs immagini caricati correttamente (pipeline `next/image`)
- aprire `http://localhost:3000` e `http://localhost:3000/account/listings/new`:
  - verificare che `LocationSelector` venga caricato lazy con skeleton iniziale
- aprire `http://localhost:3000` e `http://localhost:3001` in dev mode:
  - controllare console browser per metriche:
    - `[web-vitals] LCP|CLS|INP`
    - `[admin-web-vitals] LCP|CLS|INP`

Note operative:
- policy host immagini remoti definita in `apps/web/next.config.ts` per `localhost`, `127.0.0.1`, `minio`
- se in locale si usa un host immagini diverso da quelli sopra, aggiungerlo in `images.remotePatterns`

## 29. Promotions model + admin API (M5.1)

Prerequisiti:
- migration applicate (`pnpm db:migrate`)
- seed eseguito (`pnpm db:seed`)

Verifica DB:

```bash
docker exec -it adottaungatto-postgres psql -U adottaungatto -d adottaungatto \
  -c "SELECT code, boost_type, duration_hours, promotion_weight, is_active FROM plans ORDER BY duration_hours ASC;"

docker exec -it adottaungatto-postgres psql -U adottaungatto -d adottaungatto \
  -c "SELECT status, COUNT(*) FROM listing_promotions GROUP BY status ORDER BY status;"

docker exec -it adottaungatto-postgres psql -U adottaungatto -d adottaungatto \
  -c "SELECT event_type, COUNT(*) FROM promotion_events GROUP BY event_type ORDER BY event_type;"
```

Verifica API admin (role `admin`):

```bash
curl -H "x-auth-user-id: admin-local" -H "x-auth-email: admin-local@example.test" -H "x-auth-roles: admin" \
  "http://localhost:3002/v1/admin/promotions/plans"

curl -H "x-auth-user-id: admin-local" -H "x-auth-email: admin-local@example.test" -H "x-auth-roles: admin" \
  "http://localhost:3002/v1/admin/promotions/listings/<LISTING_ID>"

curl -X POST "http://localhost:3002/v1/admin/promotions/listings/<LISTING_ID>/assign" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: admin-local" \
  -H "x-auth-email: admin-local@example.test" \
  -H "x-auth-roles: admin" \
  -d "{\"planCode\":\"boost_24h\"}"
```

RBAC atteso:
- ruolo `admin`: `200/201`
- ruoli `user` e `moderator`: `403`
