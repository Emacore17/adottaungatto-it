# TESTING.md

Guida compatta ai test reali presenti nel repo e alle verifiche locali consigliate.

## Comandi automatici

### Workspace root

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:e2e:web
```

## Stato backend verificato

- `pnpm --filter @adottaungatto/api typecheck`: passa
- `pnpm --filter @adottaungatto/api test`: passa e copre solo `*.spec.ts`
- `pnpm --filter @adottaungatto/api test:e2e`: passa con stack locale attivo
- `pnpm --filter @adottaungatto/api backup:smoke`: passa e verifica dump/restore Postgres + export/restore MinIO su risorse temporanee
- `pnpm --filter @adottaungatto/worker test`: passa
- `pnpm search:reindex`: passa e fa swap atomico di `listings_read` e `listings_write` su un indice versionato
- `pnpm search:cleanup`: passa e rimuove gli indici `listings_v*` inattivi oltre la finestra di rollback configurata
- `pnpm search:verify`: passa e confronta conteggi e ID tra DB e `listings_read`
- `pnpm cleanup:retention`: passa e rimuove localmente righe scadute da analytics, audit log, outbox concluso e thread chat gia soft-deleted
- `pnpm test:smoke:listings`, `pnpm test:smoke:media-upload`, `pnpm test:smoke:worker-minio`: passano con stack locale attivo
- `pnpm db:migrate`: va eseguito quando `compose` e healthy, altrimenti puo fallire e va rilanciato

Per l'audit backend completo usare `docs/BACKEND_GUIDE.md`.

### Smoke script utili

```bash
pnpm test:smoke
pnpm test:smoke:listings
pnpm test:smoke:listings-media
pnpm minio:bootstrap
pnpm test:smoke:media-upload
pnpm test:smoke:seed-listings
pnpm test:smoke:worker-minio
pnpm backup:create
pnpm backup:verify
pnpm backup:smoke
pnpm search:reindex
pnpm search:cleanup
pnpm search:verify
pnpm cleanup:retention
```

## Suite reali presenti oggi

### API

Test file principali in `apps/api/test`:

- `health.e2e-spec.ts`
- `auth-rbac.e2e-spec.ts`
- `geography.e2e-spec.ts`
- `users.e2e-spec.ts`
- `listings-create.e2e-spec.ts`
- `listings-public.e2e-spec.ts`
- `listings-search.e2e-spec.ts`
- `listings-media-upload.e2e-spec.ts`
- `listings-contact.e2e-spec.ts`
- `listings-breeds.e2e-spec.ts`
- `moderation.e2e-spec.ts`
- `messaging.e2e-spec.ts`
- `analytics.e2e-spec.ts`
- `promotions.e2e-spec.ts`
- `public-rate-limit.e2e-spec.ts`
- `api-runtime-safety.spec.ts`
- `request-client-ip.spec.ts`
- `listings.service.spec.ts`
- `search-index.service.spec.ts`
- `search-fallback.service.spec.ts`
- `messaging.service.spec.ts`
- `moderation.service.spec.ts`
- `analytics.service.spec.ts`
- `promotions.service.spec.ts`

### Web

Playwright attuale in `apps/web/tests/e2e`:

- `scaffold-smoke.spec.ts`

Copertura reale Playwright oggi:

- home smoke
- login smoke
- catalogo smoke
- toggle light/dark theme

Nota:

- la copertura E2E del web e ancora troppo leggera rispetto alla complessita attuale del prodotto
- la copertura backend ora separa unit ed E2E, include uno smoke reale di backup/restore minimo, verifica locale del reindex search alias-safe, cleanup degli indici inattivi, controllo drift DB -> OpenSearch e un ciclo retention run-once; mancano ancora snapshot/restore search e prod-hardening avanzato
- il rate limit pubblico ha ora test E2E dedicato e helper unit testato per la risoluzione IP con trusted proxy
- CORS allowlist e safety check runtime hanno ora test unitari dedicati

## Verifica locale consigliata

1. avvio stack:

```bash
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm auth:seed
pnpm minio:bootstrap
pnpm dev
```

2. smoke backend:

```bash
pnpm test:smoke
pnpm test:smoke:listings
pnpm test:smoke:listings-media
pnpm test:smoke:media-upload
pnpm test:smoke:worker-minio
```

3. API E2E:

```bash
pnpm test:e2e
```

4. web smoke:

```bash
pnpm test:e2e:web
```

## Manual check rapido per feature core

### Web pubblico

- `/`
- `/annunci`
- `/annunci/[listingId]`
- `/cerca`

Controllare:

- ricerca con localita
- dettaglio annuncio
- fallback di ricerca se l'area e troppo stretta
- CTA contatto

### Workspace utente

- `/login`
- `/account`
- `/account/annunci`
- `/pubblica`
- `/messaggi`
- `/preferiti`

Controllare:

- login con `utente.demo`
- creazione/modifica annuncio
- upload media
- inbox e thread
- persistenza locale dei preferiti

### Admin

- `/login` sull'app admin (`localhost:3001`)
- `/admin`
- `/admin/moderazione`
- `/admin/moderazione/[listingId]`

Controllare:

- login con `moderatore.demo` o `admin.demo`
- queue moderazione
- approve/reject/suspend/restore
- KPI dashboard

## Gap di test da tenere presenti

- Playwright non copre ancora discovery completa, workspace, messaging e moderazione UI
- le pagine mock-backed admin non hanno una strategia test forte
- registrazione e recupero password non hanno test di flusso reale perche i flussi reali non esistono ancora
- il backend non ha ancora smoke dedicati per scheduler retention continuo o failover Redis cross-instance
