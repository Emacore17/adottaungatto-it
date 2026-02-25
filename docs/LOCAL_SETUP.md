# LOCAL_SETUP.md

Riferimento operativo locale per M0 bootstrap.

## 1. Preparazione

- `pnpm install`
- Copiare `.env.example` in `.env.local` (root + app)

## 2. Infrastruttura locale

```bash
pnpm infra:up
```

Se alcune porte host sono già occupate, usare override in `.env.local`:
- `POSTGRES_PORT`
- `REDIS_PORT`
- `OPENSEARCH_PORT`
- `MINIO_API_PORT`
- `MINIO_CONSOLE_PORT`
- `KEYCLOAK_PORT`
- `MAILPIT_SMTP_PORT`
- `MAILPIT_UI_PORT`

Servizi inclusi:
- PostgreSQL + PostGIS
- Redis
- OpenSearch
- MinIO
- Keycloak
- Mailpit

## 3. Avvio applicazioni

```bash
pnpm dev
```

Oppure singolarmente:
- `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm dev:worker`

## 4. Sanity check

- Web: http://localhost:3000
- Admin: http://localhost:3001
- API health: http://localhost:3002/health

## 5. Arresto

```bash
pnpm infra:down
```
