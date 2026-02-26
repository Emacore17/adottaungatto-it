# INCIDENT_RUNBOOK.md

Runbook base per incident response M6.5.
Obiettivo: ridurre MTTR con triage rapido, azioni ripetibili e comunicazione chiara.

## Livelli severita

- `SEV1`: servizio core non disponibile o rischio dati elevato
- `SEV2`: degrado forte con workaround disponibile
- `SEV3`: degrado limitato, impatto contenuto

## Ruoli minimi

- `Incident Commander`: coordina decisioni e timeline
- `Ops Owner`: applica azioni tecniche su deploy/infra
- `App Owner`: analizza app/log e prepara fix
- `Comms Owner`: aggiorna stato verso stakeholder

Una persona puo coprire piu ruoli su team piccolo, ma le responsabilita restano separate.

## Triage iniziale (primi 15 minuti)

1. Aprire incidente con timestamp, severita iniziale e sintomo.
2. Usare `docs/OBSERVABILITY_ALERTS.md` per classificazione soglia/severita.
3. Confermare impatto su endpoint/flow core:
   - login
   - creazione annuncio
   - moderazione
   - ricerca pubblica
4. Raccogliere identificativi:
   - `requestId` da header/log
   - `sentryEventId` (se presente)
   - `release` attiva
5. Decidere entro 15 minuti:
   - mitigazione immediata
   - rollback
   - monitoraggio stretto

## Playbook per scenario

### A) Spike API 5xx

Segnali:
- incremento errori su endpoint API
- log con `Unhandled 5xx ... requestId=... sentryEventId=...`

Azioni:
1. Verificare `GET /health` e `GET /health/search`.
2. Aprire evento Sentry associato (`sentryEventId`).
3. Verificare release appena deployata.
4. Se regressione evidente, rollback release.

Verifica uscita:
- 5xx rientrati in soglia
- endpoint core nuovamente operativi

### B) OpenSearch degradato/down

Segnali:
- `/health/search` degradato
- latenza alta su ricerca

Azioni:
1. Verificare fallback tecnico SQL attivo.
2. Controllare stato cluster OpenSearch.
3. Se cluster recupera, rieseguire `pnpm search:reindex`.

Verifica uscita:
- ricerca risponde
- fallback coerente dove necessario

### C) Login/Auth failure (Keycloak o token)

Segnali:
- login web/admin non completa
- endpoint protetti rispondono `401/403` anomali

Azioni:
1. Verificare raggiungibilita Keycloak.
2. Verificare env auth (`KEYCLOAK_*`, client id, realm).
3. Validare token con endpoint protetto (`/v1/users/me`).
4. Se problema da release recente, rollback app/API.

Verifica uscita:
- login riuscito per utente demo
- endpoint protetti coerenti con RBAC

### D) Media upload failure (MinIO)

Segnali:
- upload immagini fallito
- errori su endpoint media annuncio

Azioni:
1. Verificare MinIO reachability e credenziali.
2. Verificare bucket presenti (`listing-originals`, `listing-thumbs`).
3. Eseguire smoke mirato:
   - `pnpm minio:bootstrap`
   - `pnpm test:smoke:media-upload`

Verifica uscita:
- upload riuscito
- media persistita su storage e DB

### E) Database unavailable / migration issue

Segnali:
- errori connessione DB
- query core falliscono

Azioni:
1. Verificare stato Postgres e connessioni.
2. Controllare migration ultima release.
3. Se migration incompatibile:
   - rollback applicativo
   - valutare restore/rollback schema con `docs/BACKUP_RESTORE_DRILL.md`

Verifica uscita:
- query core operative
- nessuna perdita dati non prevista

## Comunicazione incidente

Template aggiornamento rapido:

```
[INCIDENT UPDATE]
Severita: SEVx
Start: <UTC timestamp>
Impatto: <utente/flow impattati>
Stato: Investigating | Mitigating | Monitoring | Resolved
RequestId: <id o n/a>
SentryEventId: <id o n/a>
Prossimo aggiornamento: <timestamp>
```

## Chiusura incidente

Checklist:

1. Confermare recupero completo dei flow core.
2. Registrare causa radice (anche provvisoria).
3. Elencare azioni correttive con owner e data.
4. Allegare evidenze:
   - log principali
   - eventId Sentry
   - release coinvolte
5. Aprire task follow-up per prevenzione regressione.
