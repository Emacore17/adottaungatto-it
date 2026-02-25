# SRS.md — adottaungatto-it

> **Progetto:** adottaungatto-it  
> **Documento:** Software Requirements Specification (SRS)  
> **Versione:** v1.0  
> **Stato:** Bozza esecutiva (baseline per coding agent AI)  
> **Riferimenti:** `PRD.md`, `MILESTONES.md`

---

## 1. Introduzione

### 1.1 Scopo del documento
Questo documento definisce in modo formale i **requisiti software** di **adottaungatto-it**, una piattaforma web di annunci per gatti e gattini, con:
- piattaforma pubblica per utenti/inserzionisti
- pannello **admin/moderazione separato e protetto**
- ricerca geografica italiana avanzata
- architettura predisposta a scalabilità e futura app mobile

Il documento è destinato a:
- coding agent AI
- sviluppatori
- QA/tester
- product owner
- DevOps/SecOps

### 1.2 Obiettivi principali del sistema
- Consentire la pubblicazione e ricerca di annunci di gatti/gattini
- Fornire una UX/UI moderna, animata, responsive, premium
- Gestire correttamente geografia italiana (comune/provincia/regione/Italia)
- Evitare dead-end in ricerca (“0 risultati”) con fallback pertinenti
- Consentire moderazione sicura e auditabile
- Garantire una base scalabile e API-first

### 1.3 Priorità di progetto (vincolante)
Ordine di priorità:
1. **Funzionamento in locale end-to-end**
2. **Testabilità (manuale + automatica)**
3. **Qualità UX/UI Premium**
4. **Messa in produzione sicura**

### 1.4 Ambito
Questo SRS copre:
- MVP + base v1 (come da PRD)
- requisiti funzionali e non funzionali
- interfacce
- dati e vincoli
- sicurezza
- criteri di accettazione software

Non copre in dettaglio:
- UX visual design pixel-perfect (rimandato a `UX_UI_GUIDELINES.md`)
- dettagli infra cloud implementativi completi (rimandati a `DEPLOYMENT.md`)
- normative/compliance legali complete (rimandate a documenti legali/compliance)

---

## 2. Riferimenti

- `PRD.md` — Product Requirements Document
- `MILESTONES.md` — piano operativo per coding agent AI
- `ARCHITECTURE.md` (da produrre)
- `LOCAL_SETUP.md` (da produrre)
- `TESTING.md` (da produrre)
- `SECURITY_BASELINE.md` (da produrre)
- `DATA_GEO_ITALIA.md` (da produrre)
- OpenAPI spec (da generare dal backend)

---

## 3. Definizioni e abbreviazioni

- **MVP**: Minimum Viable Product
- **RBAC**: Role-Based Access Control
- **OIDC**: OpenID Connect
- **SRS**: Software Requirements Specification
- **PRD**: Product Requirements Document
- **E2E**: End-to-End
- **UI**: User Interface
- **UX**: User Experience
- **DTO**: Data Transfer Object
- **API-first**: backend progettato come base per più client (web/admin/mobile)
- **Fallback geografico**: strategia di espansione area ricerca per evitare zero risultati
- **Annuncio**: inserzione pubblicata da un utente
- **Inserzionista**: utente che pubblica annunci
- **Moderatore**: utente con permessi di revisione contenuti
- **Admin**: utente con permessi amministrativi avanzati

---

## 4. Descrizione generale del sistema

### 4.1 Visione del prodotto
adottaungatto-it è una piattaforma verticale per annunci relativi a gatti e gattini, progettata per:
- offrire un’esperienza premium e veloce
- aumentare la pertinenza della ricerca geografica in Italia
- introdurre moderazione efficace e sicura
- abilitare monetizzazione futura (boost, profili pro, ecc.)

### 4.2 Architettura software di riferimento (vincolata)
Stack definito:
- **Frontend pubblico**: Next.js + TypeScript + shadcn/ui + Tailwind + Motion + TanStack Query
- **Frontend admin**: Next.js separato (subapp dedicata)
- **Backend API**: NestJS + Fastify + REST/OpenAPI
- **Worker async**: NestJS/BullMQ
- **DB**: PostgreSQL + PostGIS
- **Search**: OpenSearch
- **Cache/Queue**: Redis + BullMQ
- **Storage media**: S3-compatible (locale: MinIO)
- **Auth**: Keycloak (OIDC/OAuth2, RBAC)
- **Monorepo**: pnpm workspace + Turborepo

### 4.3 Utenti e ruoli
Ruoli minimi:
- `visitor` (non autenticato)
- `user` (utente autenticato)
- `moderator`
- `admin`

Ruoli futuri previsti:
- `verified_seller`
- `support`
- `finance`
- `senior_moderator`

### 4.4 Assunzioni e dipendenze
- Il dataset geografico italiano è importabile e aggiornabile da fonti ufficiali (vedi `DATA_GEO_ITALIA.md`)
- L’MVP può usare immagini placeholder/demo in locale
- Per ambiente locale, servizi esterni sono emulati via Docker Compose (MinIO, Keycloak, ecc.)
- L’app mobile non è scope iniziale ma il backend deve essere API-first

### 4.5 Vincoli
- Nessun cambio stack senza approvazione esplicita
- Admin/moderazione devono essere app separata e protetta
- Geografia italiana è requisito core, non opzionale
- La demo locale E2E è criterio di accettazione fondamentale

---

## 5. Contesto di sistema e interazioni esterne

### 5.1 Componenti principali
- **Web App (pubblica)**: navigazione, ricerca, pubblicazione annunci, profilo utente
- **Admin App**: moderazione, audit, dashboard
- **API**: logica di business, autenticazione, dati
- **Worker**: job asincroni (indicizzazione, media processing, sync)
- **Database**: persistenza dati
- **Search Engine**: ricerca full-text + geofiltro
- **Object Storage**: immagini annunci
- **Identity Provider**: autenticazione e ruoli

### 5.2 Interfacce esterne
- Keycloak (OIDC token/session)
- OpenSearch
- Redis
- PostgreSQL/PostGIS
- S3-compatible storage (MinIO in locale)
- (Fase futura) provider email/SMS/pagamenti/notifiche push

---

## 6. Requisiti di interfaccia esterna

## 6.1 Interfaccia utente (UI)
### 6.1.1 Requisiti generali UI
- UI moderna, responsive, mobile-first
- design system coerente con shadcn/ui
- microinterazioni e animazioni leggere (Motion)
- feedback chiari per loading/error/success
- no layout rotti su viewport standard mobile/tablet/desktop

### 6.1.2 Requisiti UX premium (obbligatori)
- Il sistema **non deve** mostrare “0 risultati” senza proposta alternativa quando è applicabile il fallback geografico
- Devono essere presenti skeleton/loading states nelle pagine core
- Le CTA principali devono essere chiaramente visibili
- Il dettaglio annuncio su mobile deve avere CTA contatto facilmente accessibile

## 6.2 Interfaccia API (backend)
- REST API versionata (`/v1`)
- Contratto documentato via OpenAPI
- Autenticazione via Bearer token OIDC/JWT
- Errori standardizzati con codici e payload coerenti

## 6.3 Interfaccia storage media
- Upload immagini tramite endpoint API (MVP) o URL presigned (decisione architetturale documentata)
- Storage S3-compatible
- Nomenclatura oggetti coerente e deterministica

## 6.4 Interfaccia identity/auth
- OIDC/OAuth2 con Keycloak
- Ruoli e claims mappati su RBAC applicativo
- Client separati per web/admin (mobile predisposto)

---

## 7. Requisiti funzionali

> Formato ID: `FR-<area>-<numero>`

---

## 7.1 Autenticazione e autorizzazione

### FR-AUTH-001 — Registrazione utente
Il sistema deve consentire la registrazione di un nuovo utente tramite interfaccia web.

**Criteri di accettazione**
- Creazione account valida con dati minimi richiesti
- Messaggi di errore chiari per input non validi
- Utente autenticabile dopo registrazione (secondo flow previsto)

### FR-AUTH-002 — Login/logout
Il sistema deve consentire login e logout per utenti autenticati.

### FR-AUTH-003 — Protezione route private
Le route utente riservate devono richiedere autenticazione.

### FR-AUTH-004 — Protezione admin separata
L’app admin deve essere accessibile solo a utenti con ruolo autorizzato (`moderator`/`admin`).

### FR-AUTH-005 — RBAC backend
Il backend deve applicare controlli RBAC sugli endpoint protetti.

### FR-AUTH-006 — Ruoli minimi
Il sistema deve supportare almeno i ruoli `user`, `moderator`, `admin`.

---

## 7.2 Gestione annunci (utente)

### FR-LIST-001 — Creazione annuncio
Un utente autenticato deve poter creare un annuncio con i campi MVP previsti.

Campi minimi MVP:
- titolo
- descrizione
- tipo annuncio
- prezzo (se applicabile)
- età
- sesso
- razza (opzionale/nota)
- regione/provincia/comune
- immagini (almeno 1, configurabile)
- contatto

### FR-LIST-002 — Stato iniziale annuncio
Alla creazione, l’annuncio deve assumere uno stato iniziale configurato (default consigliato: `pending_review`).

### FR-LIST-003 — Modifica annuncio proprio
L’utente deve poter modificare i propri annunci (nel rispetto delle regole di stato/policy).

### FR-LIST-004 — Visualizzazione “I miei annunci”
L’utente deve poter visualizzare l’elenco dei propri annunci con relativo stato.

### FR-LIST-005 — Archiviazione/disattivazione annuncio
L’utente deve poter disattivare o archiviare un proprio annuncio.

### FR-LIST-006 — Lista pubblica annunci
Il sistema deve mostrare nella lista pubblica solo annunci pubblicabili (es. `published`).

### FR-LIST-007 — Dettaglio annuncio
Il sistema deve fornire una pagina dettaglio annuncio con informazioni principali, immagini e CTA contatto.

---

## 7.3 Media (immagini annunci)

### FR-MEDIA-001 — Upload immagini
Il sistema deve consentire upload di immagini per un annuncio.

### FR-MEDIA-002 — Validazione upload
Il backend deve validare formato e dimensione dei file immagine secondo policy configurate.

### FR-MEDIA-003 — Riordino immagini
L’utente deve poter impostare l’ordine delle immagini annuncio.

### FR-MEDIA-004 — Rimozione immagini
L’utente deve poter rimuovere immagini associate a un proprio annuncio.

### FR-MEDIA-005 — Immagine principale
Il sistema deve supportare l’identificazione di una immagine principale per annuncio.

---

## 7.4 Geografia Italia (regioni/province/comuni)

### FR-GEO-001 — Dataset amministrativo italiano
Il sistema deve supportare dataset di regioni, province e comuni italiani con relazioni gerarchiche corrette.

### FR-GEO-002 — Lookup regioni/province/comuni
Il backend deve esporre endpoint per:
- elenco regioni
- elenco province filtrate per regione
- elenco comuni filtrati per provincia

### FR-GEO-003 — Ricerca/autocomplete luogo
Il sistema deve fornire ricerca/autocomplete per località (comuni/province/regioni) per supportare UX ricerca/filtri.

### FR-GEO-004 — Associazione annuncio a luogo
Ogni annuncio deve essere associato ad almeno un comune e, implicitamente, a provincia e regione.

### FR-GEO-005 — Predisposizione aggiornamento dataset
Il sistema deve prevedere import/update del dataset geografico tramite script/job ripetibile.

---

## 7.5 Ricerca annunci e filtri

### FR-SEARCH-001 — Ricerca per area geografica
L’utente deve poter cercare annunci per:
- tutta Italia
- regione
- provincia
- comune

### FR-SEARCH-002 — Filtri base
Il sistema deve supportare almeno i filtri:
- tipo annuncio
- fascia prezzo
- età
- sesso
- razza (se disponibile)
- data pubblicazione

### FR-SEARCH-003 — Ordinamento
Il sistema deve supportare ordinamento per:
- rilevanza
- più recenti
- prezzo (se applicabile)

### FR-SEARCH-004 — Paginazione risultati
La risposta di ricerca deve essere paginata.

### FR-SEARCH-005 — Fallback anti-zero-results (obbligatorio)
Se una ricerca non produce risultati esatti nel livello geografico richiesto, il sistema deve applicare fallback automatico, nell’ordine:

1. comune richiesto  
2. provincia del comune  
3. area vicina / province limitrofe / vicinanza geografica  
4. regione  
5. Italia  

### FR-SEARCH-006 — Trasparenza fallback in UI
Quando il fallback viene applicato, la UI deve comunicarlo esplicitamente all’utente con messaggio e contesto area.

### FR-SEARCH-007 — Metadata fallback API
L’API di ricerca deve restituire metadata che indichino se il fallback è stato applicato e a quale livello.

---

## 7.6 Moderazione e admin

### FR-MOD-001 — App admin separata
Il sistema deve fornire una app admin separata dall’app pubblica.

### FR-MOD-002 — Coda moderazione
Il pannello admin deve mostrare una coda di annunci in stato `pending_review` (o equivalenti da moderare).

### FR-MOD-003 — Azioni di moderazione
Un moderatore/admin autorizzato deve poter eseguire almeno:
- approva
- rifiuta
- sospendi
- ripristina (se supportato dalla policy)

### FR-MOD-004 — Motivazione azione moderazione
Le azioni di moderazione che cambiano stato devono supportare una motivazione.

### FR-MOD-005 — Audit log moderazione
Il sistema deve registrare in audit log almeno:
- chi ha eseguito l’azione
- quando
- quale entità è stata modificata
- azione eseguita
- eventuale motivazione

### FR-MOD-006 — Visibilità pubblica condizionata dallo stato
Un annuncio non approvato/non pubblicabile non deve comparire nelle liste pubbliche.

---

## 7.7 Contatto inserzionista

### FR-CONTACT-001 — CTA contatto
Nel dettaglio annuncio deve essere presente una CTA per contattare l’inserzionista.

### FR-CONTACT-002 — Form contatto
Il sistema deve consentire l’invio di una richiesta di contatto tramite form (MVP).

### FR-CONTACT-003 — Protezione anti-spam
Il form contatto deve essere protetto con rate limiting e validazioni server-side.

### FR-CONTACT-004 — Tracciamento evento contatto
Il sistema deve registrare un evento di analytics per il contatto inviato/cliccato.

---

## 7.8 Analytics e business readiness (predisposizione)

### FR-AN-001 — Tracciamento eventi base
Il sistema deve registrare eventi minimi per funnel e qualità, inclusi:
- ricerca effettuata
- fallback applicato
- visualizzazione annuncio
- contatto inviato
- annuncio creato
- annuncio pubblicato

### FR-BIZ-001 — Predisposizione promozioni
Il modello dati deve prevedere la possibilità di associare promozioni/boost ad annunci (anche se non attive nel MVP).

### FR-BIZ-002 — Segnale sponsorizzazione in ranking (v1)
Il sistema deve supportare un segnale di promozione nella ricerca, con impatto controllato sulla pertinenza.

---

## 7.9 Worker e task asincroni

### FR-WORK-001 — Esecuzione job asincroni
Il sistema deve supportare l’esecuzione di job asincroni tramite coda (BullMQ su Redis).

### FR-WORK-002 — Reindicizzazione ricerca
Il sistema deve prevedere job per reindicizzazione annunci in OpenSearch.

### FR-WORK-003 — Task media processing (minimo)
Il sistema deve supportare almeno un task asincrono per elaborazione media (es. thumbnails/metadata), se attivato in MVP o v1.

---

## 7.10 Requisiti local-first (obbligatori)

### FR-LOCAL-001 — Avvio locale completo
Il progetto deve poter essere avviato in locale con servizi dipendenti via Docker Compose.

### FR-LOCAL-002 — Script standardizzati
Il progetto deve fornire script documentati per:
- avvio servizi locali
- avvio app (web/admin/api/worker)
- migration DB
- seed dati
- test
- lint/typecheck

### FR-LOCAL-003 — Seed demo locale
Il sistema deve fornire un seed demo ripetibile con:
- utenti demo (`user`, `moderator`, `admin`)
- dataset geografia (completo o subset robusto)
- annunci demo con stati diversi
- immagini placeholder/demo

### FR-LOCAL-004 — Checklist E2E manuale
Il progetto deve includere una checklist manuale per validare flussi principali in locale.

---

## 8. Requisiti non funzionali

> Formato ID: `NFR-<area>-<numero>`

---

## 8.1 Prestazioni

### NFR-PERF-001 — Tempo di risposta API (MVP)
Per endpoint CRUD standard (esclusi upload/search pesanti), il sistema dovrebbe rispondere in tempo medio compatibile con UX fluida in ambiente locale/staging (target da validare in `TESTING.md`).

### NFR-PERF-002 — Ricerca percepita fluida
La UI di ricerca deve mostrare feedback di loading (skeleton/spinner) e non bloccare l’interazione.

### NFR-PERF-003 — Paginazione
Le liste annunci devono essere paginate per limitare payload e rendering eccessivi.

### NFR-PERF-004 — Ottimizzazione immagini
Le immagini devono essere servite in formati e dimensioni adeguate al contesto (thumbnail/card/detail), almeno come predisposizione.

---

## 8.2 Scalabilità

### NFR-SCAL-001 — Architettura modular monolith
La logica applicativa deve essere organizzata in moduli separabili.

### NFR-SCAL-002 — Search engine dedicato
La ricerca annunci deve utilizzare OpenSearch (non solo query SQL) per supportare scala e ranking.

### NFR-SCAL-003 — Queue per task pesanti
Task asincroni devono essere delegati a queue/worker ove appropriato.

### NFR-SCAL-004 — API-first
Il backend non deve dipendere da logiche specifiche della UI web pubblica, per favorire futuro client mobile.

---

## 8.3 Sicurezza

### NFR-SEC-001 — Validazione input server-side
Tutti gli input esterni devono essere validati lato server.

### NFR-SEC-002 — Autorizzazione lato server
I controlli di permesso devono essere applicati lato server, non solo lato client.

### NFR-SEC-003 — Isolamento admin
La piattaforma admin deve essere separata dall’app pubblica (app e route distinte).

### NFR-SEC-004 — Audit azioni sensibili
Le azioni di moderazione/amministrazione devono essere tracciate.

### NFR-SEC-005 — Rate limiting
Il sistema deve applicare rate limiting almeno su:
- login
- contatti
- creazione annunci (ove necessario)
- endpoint sensibili

### NFR-SEC-006 — Gestione segreti
Le credenziali non devono essere hardcodate nel repository; devono essere gestite via env/secret manager.

### NFR-SEC-007 — MFA admin/moderatori (v1/prod)
Il sistema deve supportare MFA per ruoli admin/moderazione in ambienti non locali.

---

## 8.4 Usabilità e UX/UI

### NFR-UX-001 — Responsive design
L’interfaccia deve funzionare correttamente su mobile, tablet, desktop.

### NFR-UX-002 — Coerenza visuale
Le componenti UI devono seguire il design system definito.

### NFR-UX-003 — Stati UI completi
Le pagine principali devono prevedere stati di loading, empty, error e success.

### NFR-UX-004 — Accessibilità base
Le interfacce core devono includere almeno:
- focus visible
- labels corrette
- navigazione tastiera essenziale
- contrasto sufficiente (baseline)

### NFR-UX-005 — Animazioni non intrusive
Le animazioni devono migliorare la percezione di qualità senza rallentare o ostacolare l’uso.

---

## 8.5 Affidabilità e manutenibilità

### NFR-MNT-001 — Monorepo coerente
Il progetto deve mantenere struttura monorepo ordinata e documentata.

### NFR-MNT-002 — Contratto API documentato
Le API devono essere documentate con OpenAPI e aggiornate insieme al codice.

### NFR-MNT-003 — Migrations versionate
Le modifiche DB devono essere tracciate tramite migrations versionate.

### NFR-MNT-004 — Seed ripetibile
I seed dati devono essere rerunnable in modo sicuro/idempotente (per quanto possibile).

### NFR-MNT-005 — Logging strutturato
API e worker devono generare log interpretabili per debug e osservabilità.

---

## 8.6 Testabilità

### NFR-TEST-001 — Test automatici minimi
Il progetto deve includere test unit/integration/e2e minimi per i flussi core.

### NFR-TEST-002 — E2E core coverage
Deve essere testato almeno il flusso:
utente crea annuncio → moderatore approva → annuncio visibile → ricerca con fallback.

### NFR-TEST-003 — Verifica locale manuale documentata
Deve esistere una checklist manuale per test end-to-end locale.

---

## 9. Modello dati (alto livello)

> Schema logico; i dettagli definitivi saranno in migration/schema DB.

## 9.1 Entità principali (MVP)
- `users`
- `listings`
- `listing_media`
- `regions`
- `provinces`
- `comuni`
- `admin_audit_logs`
- (predisposizione) `listing_promotions`, `analytics_events`

## 9.2 Relazioni principali
- Un `user` può avere molti `listings`
- Un `listing` appartiene a un `user`
- Un `listing` ha molte `listing_media`
- Un `listing` è associato a un `comune`
- Un `comune` appartiene a una `province`
- Una `province` appartiene a una `region`

## 9.3 Stati annuncio (MVP)
Stati minimi previsti:
- `draft`
- `pending_review`
- `published`
- `rejected`
- `suspended`
- `archived`

---

## 10. Requisiti API (baseline)

## 10.1 Principi
- Versioning `/v1`
- JSON request/response
- codici HTTP standard
- payload errori coerente
- autenticazione Bearer per endpoint protetti

## 10.2 Endpoint minimi MVP (indicativi)
### Auth/User
- endpoint profilo corrente (`me`) e integrazione auth (dettagli dipendono dal flow OIDC)

### Geography
- `GET /v1/geography/regions`
- `GET /v1/geography/provinces`
- `GET /v1/geography/comuni`
- `GET /v1/geography/search`

### Listings
- `POST /v1/listings`
- `GET /v1/listings/me`
- `PATCH /v1/listings/:id`
- `POST /v1/listings/:id/media`
- `DELETE /v1/listings/:id/media/:mediaId`
- `PATCH /v1/listings/:id/media/reorder`
- `GET /v1/listings/search`
- `GET /v1/listings/:slugOrId`

### Moderation (admin)
- `GET /v1/admin/moderation/queue`
- `POST /v1/admin/moderation/:listingId/approve`
- `POST /v1/admin/moderation/:listingId/reject`
- `POST /v1/admin/moderation/:listingId/suspend`
- `POST /v1/admin/moderation/:listingId/restore`

### Contact
- `POST /v1/listings/:id/contact`

> L’elenco definitivo e i payload saranno formalizzati nell’OpenAPI.

---

## 11. Requisiti di sicurezza (software)

## 11.1 Autenticazione e sessione
- OIDC/OAuth2 con Keycloak
- token verificati lato API
- ruoli derivati dal token e/o mappatura applicativa
- session management coerente per web/admin

## 11.2 Autorizzazione
- enforcement backend per ownership (utente modifica solo propri annunci)
- enforcement backend per ruoli moderazione/admin
- route admin non accessibili a utenti standard

## 11.3 Input e output
- validazione DTO lato backend
- sanitizzazione input testuali dove necessario
- validazione file upload (mime/size)
- gestione errori senza leak di dettagli sensibili in produzione

## 11.4 Audit e tracciabilità
- audit log per azioni moderazione
- (v1+) retention policy e consultazione audit

## 11.5 Protezioni anti-abuso (MVP baseline)
- rate limiting su endpoint sensibili
- validazioni anti-spam base su form contatto
- logging eventi sospetti (baseline)

---

## 12. Requisiti local-first e operativi (obbligatori)

## 12.1 Ambiente locale
Il sistema deve essere eseguibile localmente tramite:
- Docker Compose per servizi dipendenti
- processi app avviabili da script pnpm

## 12.2 Servizi locali minimi (compose)
- PostgreSQL + PostGIS
- Redis
- OpenSearch
- MinIO
- Keycloak
- Mailpit/Mailhog

## 12.3 Dati demo e testabilità
Il progetto deve fornire:
- seed utenti demo
- seed annunci demo (multi-stato, multi-zona)
- seed geografia (completo o subset robusto)
- immagini placeholder/demo

## 12.4 Verifica E2E manuale locale (minima)
Deve essere possibile eseguire manualmente:
1. login utente
2. creazione annuncio con immagini
3. login moderatore/admin
4. approvazione annuncio
5. ricerca pubblica con fallback geografico

---

## 13. Criteri di accettazione software (MVP)

Il software MVP è considerato accettabile se tutti i seguenti punti sono soddisfatti:

- [ ] Avvio locale completo (web/admin/api/worker + servizi)
- [ ] Registrazione/login utente funzionanti
- [ ] Creazione annuncio con immagini funzionante
- [ ] Moderazione annuncio da admin separato funzionante
- [ ] Annuncio approvato visibile pubblicamente
- [ ] Ricerca per geografia italiana operativa
- [ ] Fallback anti-zero-results implementato e visibile in UI
- [ ] Seed demo + checklist test manuale disponibili
- [ ] Test automatici minimi presenti e passanti
- [ ] Requisiti RBAC e audit moderazione rispettati

---

## 14. Tracciabilità (PRD / Milestones → SRS)

### 14.1 Tracciabilità ad alto livello
- **PRD priorità local-first** → `FR-LOCAL-*`, `NFR-TEST-*`
- **PRD geografia Italia** → `FR-GEO-*`, `FR-SEARCH-*`
- **PRD admin separato e protetto** → `FR-MOD-001`, `FR-AUTH-004`, `NFR-SEC-003`
- **PRD UX/UI Premium** → `NFR-UX-*`, requisiti UI §6
- **PRD scalabilità** → `NFR-SCAL-*`
- **PRD monetizzazione/predisposizione** → `FR-BIZ-*`, `FR-AN-*`

### 14.2 Tracciabilità milestones
- **M0** → `FR-LOCAL-001/002`, `NFR-MNT-*`
- **M1** → `FR-AUTH-*`, `FR-GEO-*`
- **M2** → `FR-LIST-*`, `FR-MEDIA-*`, `FR-MOD-*`
- **M3** → `FR-SEARCH-*`
- **M4** → `NFR-UX-*`, `NFR-PERF-*`
- **M5** → `FR-AN-*`, `FR-BIZ-*`
- **M6** → `NFR-SEC-*`, `NFR-MNT-*` (hardening/ops)

---

## 15. Rischi software e mitigazioni (tecnici)

### RISK-001 — Ricerca geografica non soddisfacente
**Impatto:** alto  
**Mitigazione:** fallback obbligatorio, seed realistico, test e2e dedicati, metadata fallback API/UI.

### RISK-002 — Drift tra frontend e backend
**Impatto:** alto  
**Mitigazione:** OpenAPI + SDK generato, contratti API versionati, CI con test integration/e2e.

### RISK-003 — Admin non sufficientemente isolato
**Impatto:** alto  
**Mitigazione:** app separata, RBAC backend, route protette, audit log, MFA in v1/prod.

### RISK-004 — Complessità eccessiva precoce
**Impatto:** medio-alto  
**Mitigazione:** modular monolith, milestone verticali, priorità local-first.

---

## 16. Requisiti futuri (non MVP, ma compatibilità richiesta)

### FUT-001 — Mobile app
Il backend deve essere compatibile con futuro client mobile (iOS/Android) senza riscrittura della logica core.

### FUT-002 — Notifiche push
Il sistema dovrà poter integrare notifiche push (FCM/APNs) in futuro.

### FUT-003 — Pagamenti online
Il dominio dovrà supportare l’integrazione di pagamenti per boost/piani premium.

### FUT-004 — Moderazione avanzata
Il sistema dovrà poter evolvere con regole anti-frode/spam più sofisticate e scoring.

---

## 17. Allegati operativi richiesti (prossimi documenti)
Per rendere questo SRS eseguibile dai coding agent AI, devono essere prodotti/aggiornati:

1. `LOCAL_SETUP.md`
2. `ARCHITECTURE.md`
3. `TESTING.md`
4. `SECURITY_BASELINE.md`
5. `DATA_GEO_ITALIA.md`
6. `API_CONTRACT.md` / OpenAPI workflow
7. `UX_UI_GUIDELINES.md`

---

## 18. Nota finale
Questo SRS è la baseline tecnica/formale del progetto.  
In caso di conflitto tra implementazione e SRS:
- prevale il requisito esplicitato nel SRS **se coerente con PRD**
- in caso di dubbio si aggiorna prima la documentazione (PRD/SRS/ADR), poi il codice

La regola fondamentale resta: **ogni funzionalità core deve essere dimostrabile in locale end-to-end**.