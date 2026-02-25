# TESTING.md

Baseline test locale per milestone M0-M4.

## Check automatici

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:e2e:web
```

## Suite rilevanti M2-M3

- M2 create listing: `apps/api/test/listings-create.e2e-spec.ts`
- M2 media upload/list/delete/reorder: `apps/api/test/listings-media-upload.e2e-spec.ts`
- M2 moderazione: `apps/api/test/moderation.e2e-spec.ts`, `apps/api/test/moderation.service.spec.ts`
- M2 lista/dettaglio pubblico: `apps/api/test/listings-public.e2e-spec.ts`
- M2 seed demo smoke: `apps/api/scripts/smoke-seed-listings.ts`
- M3 contratto/search/fallback: `apps/api/test/listings-search.e2e-spec.ts`
- M3 fallback service: `apps/api/test/search-fallback.service.spec.ts`
- M3 OpenSearch integration: `apps/api/test/search-index.service.spec.ts`
- M3 distanza/geo sorting: `apps/api/test/listings.service.spec.ts`, `apps/api/test/search-index.service.spec.ts`, `apps/api/test/listings-search.e2e-spec.ts`
- M3.8 Playwright ricerca/fallback UI: `apps/web/tests/e2e/search-fallback.spec.ts`
- M4.1 design tokens/UI consistency: verifica manuale + riferimento `docs/UX_UI_GUIDELINES.md`
- M4.2 motion baseline: preset condivisi + transizioni pagina/list/dialog
- M4.3 responsive refinement: verifica manuale multi-viewport (home, ricerca, dettaglio, create, moderazione)
- M4.4 loading/empty/error states: skeleton route-level, error boundaries con retry, toast feedback coerenti
- M4.5 a11y pass base: focus-visible coerente, pattern combobox accessibile, keyboard navigation, dialog focus trap
- M4.6 performance UX pass: immagini `next/image`, lazy component load, caching query con TanStack, check web vitals locali
- M5.1 promotions data model/API: migration schema piani+promozioni+eventi, endpoint admin assign/list, seed demo plans/promotions

## Smoke command utili

```bash
pnpm test:smoke
pnpm test:smoke:listings
pnpm test:smoke:listings-media
pnpm minio:bootstrap
pnpm test:smoke:media-upload
pnpm test:smoke:worker-minio
pnpm db:seed
pnpm test:smoke:seed-listings
```

## Checklist manuale locale

1. `pnpm infra:up`
2. `pnpm dev`
3. Verifica web/admin/api online
4. `GET /health` e `GET /health/search`
5. `pnpm db:migrate`
6. `pnpm geo:sync`
7. `pnpm db:seed`
8. Verifica conteggi geografia:
   - `regions=20`
   - `provinces=110`
   - `comuni=7895`
9. Verifica copertura centroidi:
   ```bash
   docker exec -it adottaungatto-postgres psql -U adottaungatto -d adottaungatto \
     -c "SELECT (SELECT COUNT(*) FROM regions WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS regions_with_centroids, (SELECT COUNT(*) FROM provinces WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS provinces_with_centroids, (SELECT COUNT(*) FROM comuni WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS comuni_with_centroids;"
   ```
   Output atteso:
   - `regions_with_centroids=20`
   - `provinces_with_centroids=110`
   - `comuni_with_centroids=7895`
10. Lookup geografia:
    - `GET /v1/geography/regions`
    - `GET /v1/geography/provinces?regionId=<id>`
    - `GET /v1/geography/comuni?provinceId=<id>`
    - `GET /v1/geography/search?q=Tor&limit=5`
11. Seed utenti demo Keycloak:
    - `pnpm auth:seed`
    - `pnpm auth:token utente.demo demo1234 adottaungatto-web`
    - `pnpm auth:token moderatore.demo demo1234 adottaungatto-admin`
    - `pnpm auth:token admin.demo demo1234 adottaungatto-admin`
12. Flusso E2E core:
    - login utente web
    - creazione annuncio con immagini
    - login moderatore/admin
    - approvazione annuncio
    - verifica annuncio pubblicato su lista pubblica
13. Ricerca/fallback:
    - `GET /v1/listings/search` con `locationScope=comune` e location valida
    - verifica metadata fallback (`fallbackApplied`, `fallbackLevel`, `fallbackReason`)
14. Distanza M3.5:
    - verifica `items[*].distanceKm` su ricerca geolocalizzata
    - verifica ordinamento distance-aware su query con `sort=relevance`
15. Reindex OpenSearch:
    - `pnpm search:reindex`
    - `GET http://localhost:9200/listings_v1/_count`
16. UI fallback M3.7:
    - aprire `http://localhost:3000/annunci`
    - eseguire ricerca con luogo specifico e filtri restrittivi
    - verificare banner fallback con area richiesta/effettiva
    - verificare CTA: `Usa area suggerita`, `Rimuovi filtri aggiuntivi`, `Cerca in tutta Italia`
    - verificare stato `0 risultati` con suggerimenti utili + azioni rapide
17. E2E web M3.8 (Playwright):
    - install browser: `pnpm --filter @adottaungatto/web test:e2e:install`
    - eseguire suite: `pnpm test:e2e:web`
    - casi coperti: match esatto comune, fallback comune->provincia con banner/CTA, viewport mobile con drawer filtri
18. UI consistency M4.1:
    - aprire `http://localhost:3000/annunci`, `http://localhost:3000/account/listings`, `http://localhost:3001/moderation`
    - verificare badge semantici (`success`, `warning`, `danger`, `info`)
    - verificare coerenza radius/shadow su card/dialog/input/button
    - verificare focus ring visibile su componenti interattivi
19. Motion baseline M4.2:
    - verificare transizione pagina su web/admin (template con `motionPresets.page`)
    - in `/annunci` verificare crossfade loading -> content e microinterazioni card risultati
    - verificare open/close dialog con transizione morbida (overlay + content)
20. Responsive refinement M4.3:
    - viewport mobile `360x800`: nessun overflow su `/`, `/annunci`, `/annunci/<id>`, `/account/listings/new`, `/moderation`
    - `/annunci`: drawer filtri mobile apribile, bottoni `Filtri avanzati` e `Cerca annunci` full-width
    - `/annunci/<id>`: gallery adattiva (thumb scroll mobile), CTA contatto sticky bottom visibile
    - `/account/listings/new`: barra azioni sticky mobile (`Reset`/`Invia`) funziona e non copre i contenuti finali
    - `/moderation` tablet `768x1024`: layout leggibile, card e bottoni moderazione usabili
21. Loading/empty/error M4.4:
    - verificare skeleton su caricamento route: `/annunci`, `/annunci/<id>`, `/account/listings/new`, `/moderation`
    - forzare errore su segment e verificare fallback `error.tsx` con pulsante `Riprova`
    - `/annunci`: su errore fetch API verificare toast con CTA `Riprova`
    - `/moderation`: verificare toast feedback dopo azione di moderazione e empty state con CTA `Ricarica coda`
    - `/account/listings/new`: verificare toast su errori media/submit e hint quando non ci sono immagini selezionate
22. A11y pass M4.5:
    - `Tab` navigation su `/annunci` e `/moderation` con focus ring visibile su tutti i controlli
    - `LocationSelector`: `ArrowUp/ArrowDown` sposta selezione, `Enter` seleziona, `Esc` chiude
    - verificare che i suggerimenti location aggiornino correttamente item attivo e stato annunciato
    - verificare che il conteggio risultati in `/annunci` venga aggiornato in modo leggibile (`aria-live`)
    - dialog moderazione e drawer filtri mobile: focus intrappolato internamente, `Esc` chiude correttamente
23. Performance UX pass M4.6:
    - eseguire navigazione `/` -> `/annunci` -> `/annunci/<id>` e verificare assenza di full reload non necessari
    - su `/annunci` verificare update filtri/paginazione con transizione dati fluida (query cache TanStack)
    - verificare rendering immagini su lista e dettaglio (nessun errore host immagini in console server/browser)
    - in devtools console browser verificare log metriche web vitals:
      - web: prefisso `[web-vitals]`
      - admin: prefisso `[admin-web-vitals]`
      - metriche attese: `LCP`, `CLS`, `INP`
24. Promotions M5.1:
    - eseguire migration e seed: `pnpm db:migrate && pnpm db:seed`
    - verificare piani seedati:
      - `SELECT code, duration_hours, promotion_weight, is_active FROM plans ORDER BY duration_hours;`
    - verificare promozioni seed demo:
      - `SELECT status, COUNT(*) FROM listing_promotions GROUP BY status;`
      - `SELECT event_type, COUNT(*) FROM promotion_events GROUP BY event_type;`
    - API admin (header role `admin`):
      - `GET /v1/admin/promotions/plans`
      - `GET /v1/admin/promotions/listings/<LISTING_ID>`
      - `POST /v1/admin/promotions/listings/<LISTING_ID>/assign`
    - RBAC:
      - con ruolo `user` o `moderator` gli endpoint admin/promotions devono restituire `403`

## Note operative

- `pnpm search:reindex` richiede env worker validi (`WORKER_NAME`, `DATABASE_URL`, `REDIS_URL`, `OPENSEARCH_URL`).
- Se OpenSearch non e disponibile, la search API usa fallback tecnico SQL; i metadata fallback restano valorizzati.
- Per M3.5, il prerequisito e avere snapshot/seed aggiornati con centroidi (`pnpm geo:sync` + `pnpm db:seed`).
- i test Playwright avviano automaticamente `apps/web` su porta `3100` e mockano l'endpoint API `/v1/listings/search`.
