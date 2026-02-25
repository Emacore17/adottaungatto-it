# DATA_GEO_ITALIA.md

Documento operativo per il dataset geografico italiano usato in locale.

## Fonte dati ufficiale

- Fonte: ISTAT
- Dataset: `Elenco-comuni-italiani.xlsx`
- URL: `https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx`
- Snapshot locale corrente: sheet `CODICI al 31_01_2026`
- Data di riferimento snapshot corrente: `2026-01-31`

## Snapshot locale versionata

Per garantire setup locale offline-friendly, il repo include:
- `apps/api/data/geography/istat-current.json`

Aggiornamento snapshot:
```bash
pnpm geo:sync
```

Il comando:
- scarica il file ISTAT ufficiale
- normalizza e valida i campi necessari
- rigenera `istat-current.json` con metadata (`source`, `stats`, arrays seed)

## Copertura dataset corrente

- Regioni: `20`
- Unita sovracomunali (province/citta metropolitane/liberi consorzi): `110`
- Comuni: `7895`

## Mapping DB

Tabelle target:
- `regions`
- `provinces`
- `comuni`

Mapping campi usato dallo script `apps/api/scripts/geo-sync-istat.ts`:
- `Codice Regione` -> `regions.istat_code`
- `Denominazione Regione` -> `regions.name`
- `Codice dell'Unità territoriale sovracomunale` -> `provinces.istat_code`
- `Denominazione dell'Unità territoriale sovracomunale` -> `provinces.name`
- `Sigla automobilistica` -> `provinces.sigla`
- `Codice Comune formato numerico` -> `comuni.istat_code`
- `Denominazione in italiano` -> `comuni.name`
- `Codice Catastale del Comune` -> `comuni.code_catastale`

## Seed DB (M1.5)

Comando:
```bash
pnpm db:seed
```

Comportamento:
- carica snapshot locale `istat-current.json`
- esegue upsert idempotente su regioni/province/comuni
- gestisce codici obsoleti con pruning controllato
- riallinea la gerarchia in caso di variazioni amministrative (es. Sardegna 2026)

## Verifica rapida post-seed

Query attese:
- `regions=20`
- `provinces=110`
- `comuni=7895`

Sardegna (dal riassetto amministrativo 2026):
- codici provincia/sovracomunale: `113,114,115,116,117,119,312,318`

## Limiti noti (M1)

- I centroidi (`centroid_lat`, `centroid_lng`) e le geometrie PostGIS restano `NULL` in M1.
- Arricchimento geo avanzato (distance/fallback near) pianificato per milestone M3.
