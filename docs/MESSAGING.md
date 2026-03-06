# MESSAGING.md

Riferimento tecnico compatto per la messaggistica privata tra utenti.

## Stato attuale

La messaggistica e parte del prodotto reale, non una mock feature.

Supporta:

- apertura thread da annuncio pubblicato
- inbox utente
- dettaglio thread con paginazione messaggi
- invio messaggi
- mark-as-read
- archive per me
- delete globale del thread
- typing indicator
- SSE realtime
- notifiche email asincrone con preferenze utente

## Architettura

Componenti principali:

- API:
  - `apps/api/src/messaging/messaging.controller.ts`
  - `apps/api/src/messaging/messaging.service.ts`
  - `apps/api/src/messaging/messaging.repository.ts`
  - `apps/api/src/messaging/messaging-events.service.ts`
- Worker:
  - `apps/worker/src/messaging-notification-worker.service.ts`
  - `apps/worker/src/messaging-email-delivery.service.ts`
  - `apps/worker/src/messaging-notification-outbox.repository.ts`
  - `apps/worker/src/retention-cleanup-worker.service.ts`
- Web:
  - `apps/web/components/messages-inbox-overview.tsx`
  - `apps/web/components/message-thread-workspace.tsx`
  - `apps/web/components/message-thread-view.tsx`
  - `apps/web/app/api/messages/**`

Dipendenze:

- Postgres per dati persistenti
- Redis per Pub/Sub e typing state
- Mailpit/SMTP per le email in locale

## Modello dati

Migration rilevanti:

- `0010_create_messaging_schema.sql`
- `0011_create_notification_outbox.sql`
- `0012_add_user_message_preferences.sql`
- `0013_extend_messaging_thread_lifecycle.sql`

Tabelle principali:

- `message_threads`
  - thread logico per coppia `listing + owner + requester`
  - campi denormalizzati per anteprima, ultimo messaggio e conteggio
- `message_thread_participants`
  - stato per utente: unread, archive, role
- `message_messages`
  - corpo messaggi e hash anti-duplicato
- `notification_outbox`
  - consegna email asincrona con retry controllato

## Endpoint

- `POST /v1/messages/listings/:listingId/thread`
- `GET /v1/messages/threads`
- `GET /v1/messages/threads/:threadId`
- `POST /v1/messages/threads/:threadId/messages`
- `POST /v1/messages/threads/:threadId/read`
- `DELETE /v1/messages/threads/:threadId`
- `DELETE /v1/messages/threads/:threadId/everyone`
- `POST /v1/messages/threads/:threadId/typing`
- `GET /v1/messages/events`

## Regole di business principali

- non si puo aprire un thread sul proprio annuncio
- il listing deve essere `published`
- esiste un solo thread logico per `listing + owner + requester`
- se un thread era archiviato per uno o entrambi i partecipanti, la riapertura da annuncio ripristina la visibilita (`archived_at = NULL`) e non deve produrre 404 post-send
- i messaggi sono limitati a `2000` caratteri
- sono attivi rate limit, slow mode, limite link e deduplica
- il delete globale (`DELETE /threads/:id/everyone`) elimina in modo definitivo thread, partecipanti e messaggi

## Realtime

Protocollo:

- Server-Sent Events

Eventi:

- `connected`
- `ping`
- `thread_updated`
- `typing_changed`

Note:

- SSE e il canale canonico in questa fase
- la UI mantiene anche strategie di riallineamento piu conservative lato fetch

## Worker email

Flow:

1. l'API inserisce l'evento nell'outbox
2. il worker legge batch pendenti
3. il worker invia email e marca successo/fallimento
4. il numero massimo di tentativi e configurabile via env
5. un job separato di retention ripulisce le righe `sent` e `failed` oltre la finestra configurata

Env rilevanti:

- `MESSAGE_EMAIL_NOTIFICATIONS_ENABLED`
- `MESSAGE_EMAIL_NOTIFICATION_MAX_ATTEMPTS`
- `MESSAGE_NOTIFICATION_WORKER_POLL_MS`
- `MESSAGE_NOTIFICATION_WORKER_BATCH_SIZE`
- `RETENTION_CLEANUP_*`
- `RETENTION_NOTIFICATION_OUTBOX_*`
- `RETENTION_MESSAGE_THREADS_DELETED_DAYS`
- `RETENTION_MESSAGE_THREADS_INACTIVE_DAYS`
- `SMTP_*`

## Smoke locale utile

Prerequisiti:

- `pnpm infra:up`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm auth:seed`
- `pnpm dev`
- `pnpm dev:worker`

Verifiche:

- aprire `/messaggi`
- avviare un thread da un annuncio
- inviare un messaggio
- controllare Mailpit su `http://localhost:8025`
- eseguire `pnpm cleanup:retention` per forzare un ciclo locale di purge su outbox concluso e altri dati retention-managed

## Limiti noti

- niente allegati ai messaggi
- la retention gestisce outbox concluso, analytics, audit log, contact requests, promotion events, thread deleted e thread inattivi con tutti i partecipanti archiviati oltre soglia
- niente moderazione dedicata del contenuto chat
- niente report abuso, spam score o quarantena contenuti
- nessuna DLQ applicativa oltre alle righe `failed` nell'outbox
- il worker resta vivo anche se Redis, MinIO o OpenSearch non sono raggiungibili: utile in locale, non sufficiente per prod
- niente delete del singolo messaggio
- niente supporto multi-device stateful sui preferiti, che restano fuori dal dominio messaging
