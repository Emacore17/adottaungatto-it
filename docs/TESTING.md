# TESTING.md

Baseline test per M0.

## Automatico

- Lint:
```bash
pnpm lint
```

- Typecheck:
```bash
pnpm typecheck
```

- Test:
```bash
pnpm test
pnpm test:e2e
```

## Smoke locale API

Con API in esecuzione:
```bash
pnpm test:smoke
```

Verifica endpoint `/health`.

## Manuale

1. Avvio compose (`pnpm infra:up`)
2. Avvio app (`pnpm dev`)
3. Apertura `web` e `admin`
4. Chiamata API `GET /health`
