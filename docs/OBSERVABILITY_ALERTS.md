# OBSERVABILITY_ALERTS.md

Matrice operativa alerting M6.4 per staging/prod.

## Obiettivo

- rilevare regressioni critiche prima che diventino incidenti maggiori
- uniformare classificazione severita (`SEV1/SEV2/SEV3`)
- ridurre rumore alert con soglie chiare e tuning periodico

## Fonti segnali

- Sentry (`api`, `web`, `admin`) con tag:
  - `service`
  - `app`
  - `release`
  - `environment`
- healthcheck API:
  - `GET /health`
  - `GET /health/search`
- log API con correlazione:
  - `requestId`
  - `sentryEventId`

## Matrice alert minima

| Alert ID | Segnale | Soglia iniziale | Finestra | Severita | Azione iniziale |
| --- | --- | --- | --- | --- | --- |
| `A1_API_5XX_SPIKE` | Errori server API (`5xx`) | > 5% richieste | 5 min | `SEV1` | Triage immediato + valutare rollback |
| `A2_API_HEALTH_DOWN` | `/health` non `ok` | >= 2 check consecutivi falliti | 2 min | `SEV1` | Verifica deploy/rete/DB e mitigazione |
| `A3_SEARCH_DEGRADED` | `/health/search` `degraded` persistente | > 10 min | 10 min | `SEV2` | Verifica OpenSearch + fallback SQL |
| `A4_AUTH_FAILURE_SPIKE` | `401/403` su endpoint auth/protetti | > 30% richieste auth | 10 min | `SEV2` | Verifica Keycloak/env/client/realm |
| `A5_WEB_ADMIN_UNHANDLED` | Errori non gestiti frontend in Sentry | >= 20 eventi unici | 10 min | `SEV2` | Triaging issue per release + hotfix |
| `A6_POOR_WEB_VITALS` | `LCP/CLS/INP` rating `poor` | > 25 eventi | 30 min | `SEV3` | Analisi regressione UX/perf |
| `A7_CONTACT_429_SPIKE` | `429` su `POST /v1/listings/:id/contact` | > 20 eventi | 15 min | `SEV3` | Verifica rate-limit tuning o abuso |
| `A8_FALLBACK_RATE_HIGH` | `search_fallback_applied` troppo alto | > 60% ricerche | 15 min | `SEV2` | Verifica indice, dataset geo, query |

## Routing ed escalation

- `SEV1`:
  - paging immediato `Incident Commander` + `Ops Owner`
  - aggiornamento incidente ogni 15 minuti
  - decisione rollback entro 15 minuti se impatto core confermato
- `SEV2`:
  - apertura incidente tecnico entro 15 minuti
  - aggiornamento ogni 30 minuti
  - rollback se il degrado impatta flow core senza workaround
- `SEV3`:
  - ticket prioritario entro 24h
  - monitoraggio trend e tuning soglie

## Playbook rapido per alert

1. Confermare alert non rumoroso (cross-check Sentry + health/log).
2. Classificare severita usando la matrice sopra.
3. Correlare evento:
   - `release`
   - `requestId`
   - `sentryEventId`
4. Applicare playbook scenario in `docs/INCIDENT_RUNBOOK.md`.
5. Registrare esito in ticket/postmortem.

## Tuning soglie

- review settimanale alert rumorosi
- review mensile soglie e severita per ambiente (`staging`/`prod`)
- ogni modifica deve aggiornare questo file con data e motivo

## Checklist implementazione alert

1. Configurare regole in Sentry per `api`, `web`, `admin`.
2. Configurare monitor esterno per `/health` e `/health/search`.
3. Verificare che ogni alert abbia owner e canale notifica.
4. Simulare almeno un alert `SEV1` e uno `SEV2` (dry-run trimestrale).
