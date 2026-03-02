# MESSAGING.md

Documentazione tecnica del modulo di messaggistica tra utenti registrati e proprietari degli annunci.

## Obiettivo

La messaggistica permette a un utente autenticato di:
- aprire una conversazione partendo da un annuncio `published`
- scambiare messaggi privati con il proprietario
- vedere inbox, thread, non letti e aggiornamenti realtime
- ricevere notifiche email opzionali
- archiviare una conversazione solo per se o rimuoverla per entrambi

Il modulo e pensato per essere:
- sicuro per default
- resistente allo spam di base
- efficiente nelle letture di inbox e thread
- estendibile verso moderazione, retention e osservabilita piu avanzate

## Architettura

### Backend

Componenti principali:
- `apps/api/src/messaging/messaging.controller.ts`
- `apps/api/src/messaging/messaging.service.ts`
- `apps/api/src/messaging/messaging.repository.ts`
- `apps/api/src/messaging/messaging-events.service.ts`
- `apps/worker/src/messaging-notification-worker.service.ts`

Ruoli:
- `controller`: espone API REST e stream SSE
- `service`: applica regole di business, validazioni e antispam
- `repository`: esegue query SQL e transazioni
- `messaging-events service`: pubblica eventi realtime via Redis Pub/Sub
- `worker`: consegna email in modo asincrono usando outbox

### Frontend web

Componenti principali:
- `apps/web/components/message-thread-view.tsx`
- `apps/web/components/message-thread-workspace.tsx`
- `apps/web/components/messages-inbox-overview.tsx`
- `apps/web/components/live-messages-link.tsx`
- `apps/web/app/api/messages/**`

Ruoli:
- server components per il fetch iniziale di inbox e thread
- client components per invio messaggi, SSE, typing indicator e refresh locale
- route proxy same-origin che usano il cookie di sessione

### Infrastruttura

Dipendenze:
- PostgreSQL per persistenza
- Redis per Pub/Sub realtime e stato effimero del typing
- Worker separato per le notifiche email
- Mailpit/SMTP in locale

## Modello dati

Migration rilevanti:
- `0010_create_messaging_schema.sql`
- `0011_create_notification_outbox.sql`
- `0012_add_user_message_preferences.sql`
- `0013_extend_messaging_thread_lifecycle.sql`

### `message_threads`

Contiene l'identita del thread:
- `listing_id`
- `owner_user_id`
- `requester_user_id`
- `listing_title_snapshot`
- `source`
- `latest_message_at`
- `latest_message_id`
- `latest_message_preview`
- `latest_message_sender_user_id`
- `messages_count`
- `deleted_at`
- `deleted_by_user_id`

Note:
- esiste un vincolo unico su `listing_id + owner_user_id + requester_user_id`
- esiste quindi un solo thread logico per coppia di utenti su un annuncio
- il delete "per entrambi" e un soft delete a livello thread

### `message_thread_participants`

Contiene lo stato del thread per partecipante:
- `thread_id`
- `user_id`
- `role`
- `last_read_at`
- `archived_at`
- `unread_count`

Note:
- l'archiviazione "solo per me" e gestita qui
- i non letti sono denormalizzati per evitare count costosi a runtime

### `message_messages`

Contiene i messaggi:
- `thread_id`
- `sender_user_id`
- `body`
- `message_hash`
- `created_at`

Note:
- `message_hash` serve per bloccare duplicati ravvicinati
- al momento non esiste delete del singolo messaggio

### `notification_outbox`

Usata per le notifiche email asincrone:
- `channel`
- `event_type`
- `dedupe_key`
- `payload`
- `status`
- `attempt_count`
- `max_attempts`
- `available_at`

## Flussi principali

### Apertura thread da annuncio

Endpoint:
- `POST /v1/messages/listings/:listingId/thread`

Flusso:
1. upsert dell'utente in `app_users`
2. verifica che il listing esista e sia `published`
3. verifica che il mittente non sia il proprietario
4. ricerca di un thread gia esistente per `listing + owner + requester`
5. applicazione del rate limit di creazione thread se il thread non esiste
6. creazione o riattivazione del thread
7. validazione del messaggio iniziale
8. salvataggio del messaggio
9. aggiornamento dei campi denormalizzati del thread
10. enqueue di eventuale email nell'outbox
11. publish di evento realtime `thread_updated`

### Invio messaggio in thread esistente

Endpoint:
- `POST /v1/messages/threads/:threadId/messages`

Flusso:
1. verifica accesso al thread
2. validazione del body
3. controlli antispam
4. insert del messaggio in transazione
5. aggiornamento di:
   - `latest_message_*`
   - `messages_count`
   - `unread_count`
   - `archived_at = null` per riaprire il thread se necessario
6. enqueue della notifica email per gli altri partecipanti non archiviati
7. publish di `thread_updated`
8. publish di `typing_changed = false` per spegnere "Sta scrivendo..."

### Lettura thread

Endpoint:
- `GET /v1/messages/threads`
- `GET /v1/messages/threads/:threadId`
- `POST /v1/messages/threads/:threadId/read`

Scelte tecniche:
- inbox e dettaglio usano i campi denormalizzati del thread
- i messaggi del thread sono paginati con `beforeMessageId`
- i non letti vengono azzerati per partecipante

### Archiviazione e delete

Endpoint:
- `DELETE /v1/messages/threads/:threadId`
- `DELETE /v1/messages/threads/:threadId/everyone`

Semantica:
- `DELETE /threads/:id`: archivia solo per l'utente corrente
- `DELETE /threads/:id/everyone`: soft delete globale del thread

Note:
- il delete globale non elimina fisicamente i messaggi
- il dato resta nel database per audit, debugging e future policy di retention

### Typing indicator

Endpoint:
- `POST /v1/messages/threads/:threadId/typing`

Semantica:
- il frontend invia `isTyping: true` o `false`
- il backend valida accesso al thread
- l'evento viene pubblicato solo agli altri partecipanti
- Redis mantiene uno stato effimero con TTL per limitare il rumore

## Realtime

Endpoint:
- `GET /v1/messages/events`

Protocollo:
- Server-Sent Events

Eventi emessi:
- `thread_updated`
- `typing_changed`
- `connected`
- `ping`

Perche SSE:
- e sufficiente per chat 1:1 e eventi server to client
- e meno complesso da operare rispetto a WebSocket in questa fase
- ha un buon rapporto tra costo implementativo e utilita

Fallback:
- la UI mantiene anche un polling lento di sicurezza
- se SSE cade, inbox e thread continuano a riallinearsi

Typing:
- il client invia pulse periodiche mentre l'utente scrive
- il backend throttla e deduplica gli eventi
- il client spegne automaticamente "Sta scrivendo..." dopo timeout

## Sicurezza e antispam

Misure gia presenti:
- accesso solo per utenti autenticati
- impossibilita di scrivere al proprio annuncio
- accesso al thread riservato ai partecipanti
- validazione forte di `listingId`, `threadId`, body e payload typing
- blocco messaggi vuoti
- limite lunghezza messaggio a `2000`
- rate limit creazione thread
- rate limit invio messaggi
- slow mode per thread
- deduplica messaggi con hash del contenuto
- limite massimo di link per messaggio
- cap massimo di messaggi per thread
- notifiche email fuori dal request path tramite outbox
- preferenze utente per disattivare le email

Punti importanti:
- le query filtrano thread archiviati e thread cancellati globalmente
- l'outbox usa `dedupe_key` per prevenire email duplicate
- il realtime e best effort: il dato persistito non dipende dal successo dell'evento live

## Performance e scalabilita

Ottimizzazioni gia introdotte:
- denormalizzazione `latest_message_*` su `message_threads`
- `messages_count` sul thread
- `unread_count` su `message_thread_participants`
- indici dedicati su thread visibili e stati di archiviazione
- outbox asincrono per le email
- Redis Pub/Sub per il realtime
- paginazione messaggi con `beforeMessageId`

Perche e importante:
- l'inbox non deve cercare ogni volta l'ultimo messaggio con subquery pesanti
- il badge dei non letti non deve fare count costosi su tutta la tabella messaggi
- il request path di invio non deve dipendere da SMTP

Limite attuale:
- il modello e solido per chat 1:1 e volumi moderati
- non e ancora pensato per volumi molto alti o retention pluriennale non controllata

## Gestione dati e retention

Stato attuale:
- i messaggi non vengono cancellati fisicamente
- il delete globale e un soft delete del thread
- l'archiviazione utente e uno stato per partecipante
- non esiste ancora una retention automatica dei messaggi vecchi

Conseguenze:
- il sistema preserva storico e audit
- ma nel lungo periodo serve una policy esplicita di retention e cold storage

Direzioni consigliate:
- retention configurabile, per esempio dopo N mesi o anni
- job di purge o archive offline per thread soft deleted da molto tempo
- compattazione o archiviazione di thread inattivi molto grandi
- policy legali e privacy definite in modo esplicito

## API esposte

Backend:
- `POST /v1/messages/listings/:listingId/thread`
- `GET /v1/messages/threads`
- `GET /v1/messages/threads/:threadId`
- `POST /v1/messages/threads/:threadId/messages`
- `POST /v1/messages/threads/:threadId/read`
- `DELETE /v1/messages/threads/:threadId`
- `DELETE /v1/messages/threads/:threadId/everyone`
- `POST /v1/messages/threads/:threadId/typing`
- `GET /v1/messages/events`

Web proxy:
- `apps/web/app/api/messages/**`

## Configurazione

Variabili principali:
- `MESSAGE_THREAD_CREATE_WINDOW_SECONDS`
- `MESSAGE_THREAD_CREATE_MAX_REQUESTS`
- `MESSAGE_THREAD_MAX_MESSAGES`
- `MESSAGE_THREAD_SLOWMODE_SECONDS`
- `MESSAGE_MESSAGE_WINDOW_SECONDS`
- `MESSAGE_MESSAGE_MAX_REQUESTS`
- `MESSAGE_MESSAGE_MAX_URLS`
- `MESSAGE_DUPLICATE_WINDOW_SECONDS`
- `MESSAGE_TYPING_EVENT_WINDOW_SECONDS`
- `MESSAGE_TYPING_EVENT_MAX_REQUESTS`
- `MESSAGE_TYPING_EVENT_TTL_SECONDS`
- `MESSAGE_EMAIL_NOTIFICATIONS_ENABLED`
- `MESSAGE_EMAIL_NOTIFICATION_MAX_ATTEMPTS`

Riferimenti:
- `.env.example`
- `apps/api/.env.example`
- `packages/config/src/index.ts`

## Test attuali

Copertura esistente:
- service test su regole business e antispam
- e2e API sugli endpoint principali
- typecheck e build lato web

File rilevanti:
- `apps/api/test/messaging.service.spec.ts`
- `apps/api/test/messaging.e2e-spec.ts`

Verifica manuale consigliata:
1. avvia `api`, `web` e `worker`
2. usa `utente.demo` e `utente2.demo`
3. invia messaggi tra due browser o una finestra incognito
4. verifica inbox live, thread live, typing, delete ed email in Mailpit

## Cosa andrebbe fatto ancora

Priorita alta:
- definire e implementare una retention reale per thread soft deleted e storico molto vecchio
- introdurre moderazione conversazioni: report, block user, euristiche abuso
- aggiungere audit trail esplicito per delete globale e azioni sensibili
- aggiungere metriche e alert per:
  - errori SSE
  - lag del worker notifiche
  - picchi di `429` messaging
  - tassi di reject spam e duplicati

Priorita media:
- supporto allegati o media in chat con pipeline sicura
- ricerca conversazioni o full-text nel contenuto
- virtualizzazione UI per thread molto lunghi
- caricamento progressivo dei messaggi piu vecchi
- sync dei non letti piu preciso in scenari multi-tab e multi-device

Priorita prodotto e compliance:
- preferenze notifiche piu granulari
- export dati utente e policy di cancellazione coerenti
- definizione chiara di retention per richieste legali o moderazione
- eventuale cifratura applicativa dei contenuti se il dominio lo richiede

Priorita architetturale futura:
- passaggio a un event bus piu robusto se il traffico cresce molto
- partizionamento delle tabelle messaggi
- job periodici di compattazione o cold archive
- WebSocket solo se serviranno ack, presence ricca o stream piu complessi

## Limiti noti attuali

- nessuna cancellazione del singolo messaggio
- nessun edit del messaggio
- nessun blocco utente
- nessun report abuso in UI
- nessun allegato messaggio
- nessuna retention automatica
- nessuna observability dedicata solo alla chat

## Setup locale rapido

Setup minimo:
```bash
pnpm db:migrate
pnpm db:seed
pnpm auth:seed
pnpm dev:api
pnpm dev:web
pnpm dev:worker
```

Verifica manuale:
1. login browser 1 con `utente.demo / demo1234`
2. login browser 2 con `utente2.demo / demo1234`
3. apri un annuncio pubblicato e invia un messaggio
4. verifica:
   - comparsa thread in `/messaggi`
   - badge non letti in header
   - aggiornamento live del thread senza refresh
   - "Sta scrivendo..."
   - archiviazione locale
   - delete per entrambi
   - email su Mailpit se attive

## Sintesi tecnica

Il modulo messaging oggi usa:
- PostgreSQL come source of truth
- Redis per realtime effimero
- outbox piu worker per le email
- SSE lato web per gli aggiornamenti live
- denormalizzazione controllata per mantenere l'inbox efficiente

La base e buona per il prodotto corrente. Il passo successivo corretto non e aggiungere feature casuali, ma chiudere bene retention, moderazione, observability e policy dati.
