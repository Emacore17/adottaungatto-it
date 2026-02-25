# MILESTONES.md — adottaungatto-it

> Documento operativo per coding agent AI  
> Ordine vincolante: **local-first → E2E → UX premium → produzione sicura**  
> Stack fissato: Next.js + shadcn/ui + Motion + NestJS + Postgres/PostGIS + Redis + OpenSearch + MinIO + Keycloak

---

## 1) Scopo del documento

Questo file definisce:

- **milestones** in ordine obbligatorio
- **task atomici** eseguibili da coding agent AI
- **dipendenze** tra task
- **criteri di completamento**
- **checkpoint demo/test locali**
- **regole operative** per evitare drift e regressioni

---

## 2) Regole operative per coding agent AI (vincolanti)

### 2.1 Principi
- Lavorare per **feature verticali** (DB + API + UI + test)
- Non introdurre stack alternativi
- Ogni milestone deve lasciare il repo **eseguibile in locale**
- Prima far funzionare il flusso base, poi rifinire
- Nessuna feature “quasi pronta” senza test minimi e doc aggiornata

### 2.2 Ordine di lavoro (obbligatorio)
1. Infra locale + bootstrap
2. Auth/RBAC + geografia
3. Annunci + media + moderazione base
4. Ricerca + fallback geografico
5. UX/UI premium polish
6. Monetizzazione/analytics (predisposizione)
7. Hardening e produzione

### 2.3 Regola anti-regressione
Prima di chiudere un task:
- [ ] `lint`
- [ ] `typecheck`
- [ ] test pertinenti passano
- [ ] app avviabile in locale
- [ ] aggiornamento doc (se impatta setup/flow/api)

---

## 3) Convenzioni di esecuzione task

## 3.1 Granularità task
Ogni task dovrebbe essere:
- completabile in 1 PR
- testabile in locale
- con output osservabile (endpoint, pagina, componente, script, test)

### Esempio buono
- “Implementare tabella `regions/provinces/comuni` + migration + seed base + endpoint GET `/v1/geography/regions` + test integration”

### Esempio da evitare
- “Fare geografia italiana completa” (troppo ampio)

---

## 3.2 Naming (consigliato)
- Branch: `feat/m2-listing-create-api`, `fix/m3-search-fallback`, `chore/m0-compose-healthchecks`
- Commit: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)

---

## 4) Board milestones (panoramica)

| Milestone | Nome | Focus | Output principale |
|---|---|---|---|
| M0 | Bootstrap & Local Infra | Repo + compose + DX | Tutto avviabile in locale |
| M1 | Auth + RBAC + Geografia base | Accessi e dataset Italia | Login + lookup regioni/province/comuni |
| M2 | Annunci + Media + Moderazione base | Flusso core E2E | Creazione e approvazione annuncio |
| M3 | Ricerca + Fallback geografico | Core search UX | No dead-end con “0 risultati” |
| M4 | UX/UI Premium Polish | Motion, responsive, a11y, loading | Esperienza premium su pagine chiave |
| M5 | Business readiness | Monetizzazione/analytics predisposti | Boost flag + eventi + KPI base |
| M6 | Secure Production Readiness | Hardening + deploy | Staging/prod sicuri e monitorati |

---

# M0 — Bootstrap monorepo & infrastruttura locale

## Obiettivo
Avere il progetto **avviabile in locale** con tutti i servizi principali, senza blocchi manuali non documentati.

## Dipendenze
Nessuna (inizio progetto)

## Task atomici

### M0.1 — Inizializzare monorepo
- [ ] creare struttura `apps/` e `packages/`
- [ ] configurare `pnpm-workspace.yaml`
- [ ] configurare Turborepo (`turbo.json`)
- [ ] aggiungere `.nvmrc` o `.node-version`
- [ ] aggiungere `.editorconfig`
- [ ] aggiungere `.gitignore`

**Done quando**
- `pnpm install` esegue senza errori
- workspace riconosce tutte le app/packages

---

### M0.2 — Bootstrap app placeholder
- [ ] `apps/web` Next.js (App Router, TS)
- [ ] `apps/admin` Next.js (App Router, TS)
- [ ] `apps/api` NestJS + Fastify
- [ ] `apps/worker` NestJS standalone o worker base
- [ ] healthcheck endpoint API (`/health`)
- [ ] pagine placeholder web/admin con indicazione “up”

**Done quando**
- `web`, `admin`, `api` rispondono localmente
- `api /health` ritorna OK

---

### M0.3 — Design system base (foundation)
- [ ] setup Tailwind in `web` e `admin`
- [ ] setup shadcn/ui con config condivisibile
- [ ] creare `packages/ui`
- [ ] importare almeno componenti base: Button, Input, Card, Badge, Dialog, Skeleton
- [ ] tema base coerente (senza polish finale)

**Done quando**
- `web` e `admin` usano componenti da `packages/ui`
- build/typecheck passano

---

### M0.4 — Tooling qualità e standard
- [ ] configurare lint (Biome o ESLint, in linea col PRD)
- [ ] configurare format
- [ ] configurare `typecheck`
- [ ] script root standard (`dev`, `build`, `lint`, `typecheck`, `test`)
- [ ] pre-commit hooks (opzionale ma consigliato)
- [ ] `.env.example` root + per app

**Done quando**
- `pnpm lint` e `pnpm typecheck` girano su tutto il repo

---

### M0.5 — Docker Compose locale (servizi)
- [ ] PostgreSQL + PostGIS
- [ ] Redis
- [ ] OpenSearch
- [ ] MinIO
- [ ] Keycloak
- [ ] Mailpit/Mailhog
- [ ] healthchecks Compose
- [ ] volumi persistenti locali
- [ ] credenziali locali documentate

**Done quando**
- `pnpm infra:up` (o equivalente) alza tutti i servizi
- servizi raggiungibili con healthcheck ok

---

### M0.6 — Wiring ambienti locali e config condivise
- [ ] env schema (Zod) per `api`, `web`, `admin`, `worker`
- [ ] loader config centralizzato (packages/config)
- [ ] fallback e messaggi errori env mancanti
- [ ] URL locali standardizzati (porte fisse documentate)

**Done quando**
- startup fallisce in modo chiaro se env mancanti
- startup ok con `.env.local` corretto

---

### M0.7 — README bootstrap (prima versione)
- [ ] prerequisiti
- [ ] comandi minimi
- [ ] porte locali
- [ ] account demo placeholder (se non ancora pronti, marcarli “TBD”)
- [ ] troubleshooting base

**Done quando**
- un dev esterno può arrivare a vedere web/admin/api online

---

## Checkpoint demo M0 (manuale)
- [ ] `infra up`
- [ ] `pnpm dev`
- [ ] aprire web/admin
- [ ] chiamare `/health` API
- [ ] nessun errore critico di startup

---

# M1 — Auth + RBAC + Geografia base

## Obiettivo
Abilitare autenticazione/ruoli e il dataset geografico italiano con lookup usabili nei form.

## Dipendenze
M0 completato

## Task atomici

### M1.1 — Modello utenti e ruoli (backend)
- [ ] modulo `auth` e `users` NestJS
- [ ] modello utente locale applicativo (mappato a identity provider)
- [ ] enum ruoli (`user`, `moderator`, `admin`)
- [ ] guard e decorators RBAC backend

**Done quando**
- endpoint protetti con ruolo funzionano

---

### M1.2 — Integrazione Keycloak locale (API)
- [ ] realm locale `adottaungatto-it`
- [ ] client `web`, `admin` (e placeholder mobile)
- [ ] validazione token OIDC in API
- [ ] mapping ruoli dal token
- [ ] documentazione setup realm/client (script o export realm consigliato)

**Done quando**
- API riconosce token validi e ruoli

---

### M1.3 — Login web/admin (flow base)
- [ ] route protette `web` (area utente)
- [ ] route protette `admin`
- [ ] login/logout flow
- [ ] gestione sessione lato frontend
- [ ] redirect dopo login
- [ ] stato “non autorizzato” UX curato

**Done quando**
- login utente e admin funzionano in locale su app separate

---

### M1.4 — Schema DB geografia (Postgres/PostGIS)
- [ ] migration tabelle `regions`, `provinces`, `comuni`
- [ ] vincoli FK e univocità
- [ ] campi codici ISTAT + nomi + sigla provincia
- [ ] campi geolocalizzazione base (centroid lat/lng; geometrie opzionali M1, complete M3+)
- [ ] indici query lookup

**Done quando**
- migration applicata senza errori

---

### M1.5 — Import dataset geografia (script seed/import)
- [ ] script import CSV/JSON regioni/province/comuni
- [ ] normalizzazione encoding/accents
- [ ] validazione relazioni gerarchiche
- [ ] idempotenza (re-run senza duplicati)
- [ ] log riepilogo import

**Done quando**
- database contiene dataset utilizzabile
- re-run script non rompe i dati

---

### M1.6 — API Geography lookup
- [ ] `GET /v1/geography/regions`
- [ ] `GET /v1/geography/provinces?regionId=...`
- [ ] `GET /v1/geography/comuni?provinceId=...`
- [ ] `GET /v1/geography/search?q=...` (autocomplete base)
- [ ] test integration endpoint

**Done quando**
- UI può costruire selettore cascata regione/provincia/comune

---

### M1.7 — UI selezione luogo (componente riusabile)
- [ ] componente `LocationSelector` in `packages/ui` o `web` shared
- [ ] select cascata regione → provincia → comune
- [ ] stato loading/skeleton
- [ ] reset coerente sui cambi di parent
- [ ] gestione errori fetch

**Done quando**
- componente integrato in pagina demo `web`
- selezione persistita in form state

---

### M1.8 — Seed utenti demo (locale)
- [ ] utenti demo `user`, `moderator`, `admin`
- [ ] documentare credenziali locali
- [ ] script seed ripetibile

**Done quando**
- tester può fare login con tutti i ruoli demo

---

## Checkpoint demo M1
- [ ] login utente/admin funzionante
- [ ] API geography risponde
- [ ] selezione regione/provincia/comune funziona in UI demo

---

# M2 — Annunci + Media + Moderazione base (E2E core)

## Obiettivo
Completare il flusso principale: un utente crea un annuncio con foto, un moderatore lo approva, l’annuncio diventa visibile.

## Dipendenze
M1 completato

## Task atomici

### M2.1 — Schema DB annunci (core)
- [ ] migration `listings`
- [ ] campi MVP (titolo, descrizione, tipo, prezzo, età, sesso, razza libera/catalogo, stato)
- [ ] riferimenti geografici (`region_id`, `province_id`, `comune_id`)
- [ ] owner user
- [ ] timestamps + soft delete/archiviazione
- [ ] enum stato (`draft`, `pending_review`, `published`, `rejected`, `suspended`, `archived`)
- [ ] indici principali (stato, data, luogo)

**Done quando**
- CRUD DB annunci possibile via repository

---

### M2.2 — Schema DB media annunci
- [ ] migration `listing_media`
- [ ] collegamento a `listings`
- [ ] campi key storage, ordine, mime, size, width/height (se noti), hash (nullable M2)
- [ ] flag immagine principale
- [ ] indici per listing e ordine

**Done quando**
- annuncio può avere N immagini ordinate

---

### M2.3 — Integrazione MinIO (upload locale)
- [ ] bucket locali (originals, thumbs opzionale)
- [ ] client S3 compatibile in API/worker
- [ ] upload semplice (server-side o presigned MVP; scegliere una via e documentarla)
- [ ] validazione mime/size backend
- [ ] policy naming file coerente
- [ ] gestione errori upload

**Done quando**
- file immagine appare nel bucket MinIO locale e viene referenziato a DB

---

### M2.4 — API creazione annuncio (MVP)
- [ ] `POST /v1/listings`
- [ ] validazione DTO con Zod/class-validator (coerente con progetto)
- [ ] salvataggio stato iniziale (`pending_review` consigliato)
- [ ] ownership e auth
- [ ] test integration create listing

**Done quando**
- un utente autenticato crea annuncio via API con risposta coerente

---

### M2.5 — API media annuncio (MVP)
- [ ] endpoint upload immagini annuncio
- [ ] endpoint lista/rimozione immagini annuncio
- [ ] endpoint riordino immagini
- [ ] auth/ownership checks
- [ ] test integration principali

**Done quando**
- annuncio può avere almeno 2 immagini via API

---

### M2.6 — Form creazione annuncio (web)
- [ ] pagina “Nuovo annuncio”
- [ ] form RHF + Zod
- [ ] integrazione `LocationSelector`
- [ ] upload immagini (drag&drop o picker)
- [ ] validazioni UX (errori inline)
- [ ] submit con stato loading/success/error
- [ ] pagina/schermata conferma invio

**Done quando**
- utente demo crea un annuncio dal frontend web senza workaround

---

### M2.7 — Lista “I miei annunci” (web)
- [ ] elenco annunci utente con stato
- [ ] badge stati (in revisione, pubblicato, rifiutato...)
- [ ] link modifica/base detail privato
- [ ] empty state curato

**Done quando**
- utente vede l’annuncio appena creato con stato corretto

---

### M2.8 — Moderazione backend (MVP)
- [ ] modulo `moderation`
- [ ] endpoint coda pending
- [ ] endpoint azioni: approve / reject / suspend / restore
- [ ] motivazione azione
- [ ] audit log base (`admin_audit_logs`)
- [ ] test integration su approve/reject

**Done quando**
- moderatore può cambiare stato annuncio e l’azione è tracciata

---

### M2.9 — Admin UI moderazione (MVP)
- [ ] login admin/moderator
- [ ] pagina coda moderazione
- [ ] cards/tabella con annuncio, autore, luogo, immagini
- [ ] azioni approve/reject/suspend
- [ ] dialog motivo moderazione
- [ ] feedback UI esito azione

**Done quando**
- annuncio creato da web può essere approvato da admin

---

### M2.10 — Lista pubblica annunci + dettaglio (published only)
- [ ] pagina lista annunci pubblici
- [ ] filtro base stato implicito `published`
- [ ] pagina dettaglio annuncio
- [ ] gallery immagini base
- [ ] CTA contatto placeholder (implementazione M2/M3)
- [ ] gestione annuncio non trovato/non pubblicato

**Done quando**
- annuncio approvato visibile sul web pubblico

---

### M2.11 — Seed demo annunci + immagini
- [ ] generare almeno 30 annunci demo
- [ ] distribuzione geografica multi-regione/provincia/comune
- [ ] stati misti (pending/published/rejected/suspended)
- [ ] immagini placeholder associate
- [ ] script idempotente

**Done quando**
- ambiente locale ha dati realistici per test UI e search

---

## Checkpoint demo M2 (E2E core)
- [ ] login utente
- [ ] creazione annuncio con 2 immagini
- [ ] login moderatore/admin
- [ ] approvazione annuncio
- [ ] annuncio visibile in lista/dettaglio pubblico

---

# M3 — Ricerca geografica + fallback anti “0 risultati” (core prodotto)

## Obiettivo
Implementare la ricerca principale con filtri geografici italiani e fallback intelligente per evitare dead-end.

## Dipendenze
M2 completato

## Task atomici

### M3.1 — Schema/contratto ricerca (backend)
- [ ] definire DTO query ricerca (`SearchListingsQueryDto`)
- [ ] filtri MVP: luogo, tipo, prezzo, età, sesso, razza, sort
- [ ] risposta paginata standard
- [ ] metadata fallback (`fallbackApplied`, `fallbackLevel`, `fallbackReason`)

**Done quando**
- API contract ricerca è stabile e documentato

---

### M3.2 — Integrazione OpenSearch (indice annunci)
- [ ] creare indice `listings_v1`
- [ ] mapping campi (text/keyword/numeric/date/geo_point)
- [ ] indicizzazione annuncio pubblicato
- [ ] aggiornamento indice su edit/approve/suspend
- [ ] job reindex completo
- [ ] healthcheck/search ping

**Done quando**
- annunci `published` sono ricercabili da OpenSearch

---

### M3.3 — Query search base + filtri
- [ ] endpoint `GET /v1/listings/search`
- [ ] filtraggio per luogo (region/province/comune)
- [ ] filtri prezzo/età/sesso/tipo
- [ ] ordinamenti (rilevanza, recenti, prezzo)
- [ ] paginazione
- [ ] test integration search base

**Done quando**
- risultati coerenti per filtri comuni

---

### M3.4 — Fallback geografico anti 0 risultati (logica backend)
Implementare la sequenza:
1. comune
2. provincia
3. vicinanza/province limitrofe
4. regione
5. Italia

- [ ] servizio `SearchFallbackService`
- [ ] algoritmo con max step configurabile
- [ ] metadata step applicato
- [ ] reason code (`NO_EXACT_MATCH`, ecc.)
- [ ] test unit con casi realistici
- [ ] test integration scenario zero risultati

**Done quando**
- query senza match esatto restituisce risultati pertinenti + metadata fallback

---

### M3.5 — Distanza e vicinanza (geo)
- [ ] centroidi comuni/province/regioni utilizzabili
- [ ] supporto ordinamento per distanza (quando input geolocalizzato)
- [ ] fallback “vicino” con calcolo distanza
- [ ] badge distanza approssimativa (km) se disponibile

**Done quando**
- UI può mostrare “vicino a [comune/provincia]”

---

### M3.6 — UI ricerca/lista con filtri (web)
- [ ] barra ricerca luogo (Italia/regione/provincia/comune)
- [ ] filtri sidebar/drawer mobile
- [ ] chips filtri attivi
- [ ] ordinamento
- [ ] paginazione/infinite strategy (sceglierne una e fissarla)
- [ ] skeleton loading risultati
- [ ] empty state (senza fallback totale)

**Done quando**
- utente ricerca e filtra annunci in modo fluido su mobile/desktop

---

### M3.7 — UI messaggi fallback (obbligatorio)
- [ ] banner messaggio fallback (es. “Ti mostriamo annunci vicini”)
- [ ] badge area effettiva (comune/provincia/regione/Italia)
- [ ] CTA per rimuovere/ampliare filtri
- [ ] stato “zero totale” utile con suggerimenti

**Done quando**
- nessun “0 risultati” opaco: l’utente capisce sempre cosa succede

---

### M3.8 — E2E test Playwright ricerca + fallback
- [ ] caso match esatto comune
- [ ] caso no match comune → provincia/regione
- [ ] verifica banner fallback visibile
- [ ] verifica risultati cliccabili
- [ ] test mobile viewport

**Done quando**
- pipeline e2e copre il cuore della UX di ricerca

---

## Checkpoint demo M3
- [ ] ricerca per comune con match
- [ ] ricerca per comune senza match
- [ ] fallback attivato con messaggio chiaro
- [ ] filtri combinati funzionanti
- [ ] UX non finisce in dead-end

---

# M4 — UX/UI Premium Polish (moderna, animata, responsive)

## Obiettivo
Portare il prodotto da “funzionante” a “premium”: moderno, animato con gusto, responsive, comodo da usare.

## Dipendenze
M3 completato (core flow presente)

## Task atomici

### M4.1 — Design tokens e coerenza visiva
- [ ] definire typography scale
- [ ] spacing scale coerente
- [ ] radius, shadows, borders
- [ ] palette e semantic colors (success/warning/error/info)
- [ ] badge/stati standardizzati (annuncio, moderazione)

**Done quando**
- pagine chiave usano pattern visivi coerenti

---

### M4.2 — Motion guidelines + animazioni base
- [ ] linee guida motion (durate, easing, no abuso)
- [ ] page transitions leggere
- [ ] list item hover/press microinteractions
- [ ] modal/drawer transitions
- [ ] skeleton → content transition morbida

**Done quando**
- interazioni risultano fluide, non invasive, consistenti

---

### M4.3 — Responsive refinement (mobile-first)
Pagine target:
- home
- lista ricerca
- dettaglio annuncio
- crea annuncio
- admin moderazione

- [ ] breakpoint review completa
- [ ] filtri in drawer su mobile
- [ ] CTA sticky sul dettaglio annuncio (mobile)
- [ ] immagini/adaptive layout gallery
- [ ] admin usabile su tablet almeno

**Done quando**
- nessun overflow/layout rotto nei viewport target principali

---

### M4.4 — Loading / empty / error states premium
- [ ] skeleton per liste e cards
- [ ] empty states illustrativi/testuali utili
- [ ] error boundary UI gradevole
- [ ] retry actions per fetch falliti
- [ ] toast/feedback coerenti

**Done quando**
- tutti i flussi principali hanno stati non “grezzi”

---

### M4.5 — Accessibilità base (A11y pass)
- [ ] focus visible consistente
- [ ] label/input corretti
- [ ] aria labels dove serve
- [ ] navigazione tastiera componenti chiave
- [ ] contrasti base verificati
- [ ] dialog/drawer focus trap

**Done quando**
- flussi principali sono utilizzabili senza mouse

---

### M4.6 — Performance UX pass (web vitals oriented)
- [ ] image optimization policy
- [ ] lazy loading componenti non critici
- [ ] query caching TanStack ottimizzato
- [ ] riduzione JS non necessario su pagine chiave
- [ ] check base LCP/CLS/INP locale/staging

**Done quando**
- miglioramento percepibile loading e fluidità

---

## Checkpoint demo M4
- [ ] test manuale smartphone/tablet/desktop
- [ ] transizioni eleganti e coerenti
- [ ] skeleton/loading states completi
- [ ] dettaglio annuncio “premium”
- [ ] admin moderazione pulito e rapido

---

# M5 — Business readiness (monetizzazione + analytics predisposti)

## Obiettivo
Preparare il prodotto a monetizzazione e KPI senza bloccare l’MVP.

## Dipendenze
M4 completato (o almeno M3 stabile)

## Task atomici

### M5.1 — Modello dati piani e boost (predisposizione)
- [ ] tabelle `plans`, `listing_promotions`, `promotion_events`
- [ ] enum tipi boost (24h/7d/30d ecc. configurabili)
- [ ] campi validità temporale
- [ ] stato promozione
- [ ] migration + seed configurazioni demo

**Done quando**
- backend può associare una promozione a un annuncio

---

### M5.2 — Ranking search con segnale sponsored (controllato)
- [ ] supporto campo `isSponsored`/`promotionWeight` nell’indice
- [ ] regola ranking controllata (senza distruggere pertinenza)
- [ ] cap/limite prominenza
- [ ] test ranking base

**Done quando**
- annunci sponsorizzati possono emergere in modo regolato

---

### M5.3 — Analytics events (server/client)
Eventi minimi:
- `listing_view`
- `search_performed`
- `search_fallback_applied`
- `contact_clicked`
- `contact_sent`
- `listing_created`
- `listing_published`

- [ ] schema eventi
- [ ] tracking client e/o API
- [ ] storage base eventi (DB/table/log)
- [ ] dashboard admin KPI base (anche semplice)

**Done quando**
- almeno 5 KPI chiave consultabili in admin

---

### M5.4 — UI admin KPI base
- [ ] cards metriche principali
- [ ] range tempo base
- [ ] metriche moderazione (pending, approvati, rifiutati)
- [ ] metriche funnel (annunci creati/pubblicati/contatti)

**Done quando**
- admin visualizza stato operativo e funnel base

---

### M5.5 — Contatto inserzionista migliorato (conversione)
- [ ] form contatto completo con rate limiting
- [ ] anti-spam base
- [ ] conferma invio chiara
- [ ] tracciamento analytics integrato

**Done quando**
- funnel visita → contatto è misurabile e stabile

---

## Checkpoint demo M5
- [ ] admin vede KPI base
- [ ] evento fallback tracciato
- [ ] sponsorship simulabile (flag/admin)
- [ ] contatto inserzionista tracciato

---

# M6 — Secure Production Readiness (dopo local-first validato)

## Obiettivo
Portare il progetto a staging/prod in modo sicuro, osservabile e con rollback.

## Dipendenze
M0–M5 validati localmente (minimo M0–M4 per staging demo)

## Task atomici

### M6.1 — Infrastructure as Code (Terraform)
- [ ] moduli base AWS (network, ECS, RDS, Redis, OpenSearch, S3)
- [ ] ambienti `staging` e `prod`
- [ ] naming/tagging standard
- [ ] output e variabili documentati

**Done quando**
- infrastruttura staging provisioning ripetibile

---

### M6.2 — CI/CD pipeline
- [ ] build/test per monorepo
- [ ] container build apps (`web`,`admin`,`api`,`worker`)
- [ ] publish immagini
- [ ] deploy staging
- [ ] approval gate per prod
- [ ] rollback strategy documentata

**Done quando**
- una release può andare in staging da pipeline

---

### M6.3 — Sicurezza applicativa hardening
- [ ] security headers (CSP, HSTS, ecc.)
- [ ] WAF/CDN config base
- [ ] rate limit tuning
- [ ] MFA admin/moderatori (Keycloak policy)
- [ ] secret management
- [ ] audit logs retention policy

**Done quando**
- checklist sicurezza MVP+prod baseline soddisfatta

---

### M6.4 — Observability & alerting
- [ ] Sentry web/admin/api
- [ ] logging strutturato backend/worker
- [ ] metriche base (latency, error rate, queue depth)
- [ ] dashboard observability
- [ ] alert su errori critici / downtime / queue failure

**Done quando**
- problemi principali sono rilevabili senza accesso manuale ai container

---

### M6.5 — Backup/restore + runbook
- [ ] policy backup DB
- [ ] test restore staging
- [ ] runbook incidenti base
- [ ] checklist deploy e post-deploy verification

**Done quando**
- esiste prova di restore riuscito e procedure documentate

---

## Checkpoint demo M6
- [ ] deploy staging end-to-end
- [ ] login + creazione + moderazione + ricerca su staging
- [ ] monitoring e error tracking attivi
- [ ] rollback documentato/testato (almeno dry-run)

---

## 5) Task trasversali (cross-cutting, lungo tutto il progetto)

Questi task non sono una milestone autonoma: vanno portati avanti in parallelo.

### X1 — OpenAPI e SDK generation
- [ ] Swagger/OpenAPI in API
- [ ] generazione `packages/sdk`
- [ ] uso SDK in `web` e `admin`
- [ ] rigenerazione automatica/documentata

**Motivo**: riduce drift tra frontend/backend, ideale per agent AI.

---

### X2 — Test infra e fixtures
- [ ] fixture condivise per test backend
- [ ] helper autenticazione test
- [ ] factory annunci/utenti/geografia
- [ ] test DB isolation

---

### X3 — Documentazione continua
Aggiornare man mano:
- [ ] `README.md`
- [ ] `LOCAL_SETUP.md`
- [ ] `TESTING.md`
- [ ] `ARCHITECTURE.md`
- [ ] `SECURITY_BASELINE.md`
- [ ] `DATA_GEO_ITALIA.md`

---

### X4 — ADR (Architecture Decision Records)
Creare ADR brevi per scelte non banali:
- [ ] upload images strategy (presigned vs proxy)
- [ ] search pagination strategy
- [ ] fallback ranking strategy
- [ ] auth/session integration Next + Keycloak

---

## 6) Checklist E2E locale finale (milestone gate)

Questa checklist è il **gate minimo** prima di passare seriamente alla produzione.

### Utente
- [ ] registrazione/login
- [ ] crea annuncio con immagini
- [ ] vede stato annuncio
- [ ] ricerca per luogo
- [ ] vede fallback se nessun risultato esatto
- [ ] apre dettaglio annuncio
- [ ] invia contatto inserzionista

### Moderatore/Admin
- [ ] login admin separato
- [ ] vede coda moderazione
- [ ] approva/rifiuta/sospende annuncio
- [ ] audit log registra azione
- [ ] dashboard KPI base visibile (da M5)

### Sistema
- [ ] worker processa task
- [ ] OpenSearch risponde
- [ ] Redis/queue funzionante
- [ ] MinIO upload/accesso immagini ok
- [ ] test e2e smoke passano
- [ ] documentazione locale aggiornata

---

## 7) Priority labels (per issue/task tracker)

Usare queste etichette (consigliato):

- `P0-blocker` → blocca milestone o local setup
- `P1-core` → flusso principale prodotto
- `P2-important` → valore alto ma non blocca demo E2E
- `P3-polish` → rifiniture

Tag aggiuntivi:
- `milestone:M0` ... `milestone:M6`
- `area:web`, `area:admin`, `area:api`, `area:worker`, `area:infra`, `area:search`, `area:geo`, `area:auth`, `area:ux`
- `type:feat`, `type:fix`, `type:docs`, `type:test`, `type:chore`

---

## 8) Definition of Ready (DoR) per un task AI

Un task è pronto per essere assegnato a un coding agent AI se:
- [ ] scope chiaro e limitato
- [ ] dipendenze soddisfatte
- [ ] output atteso definito (endpoint/pagina/script/test)
- [ ] criteri di “done” espliciti
- [ ] impatto su doc/test indicato

---

## 9) Definition of Done (DoD) per un task AI

Un task è completato solo se:
- [ ] implementazione completa
- [ ] lint/typecheck passano
- [ ] test pertinenti aggiunti/aggiornati e passano
- [ ] verifica manuale locale eseguita (se UI/flow)
- [ ] docs aggiornate
- [ ] nessun breaking change non documentato
- [ ] logging/error handling minimo incluso
- [ ] sicurezza input/permessi considerati

---

## 10) Sequenza raccomandata di avvio reale (prime 2 settimane)

### Sprint iniziale consigliato
**Giorni 1–3**
- M0.1, M0.2, M0.4, M0.5

**Giorni 4–5**
- M0.3, M0.6, M0.7

**Settimana 2**
- M1.1, M1.2, M1.3
- M1.4, M1.5, M1.6, M1.7
- M1.8

> Obiettivo concreto: **entro fine settimana 2** login funzionante + selezione geografia italiana in UI locale.

---

## 11) Nota finale operativa

Questo piano è progettato per massimizzare:
- velocità di sviluppo con coding agent AI
- verificabilità locale reale
- qualità UX/UI premium
- riduzione del rischio tecnico prima del deploy

La regola fondamentale resta: **ogni milestone deve essere dimostrabile in locale end-to-end** prima di passare alla successiva.