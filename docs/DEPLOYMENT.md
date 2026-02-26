# DEPLOYMENT.md

Runbook operativo per deploy staging/prod, verifiche post-deploy e rollback.
Questo documento copre il gate M6.2 + M6.5 (checklist deploy e post-deploy verification).

## Scope

- Pipeline CI/CD per `web`, `admin`, `api`, `worker`
- Verifiche minime dopo ogni release
- Criteri e procedura di rollback
- Evidenze da conservare per audit tecnico

## Prerequisiti release

- Branch target aggiornata e mergeata
- Workflow CI verde:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:e2e:web`
- Migration DB compatibili con rollout (backward compatible per deploy zero-downtime)
- Variabili ambiente aggiornate:
  - `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_SERVICE_NAME`
  - `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
  - `NEXT_PUBLIC_SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_SERVICE_NAME`
- Piano rollback concordato (release precedente disponibile)
- Backup pre-release eseguito secondo `docs/BACKUP_RESTORE_DRILL.md`

## Checklist pre-deploy

1. Congelare merge non urgenti durante la finestra deploy.
2. Annotare release candidate:
   - `RELEASE_SHA`
   - `RELEASE_TAG` (es: `2026.02.26-rc1`)
3. Verificare compatibilita migration:
   - nessuna rimozione colonna/tabella prima del rollout completo
   - eventuali backfill non bloccanti
4. Verificare immagini/container buildati per tutti i servizi.
5. Verificare che i secret siano presenti in ambiente target.

## Procedura deploy staging

1. Eseguire pipeline release con `RELEASE_TAG` valorizzato.
2. Applicare migration DB in staging.
3. Eseguire rollout servizi nell'ordine:
   - `api`
   - `worker`
   - `web`
   - `admin`
4. Eseguire reindex se richiesto dal rilascio:
   - `pnpm search:reindex`
5. Eseguire smoke post-deploy (sezione successiva).
6. Registrare evidenze deploy + backup/restore drill.

## Post-deploy verification (staging)

Eseguire entro 15 minuti dal deploy.

### API/Infra

- `GET /health` -> `status=ok`
- `GET /health/search` -> `status=ok|degraded` (non deve essere down non gestito)
- verifica headers sicurezza API:
  - `Content-Security-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `X-Request-Id`
- verificare assenza di spike 5xx nel periodo deploy

### Core flow prodotto

1. Login utente web (`/login`)
2. Creazione annuncio (`/account/listings/new`)
3. Login admin/moderator (`/admin/login` o `/login` admin app)
4. Moderazione annuncio (`/moderation`)
5. Verifica annuncio pubblicato su `/annunci`
6. Ricerca con fallback geografico su `/annunci`

### Osservabilita

- Verificare eventi errore in Sentry con tag:
  - `service`
  - `app`
  - `release`
- Verificare stato alert/threshold secondo `docs/OBSERVABILITY_ALERTS.md`
- Verificare presenza `x-sentry-event-id` su risposte 5xx in API
- Verificare log API con correlazione:
  - `requestId=...`
  - `sentryEventId=...`

## Criteri di rollback

Effettuare rollback se almeno una condizione persiste oltre 10 minuti:

- errore 5xx sostenuto su endpoint core
- login non funzionante (`web` o `admin`)
- flusso moderazione non operativo
- ricerca pubblica non operativa senza fallback
- regressione critica dati o migration non sicura

## Procedura rollback (dry-run/operativa)

1. Bloccare nuovi deploy.
2. Ridistribuire la release precedente (`RELEASE_PREV`) per:
   - `web`
   - `admin`
   - `api`
   - `worker`
3. Verificare salute base:
   - `GET /health`
   - login + endpoint protetto
4. Valutare rollback migration solo se necessario e gia validato.
5. Rieseguire smoke core flow.
6. Aprire postmortem tecnico con:
   - root cause provvisoria
   - impatto
   - azioni correttive

## Evidenze minime da salvare

- link run CI/CD release
- `RELEASE_SHA` e `RELEASE_TAG`
- output smoke post-deploy
- screenshot/log Sentry (se incidenti)
- output restore drill o riferimento ultima esecuzione valida (`docs/BACKUP_RESTORE_DRILL.md`)
- decisione finale:
  - `deploy confermato`
  - `rollback completato`
