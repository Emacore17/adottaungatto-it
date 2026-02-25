# adottaungatto-it

Bootstrap locale del monorepo (`M0`) per avviare:
- `apps/web` (Next.js pubblico)
- `apps/admin` (Next.js admin separato)
- `apps/api` (NestJS + Fastify con `/health`)
- `apps/worker` (NestJS worker base)
- servizi infrastrutturali locali via Docker Compose

## Prerequisiti

- Node.js LTS (`.nvmrc` = `22`)
- pnpm
- Docker + Docker Compose

## Setup rapido

1. Installare dipendenze:
```bash
pnpm install
```

2. Creare gli env locali (PowerShell):
```powershell
Copy-Item .env.example .env.local
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/api/.env.example apps/api/.env.local
Copy-Item apps/worker/.env.example apps/worker/.env.local
```

3. Avviare l'infrastruttura:
```bash
pnpm infra:up
```

4. Avviare le app:
```bash
pnpm dev
```

## URL locali

- Web: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:3002
- API healthcheck: http://localhost:3002/health
- Postgres/PostGIS: localhost:5432
- Redis: localhost:6379
- OpenSearch: http://localhost:9200
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001
- Keycloak: http://localhost:8080
- Mailpit UI: http://localhost:8025

## Script principali

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm dev:worker`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:smoke`
- `pnpm db:migrate` (placeholder M0)
- `pnpm db:seed` (placeholder M0)
- `pnpm search:reindex` (placeholder M0)

## Credenziali locali (solo development)

- Postgres:
  - user: `adottaungatto`
  - password: `adottaungatto`
  - db: `adottaungatto`
- MinIO:
  - access key: `minio`
  - secret key: `minio123`
- Keycloak:
  - admin: `admin`
  - password: `admin`

Account demo applicativi (`utente.demo`, `moderatore.demo`, `admin.demo`): **TBD in M1/M2 seed**.

## Verifica manuale minima (checkpoint M0)

1. `pnpm infra:up`
2. `pnpm dev`
3. Aprire web/admin:
   - http://localhost:3000
   - http://localhost:3001
4. Verificare API:
```bash
curl http://localhost:3002/health
```
Output atteso:
```json
{"status":"ok","service":"api","timestamp":"..."}
```

## Troubleshooting rapido

- Porta occupata:
  - usare override host port in `.env.local` (es. `MINIO_API_PORT=19000`, `MINIO_CONSOLE_PORT=19001`).
  - se si cambia porta di un servizio usato dalle app, allineare anche URL applicativi (`MINIO_ENDPOINT`, ecc.).
- Docker non in esecuzione:
  - avviare Docker Desktop prima di `pnpm infra:up`.
- OpenSearch non healthy:
  - attendere 30-60s dopo il primo boot.
- Errori env mancanti:
  - ricontrollare tutti i `.env.local`; la validazione Zod fallisce con messaggio esplicito.
