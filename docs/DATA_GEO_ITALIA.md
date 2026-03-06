# DATA_GEO_ITALIA.md

Riferimento operativo per dataset geografico italiano usato da API, seed e ricerca.

## Snapshot canonica nel repo

File:

- `apps/api/data/geography/istat-current.json`

Metadata correnti della snapshot (da file):

- dataset comuni: `CODICI al 21_02_2026`
- reference date: `2026-02-21`
- synced at: `2026-03-04T10:51:46.359Z`
- boundary year centroidi: `2026`

## Fonte dati

Anagrafica amministrativa:

- ISTAT `Elenco-comuni-italiani.xlsx`
- `https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx`

Confini/centroidi:

- `https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip`

## Copertura snapshot corrente

- regioni: `20`
- province/unita sovracomunali: `110`
- comuni: `7894`
- centroidi presenti: `regions=20`, `provinces=110`, `comuni=7893`
- comuni senza centroide: `1`

## Aggiornamento snapshot

Comando:

```bash
pnpm geo:sync
```

Effetto:

- scarica e normalizza dataset ISTAT
- arricchisce centroidi da boundary disponibile
- rigenera `istat-current.json`

## Seed database

Comando:

```bash
pnpm db:seed
```

Effetti principali:

- upsert idempotente di `regions`, `provinces`, `comuni`
- valorizzazione `centroid_lat`/`centroid_lng`
- popolamento `geom` comuni quando il centroide esiste
- generazione listing demo multi-area

## Mapping essenziale colonne -> DB

- `Codice Regione` -> `regions.istat_code`
- `Denominazione Regione` -> `regions.name`
- `Codice dell'Unita territoriale sovracomunale` -> `provinces.istat_code`
- `Denominazione dell'Unita territoriale sovracomunale` -> `provinces.name`
- `Sigla automobilistica` -> `provinces.sigla`
- `Codice Comune formato numerico` -> `comuni.istat_code`
- `Codice Comune numerico con 107 Province (dal 2017 al 2025)` -> `legacyIstatCode107`
- `Denominazione in italiano` -> `comuni.name`
- `Codice Catastale del Comune` -> `comuni.code_catastale`

## Verifica rapida post-seed

```sql
SELECT
  (SELECT COUNT(*) FROM regions) AS regions_total,
  (SELECT COUNT(*) FROM provinces) AS provinces_total,
  (SELECT COUNT(*) FROM comuni) AS comuni_total,
  (SELECT COUNT(*) FROM comuni WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS comuni_with_centroid;
```

Output atteso con snapshot corrente:

- `regions_total = 20`
- `provinces_total = 110`
- `comuni_total = 7894`
- `comuni_with_centroid = 7893`

## Note operative

- questo dataset e prerequisito per search distance-aware
- se cambiano conteggi ISTAT, aggiornare test e doc nello stesso change
- non hardcodare numeri storici: usare sempre i valori presenti in `istat-current.json`
