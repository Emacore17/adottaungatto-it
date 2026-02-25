# TESTING.md

Baseline test per M0 + M1 (auth e geografia).

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

Copertura M2.4 inclusa in `test:e2e`:
- `apps/api/test/listings-create.e2e-spec.ts`
- verifica auth, validazione payload e stato iniziale forzato `pending_review`

Copertura M2.5 inclusa in `test:e2e`:
- `apps/api/test/listings-media-upload.e2e-spec.ts`
- verifica upload/list/delete/reorder media endpoint + validazione payload reorder

- Smoke CRUD listings repository (M2.1):
```bash
pnpm test:smoke:listings
```

- Smoke schema media annunci (M2.2):
```bash
pnpm test:smoke:listings-media
```

- Smoke MinIO upload (M2.3):
```bash
pnpm minio:bootstrap
pnpm test:smoke:media-upload
pnpm test:smoke:worker-minio
```

## Smoke locale API

Con API in esecuzione:
```bash
pnpm test:smoke
```

Verifica endpoint `/health`.

## RBAC API (M1.1)

Header auth locale usato in M1.1:
- `x-auth-user-id` (obbligatorio)
- `x-auth-email` (opzionale)
- `x-auth-roles` (opzionale, default `user`)
- `Authorization: Bearer <token>` (M1.2 Keycloak, priorita piu alta del fallback header)

Endpoint di verifica:
- `GET /v1/users/me` (richiede autenticazione)
- `GET /v1/users/moderation-space` (richiede `moderator` o `admin`)
- `GET /v1/users/admin-space` (richiede `admin`)

Token helper:
```bash
pnpm auth:token utente.demo demo1234 adottaungatto-web
```

## Manuale

1. Avvio compose (`pnpm infra:up`)
2. Avvio app (`pnpm dev`)
3. Apertura `web` e `admin`
4. Chiamata API `GET /health`
5. Chiamata API protetta `GET /v1/users/me` con header auth
6. Login web `utente.demo/demo1234` -> redirect `/account`
7. Login admin `moderatore.demo/demo1234` -> redirect `/moderation`
8. Login admin con utente semplice -> redirect `/unauthorized`
9. Eseguire `pnpm db:migrate` e verificare creazione tabelle geografia (`regions`, `provinces`, `comuni`)
10. Eseguire `pnpm geo:sync` (opzionale, per riallineare snapshot ISTAT locale)
11. Eseguire `pnpm db:seed` due volte e verificare idempotenza:
   - primo run: insert su regioni/province/comuni
   - secondo run: zero insert, solo update
12. Verificare conteggi finali:
   - `regions=20`
   - `provinces=110`
   - `comuni=7895`
13. Verificare endpoint geografia (`M1.6`):
   - `GET /v1/geography/regions` -> `200`
   - `GET /v1/geography/provinces?regionId=<id>` -> `200`
   - `GET /v1/geography/comuni?provinceId=<id>` -> `200`
   - `GET /v1/geography/search?q=Tor&limit=5` -> `200`
14. Verificare UI location search (`M1.7`) su web home:
   - digitare `Torino` e verificare suggerimenti multipli (`Comune`, `Comune + provincia`, `Provincia`)
   - verificare comuni con sigla provincia (es. `Chieri (TO)`)
   - digitare `Piemonte` e verificare opzione `Regione`
   - verificare aggiornamento `Form state (LocationIntent)`
15. Eseguire seed utenti demo (`M1.8`) due volte:
   - `pnpm auth:seed`
   - `pnpm auth:seed`
16. Verificare token/login per tutti i ruoli:
   - `pnpm auth:token utente.demo demo1234 adottaungatto-web` -> token valido
   - `pnpm auth:token moderatore.demo demo1234 adottaungatto-admin` -> token valido
   - `pnpm auth:token admin.demo demo1234 adottaungatto-admin` -> token valido
17. Verificare CRUD DB annunci (M2.1):
   - `pnpm db:migrate`
   - `pnpm test:smoke:listings`
   - controllare output:
     - `createdStatus = pending_review`
     - `updatedStatus = published`
     - `archivedStatus = archived`
     - `listedAfterCount = 0`
18. Verificare schema media annunci (M2.2):
   - `pnpm db:migrate`
   - `pnpm test:smoke:listings-media`
   - controllare output:
     - `mediaRowsInserted = 3`
     - `orderedPositions = [1,2,3]`
     - `duplicatePositionRejected = true`
     - `secondPrimaryRejected = true`
     - `cascadeDeleteRemainingRows = 0`
19. Verificare integrazione MinIO (M2.3):
   - `pnpm minio:bootstrap`
   - `pnpm test:smoke:media-upload`
   - `pnpm test:smoke:worker-minio`
   - controllare output:
     - `objectExists = true`
     - `dbRowsForListing = 1`
20. Verificare create listing API (M2.4):
   - `pnpm test:e2e`
   - controllare test `Listings create endpoint`:
     - 401 senza auth
     - 400 payload non valido / `status` client non consentito
     - 201 payload valido con `status = pending_review`
21. Verificare media API (M2.5):
   - `pnpm test:e2e`
   - controllare test `Listings media upload endpoint`:
     - 201 upload valido
     - 200 lista media
     - 200 reorder media valido
     - 400 reorder con `mediaIds` duplicati
     - 200 delete media valido
