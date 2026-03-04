# ROADMAP.md

Roadmap compatta per i prossimi sviluppi, derivata dal codice reale e non da spec storiche ridondanti.

## Principi operativi

- local-first prima di ogni hardening produzione
- sviluppare per slice verticali: DB + API + UI + test + doc
- niente nuove fonti di verita parallele: pochi documenti canonici, sempre riallineati al codice
- niente nuove superfici mock se una feature deve diventare reale a breve

## Stato per area

| Area | Stato | Note |
| --- | --- | --- |
| Auth e RBAC | parzialmente completo | login/sessioni/ruoli ci sono; registrazione e reset password no |
| Geografia Italia | completo per il local-first | snapshot ISTAT versionata, lookup e search semantica pronti |
| Listings e media | completo per MVP locale | create/edit/list/public detail/upload/cover/delete pronti |
| Moderazione | completo sul backend, buono sul frontend | queue e azioni reali; parte dell'admin resta mock |
| Ricerca pubblica | completa per MVP | OpenSearch + SQL fallback + fallback geografico |
| Messaggistica | completa per MVP | thread, SSE, typing, preferenze email, worker notifiche |
| Analytics | buono lato backend | KPI e ingest eventi pronti, UI admin essenziale |
| Promotions | backend pronto | manca una vera UX admin dedicata |
| Hardening backend | parziale | identita, rate limit, CORS, backup locale minimo, reindex search atomico, cleanup search e retention minima sistemati; restano recovery prod e backup/search restore |
| Favoriti | parziale | persistenza solo locale browser |
| Profilo pubblico venditore | parziale | dati e recensioni ancora mock |
| Ricerche salvate e recommendation | assente | nessun backend o modello dati |
| Cookie e profilazione | assente | nessun consenso o persistenza backend |
| Backup e rollback | parziale | backup locale verificabile per Postgres + MinIO; search restore alias-safe via reindex |
| Scheduler e automazioni | parziale | worker polling e retention minima esistono; cron piu completi e backup no |
| Operativita produzione | non prioritaria ora | documenti ops rimossi fino a quando servono davvero |

## Gap noti da trattare per primi

1. Stabilizzare il backend core
   - preservare la separazione tra ID pubblico utente e `app_users.id`
   - mantenere sicuri i runtime non locali con env coerenti su CORS e proxy

2. Rendere il backend predisposto per prod
   - evolvere il backup locale in recovery prod-safe con retention, storage e restore search
   - estendere la retention minima gia presente a chat, analytics, audit, outbox e search
   - formalizzare snapshot/restore OpenSearch oppure accettare il rebuild da DB come recovery canonica con tempi attesi

3. Consolidare il frontend pubblico
   - completare la separazione tra marketing, discovery, auth e workspace
   - evitare duplicazioni dei sistemi di search/filter
   - rimuovere copy e pattern che sanno di placeholder tecnico

4. Ridurre le superfici mock
   - decidere se trasformare in feature reali o nascondere temporaneamente:
   - profilo pubblico venditore e recensioni
   - admin utenti, segnalazioni, audit log, impostazioni
   - favoriti server-synced se diventano requirement cross-device

5. Aumentare la copertura test automatica
   - `web` ha oggi solo smoke Playwright di base
   - mancano E2E robusti su discovery, workspace, messaging e moderazione UI
   - il backend deve avere una matrice test chiara per locale e per ambienti con infra reale

6. Stabilizzare i contratti condivisi
   - mantenere `LocationIntent` come contratto canonico per search
   - generare OpenAPI/SDK quando il perimetro API sara piu stabile
   - non introdurre nuove feature relazionali finche l'identita utente non e risolta bene

## Priorita per i prossimi sviluppi

### P0

- completare il percorso backup/restore con recovery search, retention e storage non locale
- estendere il primo scheduler backend con metriche, ownership chiara e fallback operativi documentati
- completare retention e cleanup per outbox, analytics, audit, messaggi e lifecycle chat
- unificare definitivamente la UX di ricerca
- completare le superfici core del workspace utente senza dipendenze da mock
- estendere Playwright oltre gli smoke attuali

### P1

- rendere reale audit log admin e segnalazioni, oppure nasconderli lato UI
- introdurre favoriti server-side preservando la separazione tra ID pubblico e ID interno
- rendere reale il profilo pubblico venditore oppure ridurlo a placeholder esplicito
- completare le pagine admin oggi solo mock-backed o UI-first
- aggiungere una UI admin sensata per promotions

### P2

- aprire i flussi reali di registrazione e recupero password
- introdurre ricerche salvate, recensioni e recommendation solo con basi privacy chiare
- preparare OpenAPI/SDK generation se il contratto API e abbastanza stabile

## Criteri di accettazione per ogni nuovo task

- il repo resta avviabile in locale
- la feature lascia un comportamento osservabile e testabile
- i mock introdotti o rimossi sono documentati
- la documentazione canonica toccata dal change viene aggiornata
