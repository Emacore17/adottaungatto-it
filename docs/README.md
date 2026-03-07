# docs/README.md

Indice canonico ridotto per coding agent AI.

## Ordine di lettura

1. `docs/PROJECT_CONTEXT.md`
2. `docs/DEVELOPMENT_ROADMAP.md`
3. `docs/AUTH_REGISTRATION_AGENT_GUIDE.md` (task auth/onboarding/account)
4. `docs/API_CONTRACT.md`
5. `docs/TESTING.md`
6. `docs/MESSAGING.md` (solo task chat)
7. `docs/DATA_GEO_ITALIA.md` (solo task geografia/seed)

## Regole

- il codice e la fonte primaria
- ogni modifica runtime/contratto/setup aggiorna la doc nello stesso change
- evitare nuovi file paralleli: aggiornare i documenti canonici esistenti
- preferire contenuti operativi, brevi e verificabili

## Context budget (uso consigliato per agente AI)

Leggere solo il minimo necessario per il task corrente:

- task auth/account/registrazione:
  - `docs/AUTH_REGISTRATION_AGENT_GUIDE.md`
  - `docs/API_CONTRACT.md`
  - `docs/TESTING.md`
- task API/contratti endpoint:
  - `docs/API_CONTRACT.md`
  - `docs/PROJECT_CONTEXT.md`
- task backlog/priorita:
  - `docs/DEVELOPMENT_ROADMAP.md`
  - `docs/PROJECT_CONTEXT.md`
- task messaggistica:
  - `docs/MESSAGING.md`
  - `docs/API_CONTRACT.md`
- task geografia/seed:
  - `docs/DATA_GEO_ITALIA.md`
  - `docs/PROJECT_CONTEXT.md`

## Ambito dei documenti canonici

- `PROJECT_CONTEXT`: architettura, stato reale prodotto, vincoli e regole di change
- `DEVELOPMENT_ROADMAP`: backlog aperto e ordine di esecuzione per i prossimi sviluppi
- `AUTH_REGISTRATION_AGENT_GUIDE`: guida esecutiva auth/account (UI + backend + dati + sicurezza)
- `API_CONTRACT`: endpoint e shape payload realmente supportati
  - sorgente OpenAPI versionata: `packages/sdk/openapi/openapi.v1.json`
- `TESTING`: comandi, copertura attuale, gap test e check manuali
- `MESSAGING`: dettaglio dominio messaggistica
- `DATA_GEO_ITALIA`: snapshot ISTAT e pipeline sync/seed geografia

## Mapping vecchi documenti

- `AUTH_REGISTRATION_EXECUTION_PLAN.md` -> usare `AUTH_REGISTRATION_AGENT_GUIDE.md` + `DEVELOPMENT_ROADMAP.md`
- `ROADMAP.md` -> usare `DEVELOPMENT_ROADMAP.md`
- guide separate frontend/backend/architecture legacy -> usare `PROJECT_CONTEXT.md` + `API_CONTRACT.md` + `TESTING.md`
