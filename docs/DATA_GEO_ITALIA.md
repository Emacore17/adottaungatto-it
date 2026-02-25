# DATA_GEO_ITALIA.md

Documento operativo per il dataset geografico italiano usato in locale.

## Fonti dati ufficiali

- Fonte anagrafica amministrativa: ISTAT
- Dataset: `Elenco-comuni-italiani.xlsx`
- URL: `https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx`
- Snapshot locale corrente: sheet `CODICI al 31_01_2026`
- Data di riferimento snapshot corrente: `2026-01-31`

- Fonte geometrie/centroidi: ISTAT confini amministrativi generalizzati
- URL base: `https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati`
- Boundary snapshot usato attualmente: `Limiti01012025_g.zip` (fallback automatico perche `2026` non disponibile al momento)

## Snapshot locale versionata

Per garantire setup locale offline-friendly, il repo include:
- `apps/api/data/geography/istat-current.json`

Aggiornamento snapshot:
```bash
pnpm geo:sync
```

Il comando:
- scarica il file ISTAT ufficiale anagrafico
- normalizza e valida regioni/province/comuni
- arricchisce i comuni con centroidi dal boundary dataset ISTAT
- mappa le variazioni codice 2026 tramite `legacyIstatCode107` (es. riassetto Sardegna)
- deriva i centroidi di province e regioni aggregando i centroidi dei comuni
- rigenera `istat-current.json` con metadata (`source`, `centroids`, `stats`, arrays seed)

## Copertura dataset corrente

- Regioni: `20`
- Unita sovracomunali (province/citta metropolitane/liberi consorzi): `110`
- Comuni: `7895`
- Copertura centroidi: `regions=20`, `provinces=110`, `comuni=7895`
- Match centroidi comuni:
  - `exact=7518` (codice attuale)
  - `legacy=377` (mapping da codice storico 107 province)
  - `missing=0`

## Mapping DB

Tabelle target:
- `regions`
- `provinces`
- `comuni`

Mapping campi principale (`apps/api/scripts/geo-sync-istat.ts`):
- `Codice Regione` -> `regions.istat_code`
- `Denominazione Regione` -> `regions.name`
- `Codice dell'Unita territoriale sovracomunale` -> `provinces.istat_code`
- `Denominazione dell'Unita territoriale sovracomunale` -> `provinces.name`
- `Sigla automobilistica` -> `provinces.sigla`
- `Codice Comune formato numerico` -> `comuni.istat_code`
- `Codice Comune numerico con 107 Province (dal 2017 al 2025)` -> `comuni.legacyIstatCode107` (snapshot)
- `Denominazione in italiano` -> `comuni.name`
- `Codice Catastale del Comune` -> `comuni.code_catastale`
- centroidi da confini ISTAT -> `centroid_lat`, `centroid_lng` (regioni/province/comuni)

## Seed DB (M1.5 + M3.5)

Comando:
```bash
pnpm db:seed
```

Comportamento:
- carica snapshot locale `istat-current.json`
- esegue upsert idempotente su regioni/province/comuni
- popola `centroid_lat` e `centroid_lng` su tutte le entita geografiche
- popola `geom` (POINT) sui comuni quando il centroide e disponibile
- gestisce codici obsoleti con pruning controllato
- riallinea la gerarchia in caso di variazioni amministrative (es. Sardegna 2026)

## Verifica rapida post-seed

Query attese:
- `regions=20`
- `provinces=110`
- `comuni=7895`
- `centroid_lat/lng` non null per tutte le righe geografiche

Esempio verifica SQL:
```sql
SELECT
  (SELECT COUNT(*) FROM regions WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS regions_with_centroids,
  (SELECT COUNT(*) FROM provinces WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS provinces_with_centroids,
  (SELECT COUNT(*) FROM comuni WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS comuni_with_centroids;
```

Sardegna (riassetto amministrativo dal `2026-01-01`):
- codici provincia/sovracomunale attesi: `113,114,115,116,117,119,312,318`

## Limiti noti

- Il boundary dataset ISTAT puo essere pubblicato con ritardo rispetto al file anagrafico.
- `geo:sync` usa fallback automatico all'anno precedente disponibile, mantenendo comunque i codici amministrativi aggiornati dal dataset ISTAT anagrafico.
