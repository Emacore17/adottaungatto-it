# PRD.md — adottaungatto-it

> **Progetto:** adottaungatto-it  
> **Documento:** Product Requirements Document (PRD)  
> **Target:** team di sviluppo + coding agent AI  
> **Stato:** v1.0 (iniziale, esecutivo)  
> **Priorità assoluta:** **funzionamento in locale end-to-end** prima di qualsiasi hardening/produzione

---

## 1) Visione del prodotto

**adottaungatto-it** è una piattaforma web di annunci dedicata a gatti e gattini (adozione / vendita, in base alle policy configurate), con forte attenzione a:

- **UX/UI Premium** (moderna, animata, responsive, affidabile)
- **ricerca geografica italiana** (comune/provincia/regione/tutta Italia)
- **moderazione e sicurezza**
- **scalabilità futura**
- **predisposizione mobile-first (API-first)**

La piattaforma deve permettere agli utenti di:
- pubblicare annunci con foto e dettagli del gatto/gattino
- cercare e filtrare annunci per area geografica e altri criteri
- contattare l’inserzionista
- navigare un’interfaccia fluida e curata

La piattaforma deve permettere a moderatori/admin di:
- controllare e moderare annunci e contenuti
- gestire segnalazioni
- monitorare qualità, frodi, sicurezza, KPI

---

## 2) Principio guida del progetto (vincolante)

### Ordine di priorità (obbligatorio)
1. **Local-first / end-to-end funzionante in locale**
2. **Testabilità completa (manuale + automatica)**
3. **Qualità UX/UI Premium**
4. **Messa in produzione sicura e scalabile**

> Il progetto **non** deve saltare direttamente al deploy cloud senza avere prima una demo locale completa, testabile con mano da un utente non tecnico.

---

## 3) Stack tecnologico (fissato, non alternativo)

### Frontend (pubblico + admin)
- **Next.js (ultima versione)**
- **TypeScript**
- **shadcn/ui**
- **Tailwind CSS**
- **Motion (Framer Motion / Motion for React)**
- **TanStack Query**
- **React Hook Form + Zod**

### Backend
- **NestJS (Node.js)**
- **Fastify adapter**
- **REST API versionata + OpenAPI**
- **BullMQ** (worker/task async)

### Dati / Search / Storage
- **PostgreSQL + PostGIS**
- **Redis**
- **OpenSearch**
- **S3-compatible object storage** (in locale: MinIO)

### Identity & Sicurezza
- **Keycloak** (OIDC/OAuth2, RBAC, MFA per admin)
- Admin separato e protetto

### Infrastruttura target (fase successiva)
- **AWS** (ECS Fargate, RDS, Redis, OpenSearch, S3, WAF, CloudFront)

---

## 4) Obiettivi prodotto (MVP → v1)

### Obiettivi MVP (must-have)
- Registrazione/login utente
- Creazione annuncio con foto e dati principali
- Ricerca annunci con filtri geografici (comune/provincia/regione/Italia)
- Strategia anti “0 risultati” (mostra annunci vicini)
- Lista annunci + dettaglio annuncio
- Contatto inserzionista (form / canale interno definito)
- Admin separato con moderazione annunci base
- Pipeline locale completa con seed demo + test end-to-end

### Obiettivi v1 (subito dopo MVP)
- Segnalazioni utenti
- Sospensione utenti / audit moderazione
- Sponsorizzazioni annunci (boost/evidenza)
- Verifica venditore/profilo
- KPI base e dashboard admin
- Hardening sicurezza + deploy staging/prod

### Non-obiettivi iniziali (out of scope per MVP)
- App mobile nativa
- Chat real-time avanzata
- Pagamenti live completi (solo predisposizione / mock)
- ML complesso custom (moderazione iniziale via regole + coda revisione)

---

## 5) Persona e utenti target

### 5.1 Utente visitatore
- Cerca gatti/gattini in una zona specifica
- Vuole una UX veloce, chiara, affidabile
- Usa spesso smartphone

### 5.2 Inserzionista
- Pubblica uno o più annunci
- Vuole facilità di inserimento, foto rapide, visibilità
- Può essere privato, allevatore, associazione/gattile

### 5.3 Moderatore
- Gestisce approvazioni/segnalazioni
- Ha bisogno di strumenti rapidi, filtri, audit trail

### 5.4 Admin
- Gestisce policy, ruoli, cataloghi, KPI, monetizzazione
- Accesso fortemente protetto

---

## 6) UX/UI Premium (requisiti vincolanti)

L’interfaccia deve essere **moderna, animata, responsive, premium**, con focus su usabilità reale.

### Requisiti UX/UI obbligatori
- **Mobile-first**, responsive completo (smartphone → desktop)
- **Design system coerente** con shadcn/ui
- **Microinterazioni** eleganti (hover, tap feedback, skeleton loading)
- **Animazioni Motion** leggere e non invasive
- **Navigazione veloce**
- **Form chiari e progressivi**
- **Stati vuoti utili** (mai dead-end)
- **Accessibilità minima**: focus states, contrasto, label, tastiera
- **Prestazioni percepite**: skeleton, lazy loading, immagini ottimizzate
- **Feedback visivo** per filtri attivi, fallback geografico, moderazione stato annuncio
- **Selettore luogo search-first** con suggerimenti semantici chiari (`Regione`, `Provincia`, `Comune`, `Comune + provincia`, `Italia`)

### Linee guida UX (vincolanti)
- Mai mostrare “0 risultati” senza alternative/fallback
- Mostrare sempre **perché** un risultato viene suggerito (es. “Vicino a Torino”, “Nella tua provincia”)
- Ridurre il numero di passaggi per pubblicare un annuncio
- Dettaglio annuncio ottimizzato per mobile (CTA sempre visibile)

---

## 7) Requisiti funzionali (MVP + v1)

## 7.1 Autenticazione e account
### MVP
- Registrazione utente
- Login/logout
- Recupero password
- Profilo utente base
- Ruoli base (`user`, `moderator`, `admin`)
- Protezione route private

### v1
- Verifica profilo/inserzionista
- Gestione reputazione / trust score iniziale
- MFA obbligatoria per admin/moderatori

---

## 7.2 Gestione annunci
### MVP
- Creazione annuncio (wizard o form strutturato)
- Campi minimi:
  - titolo
  - descrizione
  - tipo annuncio (adozione / vendita / altro configurabile)
  - prezzo (facoltativo o richiesto in base al tipo)
  - età
  - sesso
  - razza (se nota)
  - comune/provincia/regione
  - foto (1..N)
  - contatto
- Bozza / pubblicato / in revisione / rifiutato / sospeso
- Visualizzazione lista annunci
- Visualizzazione dettaglio annuncio
- Modifica annuncio proprio
- Disattiva / archivia annuncio proprio

### v1
- Duplicazione annuncio
- Multi-annuncio per profili pro
- Evidenza/boost (monetizzazione)
- Statistiche annuncio (visite/contatti)

---

## 7.3 Ricerca e filtri (core)
### MVP (must-have)
- Ricerca per:
  - **Tutta Italia**
  - **Regione**
  - **Provincia**
  - **Comune**
- Filtri base:
  - tipo annuncio
  - fascia prezzo
  - età
  - sesso
  - razza (se disponibile)
  - data pubblicazione
- Ordinamento:
  - rilevanza
  - più recenti
  - prezzo (se applicabile)

### Strategia anti 0 risultati (obbligatoria)
Se una ricerca non ha risultati:
1. Comune richiesto
2. Provincia del comune
3. Province vicine / annunci vicini geograficamente
4. Regione
5. Italia

UI obbligatoria:
- messaggio chiaro tipo: **“Nessun risultato esatto a [Comune]. Ti mostriamo annunci vicini.”**
- badge distanza/area suggerita

---

## 7.4 Geografia Italia (fondamentale)
### MVP
- Dataset completo e aggiornabile di:
  - regioni
  - province
  - comuni italiani
- Filtri basati su struttura amministrativa italiana
- Relazioni gerarchiche corrette (comune → provincia → regione)
- Seed locale con dataset completo o subset dimostrativo + script import
- Input luogo testuale intelligente con disambiguazione e contesto (es. `Chieri (TO)`, `Torino e provincia (TO)`)

### v1
- Sync aggiornamenti periodici dataset
- Alias/denominazioni storiche comuni
- Geometrie PostGIS per query avanzate e suggerimenti vicinanza

---

## 7.5 Media (foto annunci)
### MVP
- Upload multiple immagini
- Validazione formato/dimensione
- Generazione thumbnail
- Ordinamento immagini
- Rimozione immagini

### v1
- Ottimizzazione AVIF/WebP
- Hash immagini anti-duplicato
- Moderazione immagini automatica (pre-filter)
- EXIF strip e policy privacy

---

## 7.6 Moderazione (admin dedicato e protetto)
### MVP
- Pannello admin separato (`apps/admin`)
- Login admin con ruolo
- Lista annunci da moderare
- Azioni:
  - approva
  - rifiuta
  - sospendi
  - ripristina
- Motivazione moderazione
- Audit base (chi / quando / azione)

### v1
- Gestione segnalazioni utenti
- Cronologia utente
- Regole anti-spam / punteggio rischio
- Queue moderazione avanzata con filtri e priorità

---

## 7.7 Contatti e conversione
### MVP
- CTA “Contatta inserzionista”
- Form contatto con rate limiting e anti-spam
- Tracciamento evento “contatto inviato”

### v1
- Canale messaggi interno (non realtime complesso inizialmente)
- Storico contatti nel profilo

---

## 7.8 Monetizzazione e business (predisposizione)
### MVP
- Modello dati per piani/boost (anche se non attivato live)
- Flag annuncio sponsorizzato (backend + search ranking controllato)
- Eventi analytics per conversion funnel

### v1
- Boost annuncio (24h / 7g / 30g)
- Profilo Pro
- Badge verificato
- Dashboard conversioni admin

---

## 8) Requisiti non funzionali

## 8.1 Scalabilità (future-proof)
- Architettura **modular monolith** con moduli separabili
- OpenSearch per ricerca scalabile
- Redis per cache/job queue
- Storage immagini su object storage
- API versionate (`/v1`)
- Eventi di dominio / job async per task pesanti

## 8.2 Sicurezza
### MVP
- RBAC rigoroso
- Protezione admin separata
- Validazione input server-side (Zod/DTO)
- Rate limiting login / contatti / creazione annunci
- Sanitizzazione upload
- Secret via env / secret manager (fase cloud)
- Audit log moderazione

### v1 (hardening produzione)
- MFA admin/moderatori
- CSP / security headers completi
- WAF/CDN
- monitoraggio sicurezza / alerting
- backup/restore testati
- runbook incident response base

## 8.3 Prestazioni
- LCP / CLS / INP curati per UX Premium
- Immagini lazy + responsive
- Skeleton loading
- Query paginata per liste
- Caching per filtri geografici e ricerche popolari

## 8.4 Qualità codice (AI-agent friendly)
- Monorepo ordinato
- Tipi condivisi e contratti OpenAPI
- Lint/typecheck/test obbligatori
- Migrations DB versionate
- Seed script ripetibili
- Documentazione locale chiara e riproducibile

---

## 9) Architettura applicativa (logica)

## 9.1 App del monorepo
- `apps/web` → frontend pubblico
- `apps/admin` → admin/moderazione (separato)
- `apps/api` → NestJS API
- `apps/worker` → queue worker / job async
- `packages/ui` → UI condivisa
- `packages/sdk` → client API generato
- `packages/types` → tipi condivisi
- `packages/config` → config comuni

## 9.2 Moduli backend (NestJS)
- `auth`
- `users`
- `listings`
- `search`
- `media`
- `geography`
- `moderation`
- `notifications`
- `billing` (predisposizione)
- `analytics`
- `admin-audit`

---

## 10) Local-first: requisiti di esecuzione in locale (OBBLIGATORI)

Questa sezione è **prioritaria** per il team e per i coding agent AI.

## 10.1 Obiettivo locale
Un utente/dev deve poter:
1. clonare il repo
2. avviare i servizi locali
3. popolare dati demo
4. aprire web + admin
5. creare/moderare/cercare annunci
6. testare il fallback geografico
7. eseguire test automatici principali

### Tempo target di setup locale (quando stabile)
- **<= 20 minuti** su macchina dev standard (escluso download immagini Docker al primo avvio)

---

## 10.2 Prerequisiti locali (MVP)
- Node.js LTS
- pnpm
- Docker + Docker Compose
- Git

---

## 10.3 Servizi locali via Docker Compose (obbligatori)
Il progetto deve includere `docker-compose.yml` (o `compose.yml`) per avviare almeno:

- PostgreSQL (+ PostGIS)
- Redis
- OpenSearch
- MinIO (S3-compatible)
- Keycloak
- Mailhog/Mailpit (per email locali)
- (Opzionale MVP) OpenSearch Dashboards

> Tutti i servizi devono avere credenziali locali documentate in `.env.example`.

---

## 10.4 Script locali obbligatori (DX)
Ogni script deve essere semplice e ripetibile.

### Esempio comandi standard attesi
- `pnpm install`
- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm dev:worker`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm search:reindex`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:smoke`
- `pnpm lint`
- `pnpm typecheck`

> I nomi finali possono variare, ma il progetto deve esporre **equivalenti chiari**.

---

## 10.5 Seed demo locale (obbligatorio)
Per permettere test “con mano”, il seed deve creare:

### Dati geografici
- regioni/province/comuni (completo o subset robusto)
- almeno 5 regioni rappresentative
- almeno 15 province
- almeno 60 comuni

### Utenti demo
- `utente.demo@...` (utente normale)
- `moderatore.demo@...`
- `admin.demo@...`
- password demo documentate **solo per locale**

### Annunci demo
- almeno 30 annunci con distribuzione geografica reale/credibile
- alcuni annunci in comuni “piccoli” per test fallback
- annunci con stati diversi:
  - pubblicato
  - in revisione
  - rifiutato
  - sospeso

### Media demo
- immagini placeholder realistiche
- thumbnails già generate o generabili via worker

---

## 11) Test end-to-end “con mano” (manuale) — checklist utente/tester

Questa checklist deve essere eseguibile senza conoscenza tecnica profonda.

## Scenario A — Avvio locale
- [ ] Avvio servizi infrastrutturali locali
- [ ] Avvio app web/admin/api/worker
- [ ] Apertura home web
- [ ] Apertura login/admin
- [ ] Verifica assenza errori critici in console/log startup

## Scenario B — Registrazione e login utente
- [ ] Registrazione nuovo utente
- [ ] Login riuscito
- [ ] Logout
- [ ] Login nuovamente riuscito

## Scenario C — Creazione annuncio
- [ ] Accesso come utente
- [ ] Compilazione form annuncio
- [ ] Selezione luogo (comune/provincia/regione)
- [ ] Upload di almeno 2 immagini
- [ ] Invio annuncio
- [ ] Visualizzazione stato corretto (es. “in revisione”)

## Scenario D — Moderazione admin
- [ ] Login admin/moderatore
- [ ] Apertura coda moderazione
- [ ] Visione annuncio creato
- [ ] Approva annuncio
- [ ] Audit log mostra azione effettuata

## Scenario E — Ricerca e fallback geografico
- [ ] Ricerca per comune con annunci presenti
- [ ] Ricerca per comune senza annunci
- [ ] Sistema propone annunci vicini (provincia/regione)
- [ ] Messaggio UI fallback visibile e chiaro
- [ ] Filtri combinati funzionanti

## Scenario F — UX/UI Premium (controllo base)
- [ ] Responsive smartphone/tablet/desktop
- [ ] Animazioni fluide (non bloccanti)
- [ ] Skeleton/loading states presenti
- [ ] CTA principali ben visibili
- [ ] Nessun overflow/bug visivo grave

---

## 12) Test automatici minimi richiesti (MVP)

## 12.1 Backend
- Unit test servizi core:
  - `listings`
  - `geography`
  - `moderation`
  - `search fallback`
- Integration test API:
  - create listing
  - approve listing
  - search listings by geography
  - fallback no-results

## 12.2 Frontend web/admin
- Test componenti critici (form, filtri)
- Test smoke routing principali
- E2E Playwright:
  - login utente
  - creazione annuncio
  - login admin
  - moderazione
  - ricerca fallback

## 12.3 CI (obbligatorio)
Pipeline minima:
- lint
- typecheck
- test unit/integration
- e2e smoke (su ambiente test/containers)

---

## 13) Milestones e task (orientati a coding agent AI)

## M0 — Bootstrap monorepo e infrastruttura locale
### Obiettivo
Repo avviabile, servizi locali su Docker, standard DX definiti.

### Deliverable
- monorepo pnpm/turbo
- apps placeholder (`web`, `admin`, `api`, `worker`)
- compose locale funzionante
- `.env.example`
- healthcheck endpoints
- README bootstrap

### Done quando
- `pnpm infra:up` + `pnpm dev` porta online web/admin/api
- healthcheck verdi
- nessun blocco manuale extra non documentato

---

## M1 — Auth + ruoli + geografia base
### Obiettivo
Autenticazione funzionante e dataset geografico importabile.

### Deliverable
- integrazione Keycloak locale
- ruoli base
- guard backend/admin
- tabelle geography
- import dataset regioni/province/comuni
- API lookup geografico

### Done quando
- login utente/admin funziona
- selezione regione→provincia→comune via UI
- dati geography persistiti correttamente

---

## M2 — Pubblicazione annuncio + media + moderazione base
### Obiettivo
Flusso principale annunci end-to-end completo.

### Deliverable
- form annuncio completo MVP
- upload immagini su MinIO locale
- creazione annuncio stato iniziale
- coda moderazione admin
- approvazione/rifiuto
- audit base

### Done quando
- utente crea annuncio con immagini
- moderatore approva
- annuncio appare sul web pubblico

---

## M3 — Ricerca geografica + fallback anti 0 risultati (core)
### Obiettivo
Ricerca utile e intelligente su Italia.

### Deliverable
- indicizzazione OpenSearch annunci
- filtri geografici e base
- ranking iniziale
- fallback comune→provincia→regione→Italia
- UI messaggi fallback
- test e2e dedicati

### Done quando
- query senza match esatto non termina in dead-end
- utente vede risultati pertinenti vicini
- performance accettabili su dataset demo

---

## M4 — UX/UI Premium + responsive + polish
### Obiettivo
Portare la UX a livello premium percepito.

### Deliverable
- design system coerente shadcn
- motion microinteractions
- skeletons/loading/empty states
- responsive refinement mobile/tablet/desktop
- performance pass base
- a11y pass base

### Done quando
- navigazione fluida
- layout pulito su mobile e desktop
- percezione “prodotto premium” nelle pagine chiave:
  - home
  - ricerca/lista
  - dettaglio
  - crea annuncio
  - admin moderazione

---

## M5 — Business readiness (predisposizione monetizzazione + analytics)
### Obiettivo
Preparare crescita e monetizzazione senza ancora dipendere dal pagamento live.

### Deliverable
- modelli dati piani/boost
- flag sponsored listings
- eventi analytics funnel
- dashboard admin KPI base
- policy e rule-set iniziale anti-frode/spam

### Done quando
- pipeline dati/analytics minima è tracciabile
- sponsorship può essere simulata via admin

---

## M6 — Produzione sicura (post-local priority)
### Obiettivo
Preparare staging/prod in sicurezza, dopo validazione locale completa.

### Deliverable
- hardening sicurezza
- infra as code (Terraform)
- CI/CD
- config ambienti
- backup/restore
- observability
- runbook base incidenti

### Done quando
- staging deployabile con checklist sicurezza
- rollback documentato
- monitoraggio essenziale attivo

---

## 14) Criteri di accettazione globali (MVP)

Il MVP è accettato **solo se** tutti i criteri seguenti sono veri:

- [ ] Funziona completamente in locale (web + admin + api + worker + servizi)
- [ ] È possibile creare/moderare/ricercare annunci end-to-end
- [ ] Il filtro geografico Italia è operativo (comune/provincia/regione/Italia)
- [ ] È implementato il fallback anti 0 risultati
- [ ] Admin/moderazione è su app separata e protetta
- [ ] UX/UI è responsive e moderna (non “solo funzionale”)
- [ ] Esistono seed demo e checklist test manuale
- [ ] Esistono test automatici minimi + CI
- [ ] Documentazione locale chiara e riproducibile

---

## 15) Metriche di prodotto (da tracciare da subito)

### Acquisition / usage
- visitatori / sessioni
- ricerche effettuate
- ricerche con fallback attivato

### Funnel annunci
- annunci creati
- annunci approvati
- tempo medio approvazione
- tasso di pubblicazione completata

### Conversione
- CTR annuncio
- contatti inviati
- conversione visita → contatto

### Qualità / trust
- tasso segnalazioni
- tasso rifiuto moderazione
- recidiva account sospetti

### Business (predisposizione)
- tasso adozione boost (v1)
- conversione free → premium (v1)

---

## 16) Rischi principali e mitigazioni

### Rischio 1 — Complessità tecnica troppo presto
**Mitigazione:** mantenere modular monolith, local-first, milestones verticali.

### Rischio 2 — Ricerca geografica scadente / zero risultati
**Mitigazione:** fallback obbligatorio + seed realistico + test e2e dedicati.

### Rischio 3 — UX non premium nonostante stack moderno
**Mitigazione:** milestone UX dedicata (M4), design system e standard animazioni obbligatori.

### Rischio 4 — Admin non realmente sicuro
**Mitigazione:** app separata, RBAC, MFA (v1), audit log da MVP.

### Rischio 5 — Coding agent AI genera inconsistenze
**Mitigazione:** contratti OpenAPI, naming convention, Definition of Done, test obbligatori.

---

## 17) Definition of Done (DoD) per ogni task/feature

Ogni task è “Done” solo se:
- [ ] codice implementato
- [ ] typecheck passa
- [ ] lint passa
- [ ] test pertinenti passano
- [ ] documentazione aggiornata (README/ADR/endpoint/seed se necessario)
- [ ] comportamento verificato in locale
- [ ] nessuna regressione UX evidente
- [ ] logging/error handling minimo presente
- [ ] sicurezza input/output considerata

---

## 18) Convenzioni operative per coding agent AI (vincolanti)

- Lavorare per **feature slice verticali** (UI + API + DB + test)
- Evitare mega-PR
- Aggiornare docs insieme al codice
- Non introdurre nuove tecnologie fuori stack senza esplicita approvazione
- Preferire componenti riusabili e naming esplicito
- Ogni feature demoabile in locale
- Ogni milestone deve lasciare il progetto in stato eseguibile

---

## 19) Deliverable documentali successivi (dopo PRD)

Dopo questo PRD, creare in ordine:

1. `README.md` (setup locale rapido)
2. `ARCHITECTURE.md` (moduli, flussi, boundary)
3. `LOCAL_SETUP.md` (dettagli env, compose, seed, troubleshooting)
4. `TESTING.md` (manuale + automatico + smoke)
5. `MILESTONES.md` (task breakdown operativo per agent AI)
6. `SECURITY_BASELINE.md` (MVP + hardening produzione)
7. `API_CONTRACT.md` / OpenAPI generation workflow
8. `UX_UI_GUIDELINES.md` (premium UI, motion, responsive, a11y)
9. `DATA_GEO_ITALIA.md` (dataset, import, sync, fallback logic)
10. `DEPLOYMENT.md` (staging/prod, CI/CD, rollback)

---

## 20) Conclusione operativa

Questo PRD definisce un percorso chiaro e vincolante:

- **Prima**: demo locale completa, testabile end-to-end
- **Poi**: qualità UX/UI Premium e stabilità
- **Infine**: produzione sicura, osservabile, scalabile

Il successo del progetto non è solo “avere codice”, ma avere un sistema che:
- un utente può provare davvero in locale,
- un moderatore può usare,
- e il team può portare in produzione con fiducia.
