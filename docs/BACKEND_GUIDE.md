# BACKEND_GUIDE.md

Guida canonica per audit, correzione ed estensione del backend. Serve a un coding agent per capire rapidamente cosa esiste davvero, cosa e rotto, cosa manca e quali regole valgono per rendere una feature testabile in locale e predisposta per prod.

## Regole operative

- il codice e la fonte primaria
- questo file descrive lo stato reale del backend e i criteri minimi per estenderlo
- nessuna feature backend e considerata pronta se manca anche solo uno di questi elementi:
  - migration SQL
  - repository/service/controller coerenti
  - test locali o smoke osservabili
  - vincoli authz, rate limit e validazione input
  - strategia minima per rollback, retention e dati sensibili
- quando cambia una feature core backend vanno riallineati anche `README.md`, `docs/API_CONTRACT.md`, `docs/TESTING.md` e `docs/MESSAGING.md` se coinvolto il dominio chat

## Backend reale oggi

### Implementato e reale

- auth Keycloak + dev headers locali
- identita pubblica utente stabilizzata: `GET /v1/users/me` espone `id` come subject pubblico stabile, non come `app_users.id`
- rate limit pubblico Redis-backed con fallback locale controllato se Redis non e disponibile
- CORS allowlist guidata da env e fail-fast startup se `NODE_ENV=production` con dev headers attivi
- backup/restore locale minimo verificato: dump Postgres, export MinIO, manifest con checksum e restore su risorse temporanee
- reindex search alias-safe: alias `listings_read` e `listings_write`, indici versionati `listings_v*`, bootstrap compatibile con legacy `listings_v1`
- cleanup search verificabile in locale: `pnpm search:cleanup` rimuove gli indici `listings_v*` inattivi oltre la finestra di rollback configurata
- verifica drift search locale: `pnpm search:verify` confronta conteggi e ID di annunci `published` tra DB e OpenSearch
- scheduler backend nel worker: cleanup retention per analytics, audit log, outbox concluso e thread messaggi gia soft-deleted, piu cleanup indici search inattivi
- profilo utente corrente e preferenze email messaggi
- geografia Italia versionata da snapshot ISTAT
- CRUD annunci, media MinIO, contatto inserzionista, moderazione
- ricerca pubblica con OpenSearch primario + fallback SQL
- messaggistica privata con SSE, Redis, outbox email e worker
- analytics e promotions lato backend

### Parziale, fragile o non production-safe

- se Redis non e disponibile il public rate limit degrada su memoria locale e perde coerenza cross-instance
- la topologia proxy reale va comunque fissata bene per gli ambienti non locali
- backup locale e manuale: non ha schedulazione, storage remoto o retention policy
- il restore search resta un rebuild da DB con `pnpm search:reindex`, non uno snapshot OpenSearch
- la retention attuale e conservativa: non elimina thread attivi e non archivia analytics
- il worker parte anche se Redis, MinIO o OpenSearch non sono raggiungibili
- `db:migrate` puo fallire se l'infrastruttura Docker non e ancora healthy

### Mancante

- backend per preferiti server-side
- recensioni e profilo pubblico venditore reali
- ricerche salvate e notifiche relative
- consenso cookie e profilazione persistiti lato backend
- recommendation engine e annunci personalizzati
- scheduler/cron piu completi per backup e manutenzione dati
- snapshot/restore OpenSearch e policy RPO/RTO formalizzate
- rollback operativo automatizzato per release e dati
- moderazione dedicata della chat, report abuso, retention/autocancellazione
- OpenAPI generata e SDK derivato dal contratto

## Baseline locale verificata

Comandi usati nell'audit corrente:

```bash
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm auth:seed
pnpm minio:bootstrap
pnpm --filter @adottaungatto/api typecheck
pnpm --filter @adottaungatto/worker test
pnpm backup:smoke
pnpm search:reindex
pnpm search:cleanup
pnpm search:verify
pnpm cleanup:retention
pnpm test:smoke:listings
pnpm test:smoke:media-upload
pnpm test:smoke:worker-minio
pnpm --filter @adottaungatto/api test:e2e
```

Risultato reale:

- smoke e test worker passano con infrastruttura locale attiva
- `pnpm --filter @adottaungatto/api typecheck` passa
- `pnpm --filter @adottaungatto/api test` passa e copre solo `*.spec.ts`
- `pnpm --filter @adottaungatto/api test:e2e` passa con stack locale attivo
- `pnpm backup:smoke` passa: crea backup in `apps/api/backups/local/<timestamp>`, ripristina Postgres su DB temporaneo e MinIO su bucket temporanei, poi verifica conteggi e checksum
- `pnpm search:reindex` passa: crea un nuovo `listings_v*`, indicizza in bulk e fa swap atomico di `listings_read` e `listings_write`
- `pnpm search:cleanup` passa: dopo reindex multipli ha eliminato gli indici inattivi piu vecchi mantenendo una finestra minima di rollback
- `pnpm search:verify` passa: ha confrontato DB e `listings_read` senza rilevare mismatch su conteggi o ID
- `pnpm cleanup:retention` passa: su righe di smoke scadute inserite localmente ha eliminato `analytics=1`, `audit=1`, `outbox_sent=1`, `outbox_failed=1`, `deleted_threads=1`
- `pnpm db:migrate` non ha un wait-for-health integrato: se lanciato troppo presto dopo `pnpm infra:up` puo fallire e va rilanciato
- `pnpm db:seed` oggi carica `regions=20`, `provinces=110`, `comuni=7894`; la copertura centroidi e `regions=20`, `provinces=110`, `comuni=7893`

## Findings prioritari

### 1. Search indexing e cleanup sono sistemati, ma la recovery search non e ancora completa

Problema:

- `apps/api/src/listings/search-index.service.ts` e `apps/worker/src/search-reindex.ts` ora usano alias `listings_read` e `listings_write` su indici versionati `listings_v*`
- il worker ha anche cleanup schedulato degli indici inattivi e comando manuale `pnpm search:cleanup`
- esiste uno smoke tecnico `pnpm search:verify` che controlla drift DB -> OpenSearch
- il restore search e ancora documentato come rebuild da DB, non come snapshot OpenSearch

Effetto:

- non c'e piu finestra di zero-results sul live index durante il reindex
- gli indici storici non si accumulano indefinitamente se il worker e attivo o se viene eseguito `pnpm search:cleanup`
- la recovery search resta comunque manuale e potenzialmente lenta senza snapshot

Correzione richiesta:

- decidere snapshot/restore OpenSearch oppure rebuild canonico con tempi attesi espliciti
- aggiungere metriche e alert minimi su reindex, cleanup e mismatch DB -> OpenSearch

### 2. Backup/restore esistono ma sono ancora incompleti per prod

Problema:

- esistono script locali `backup:create`, `backup:verify` e `backup:smoke` per dump Postgres, export MinIO e verify restore
- il manifest documenta il restore search come rebuild da DB, non come snapshot OpenSearch
- non ci sono schedulazione, storage remoto, retention o policy RPO/RTO formalizzate

Effetto:

- il backend e verificabile in locale ma non ancora pronto a recovery prod-safe
- il restore search puo essere lento e non e rollback-safe
- la recovery dipende ancora da esecuzione manuale e conoscenza operativa implicita

Correzione richiesta:

- schedulare backup e retention con ownership chiara
- aggiungere destinazione storage non locale e verifica periodica dei restore
- decidere tra snapshot OpenSearch e rebuild alias-safe come recovery search canonica
- policy rollback applicativo e rollback dati separata
- test periodico di restore su ambiente isolato

### 3. Scheduler e retention sono avviati, ma ancora incompleti per prod

Problema:

- il worker esegue ora un primo job schedulato di retention per analytics, audit log, outbox `sent/failed` e thread chat gia `deleted_at`
- il worker esegue ora anche cleanup schedulato degli indici OpenSearch inattivi
- mancano ancora backup schedulato, policy piu ricche per dati messaging attivi e metriche operative

Effetto:

- esiste finalmente una politica minima applicata e verificabile in locale su retention e lifecycle degli indici search
- restano scoperti backup storage, lifecycle dei thread non ancora eliminati e osservabilita dei job

Correzione richiesta:

- estendere lo scheduler a backup e metriche di manutenzione
- definire retention per thread non ancora soft-deleted e per eventuale archiviazione analytics
- aggiungere smoke o integration test per il ciclo schedulato continuo

## Database, dati, cache, schema e migrazioni

### Stato reale

- schema SQL manuale in `apps/api/migrations`
- checksums migration in `schema_migrations`
- Postgres/PostGIS come fonte di verita
- Redis usato davvero solo per realtime chat e typing state
- il worker applica una retention minima schedulata su analytics, audit log, outbox concluso e thread chat gia eliminati
- non esiste un modulo DB condiviso: i repository aprono piu `new Pool(...)` indipendenti

### Cosa non va

- connection management frammentato tra `users`, `listings`, `messaging`, `moderation`, `analytics`, `geography`, `worker`
- la retention minima ora esiste, ma solo come purge diretta e con policy statiche via env
- nessuna partizione o archiviazione per tabelle che possono crescere molto
- il seed geografico e cambiato rispetto a conteggi storici: non hardcodare i vecchi numeri nei test o nella doc
- backup/restore minimi esistono ma sono manuali, locali e non schedulati

### Correzioni richieste

- introdurre un provider DB condiviso con lifecycle unico e helper transazionali
- definire retention per eventi, audit log, outbox e messaggi
- aggiungere verifiche di readiness prima di `db:migrate` e smoke sui seed critici
- chiarire quali dati sono canonici e quali dati demo vanno rigenerati
- documentare RPO/RTO target prima di parlare di prod

### Aggiunte utili

- migrazioni con fase `expand -> backfill -> contract` per change delicati
- snapshot seed minimi per test rapidi
- metriche su pool saturation, lock e query lente

## Ricerca, localizzazione e posizione, ranking, data

### Stato reale

- `LocationIntent` e il contratto chiave per la ricerca
- OpenSearch e il motore primario
- alias `listings_read` e `listings_write` puntano all'indice attivo
- `pnpm search:reindex` crea un nuovo `listings_v*`, indicizza in bulk e fa swap atomico alias
- `pnpm search:cleanup` elimina gli indici `listings_v*` inattivi non piu protetti dagli alias oltre la soglia di retention configurata
- `pnpm search:verify` confronta gli ID annunci `published` tra DB e alias di lettura
- fallback SQL e fallback geografico sono gia implementati
- `geography` usa query SQL dirette su regioni, province e comuni

### Cosa non va

- suggestion geografiche basate su `ILIKE`, senza `unaccent` o trigram index
- ranking ancora euristico: testo, geo-distance e piccolo boost sponsored
- manca governance dei dati geo mancanti o incompleti
- manca una strategia snapshot/restore OpenSearch separata dal rebuild da DB

### Correzioni richieste

- strategia chiara per reindex completo, incrementale e rollback indice
- normalizzazione ricerca localita con `unaccent`, trigram o colonne dedicate
- metriche per zero-results, fallback rate e mismatch DB/OpenSearch

### Aggiunte utili

- scoring piu ricco con recency, quality score annuncio e trusted seller
- osservabilita sul ranking: perche un annuncio e arrivato in alto
- test dataset edge-case su comuni omonimi e query accentate

## API, CRUD operations e moderazione

### Stato reale

- CRUD annunci e media sono reali
- moderazione backend e reale con audit log su azioni
- analytics e promotions esistono lato backend
- i contratti sono documentati manualmente in `docs/API_CONTRACT.md`

### Cosa non va

- non esiste OpenAPI generata
- la allowlist CORS va popolata correttamente in ogni ambiente non locale
- manca un endpoint dedicato per consultare gli audit log admin
- mancano segnalazioni utente e code di moderazione extra-listing

### Correzioni richieste

- mantenere allowlist CORS esplicita per ambienti non locali
- generare OpenAPI o almeno schema machine-readable dal codice
- aggiungere endpoint/admin UI per audit log reali
- definire pattern standard per soft delete, idempotenza e audit su tutte le mutation critiche

### Aggiunte utili

- moderation reports per utenti e messaggi
- policy di idempotency keys sulle POST sensibili
- versioning contratti quando si apriranno client extra web/admin

## Messaggi, chat, dati, autocancellazione, spam, cache, rate limit, sicurezza

### Stato reale

- thread 1:1 per annuncio con SSE, typing e outbox email
- rate limit, slowmode, deduplica e max-links esistono gia
- Redis gestisce typing state e pub/sub realtime
- il worker ripulisce periodicamente outbox `sent/failed` e thread gia soft-deleted oltre la retention configurata

### Cosa non va

- la retention attuale elimina solo thread gia cancellati globalmente, non thread attivi o solo archiviati
- nessuna moderazione chat, report abuso o quarantena contenuti
- nessun supporto allegati, antivirus o scansione file
- outbox email non ha una vera DLQ applicativa, solo stato `failed`
- il worker resta vivo anche se dipendenze esterne non sono disponibili

### Correzioni richieste

- policy retention per thread, messaggi e outbox
- job schedulati per cleanup, tombstone e purge controllata
- report abuso e moderation workflow minimo per la chat
- readiness/liveness piu severi per il worker in ambienti non locali
- rate limit coerente tra API pubblica e dominio messaging

### Aggiunte utili

- shadow-ban/spam score per account/IP/device
- allegati con scanning e quota
- export thread e legal hold se diventano requirement

## Backup e rollback

### Stato reale

- esiste solo rollback transazionale locale in alcune operazioni DB
- esistono script locali:
  - `pnpm backup:create`
  - `pnpm backup:verify`
  - `pnpm backup:smoke`
- il backup corrente include:
  - dump Postgres custom format
  - export file MinIO dei bucket annunci
  - `manifest.json` con row count e checksum
- il restore search e documentato come rebuild alias-safe da DB con `pnpm search:reindex`

### Cosa non va

- il backup e pensato per locale e verifica tecnica, non per retention prod
- nessuna strategia snapshot/restore OpenSearch
- nessuno storage remoto, cifratura o retention backup
- nessuna policy esplicita di RPO/RTO
- nessun collegamento automatico tra release rollback e recovery dati

### Correzioni richieste

- script o job per:
  - dump Postgres schedulato
  - export bucket MinIO schedulato
  - snapshot indice o rebuild verificato da DB
- restore end-to-end su ambiente isolato
- checklist rollback release separata per schema, dati e indice search

## Autenticazione e autorizzazione

### Stato reale

- bearer token Keycloak verificato via JWKS
- RBAC base con `user`, `moderator`, `admin`
- dev headers locali ancora supportati
- `GET /v1/users/me` usa ora un ID pubblico stabile allineato al `providerSubject`
- l'API non parte in `production` se `AUTH_DEV_HEADERS_ENABLED=true`

### Cosa non va

- `AUTH_DEV_HEADERS_ENABLED=true` e molto comodo in locale, ma deve essere escluso dai runtime reali
- manca una matrice authz esplicita per tutte le risorse future

### Correzioni richieste

- hard fail in produzione se `AUTH_DEV_HEADERS_ENABLED=true`
- preservare chiaramente la separazione tra subject esterno, internal user id e actor id audit
- aggiungere regression test RBAC per ogni nuova area admin o utente

### Aggiunte utili

- session revocation piu esplicita
- audit auth events
- supporto service-to-service auth se nasceranno job o API esterne

## Preferiti, recensioni, ricerche salvate, profilazione e cookie

### Stato reale

- backend assente
- il frontend ha mock o persistenza locale browser per alcune di queste superfici

### Cosa non va

- nessuna persistenza cross-device per preferiti
- nessun modello dati per recensioni o reputazione venditore
- nessuna tabella per ricerche salvate o alert
- nessuna gestione backend del consenso cookie/profilazione

### Correzioni richieste

- introdurre queste feature solo come slice complete: schema + API + test + privacy
- usare il subject pubblico stabile come ID esterno e non esporre mai `app_users.id`
- evitare di derivare recommendation o profilazione senza consenso persistito e policy privacy chiare

### Aggiunte utili

- favoriti server-side con notifiche su cambio stato annuncio
- saved searches con digest email
- recensioni con policy anti-abuso e moderazione

## Schedulazioni e automatismi

### Stato reale

- worker polling per `notification_outbox`
- worker cleanup schedulato per retention minima di analytics, audit, outbox e thread gia eliminati
- worker cleanup schedulato per indici OpenSearch inattivi
- script manuale `pnpm search:reindex` con swap atomico alias
- script manuali `pnpm search:cleanup` e `pnpm search:verify`

### Cosa non va

- il modello scheduler esiste ma copre ancora un perimetro ristretto
- backup dipende ancora da comandi manuali

### Correzioni richieste

- consolidare ownership e naming dei job schedulati nel worker
- separare job di manutenzione da job user-facing
- ogni job deve avere idempotenza, metrica, retry e timeout

### Aggiunte utili

- cleanup periodico outbox e analytics
- reindex incrementale
- digest email e alert saved searches

## Algoritmi, annunci personalizzati e consigliati, privacy

### Stato reale

- recommendation engine assente
- ranking attuale limitato a ricerca e boost sponsored
- nessuna infrastruttura di profilazione backend

### Cosa non va

- mancano basi dati e consenso per personalizzazione seria
- nessun confine tra eventi analytics, recommendation features e privacy by design

### Correzioni richieste

- prima definire dati leciti, basi giuridiche e retention
- tenere separati:
  - analytics operativi
  - recommendation features
  - consensi utente
- rendere spiegabile ogni ranking personalizzato introdotto

### Aggiunte utili

- related listings non personalizzati come primo passo
- recommendation offline con feature semplici e auditabili
- opt-in esplicito per annunci personalizzati

## Checklist minima per nuovi task backend

- aggiungere o aggiornare migration SQL
- coprire path felice, validation error e authz con test
- rendere la feature verificabile in locale con smoke o E2E
- definire comportamento se Redis/OpenSearch/MinIO non sono disponibili
- decidere retention, dati sensibili e audit
- aggiornare la documentazione canonica toccata dal change

## Checklist minima prima di parlare di prod

- `AUTH_DEV_HEADERS_ENABLED=false`
- CORS allowlist esplicita
- rate limit distribuito
- backup/restore verificati
- restore search verificato o snapshot documentato
- policy retention per chat, audit, analytics e outbox
- health/readiness veri per API e worker
- segreti e credenziali fuori da valori demo/locali
