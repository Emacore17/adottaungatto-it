# DATA_GEO_ITALIA.md

Documento operativo per il dataset geografico italiano usato dall'API e dai seed locali.

## Fonte dati

Anagrafica amministrativa:

- ISTAT `Elenco-comuni-italiani.xlsx`
- URL: `https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx`
- snapshot attuale nel repo: riferimento `2026-01-31`

Geometrie e centroidi:

- confini amministrativi generalizzati ISTAT
- URL base: `https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati`
- boundary snapshot usato attualmente: fallback `2025` perche il boundary `2026` non era disponibile al momento dell'ultimo sync

## Snapshot versionata nel repo

File:

- `apps/api/data/geography/istat-current.json`

Scopo:

- rendere il setup locale ripetibile
- evitare dipendenze runtime da download esterni durante `db:seed`
- mantenere storicita minima di metadata e conteggi

## Aggiornamento snapshot

Comando:

```bash
pnpm geo:sync
```

Lo script:

- scarica il file ISTAT ufficiale
- normalizza regioni, province e comuni
- arricchisce i comuni con centroidi
- deriva centroidi di province e regioni
- rigenera `istat-current.json`

## Copertura attesa

- regioni: `20`
- province/unita sovracomunali: `110`
- comuni: `7895`
- centroidi completi: `regions=20`, `provinces=110`, `comuni=7895`

## Seed database

Comando:

```bash
pnpm db:seed
```

Effetti:

- upsert idempotente di `regions`, `provinces`, `comuni`
- valorizzazione di `centroid_lat` e `centroid_lng`
- popolamento `geom` sui comuni quando il centroide e disponibile
- riallineamento controllato di codici obsoleti
- generazione demo listings multi-area

## Mapping essenziale

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

SQL utile:

```sql
SELECT
  (SELECT COUNT(*) FROM regions WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS regions_with_centroids,
  (SELECT COUNT(*) FROM provinces WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS provinces_with_centroids,
  (SELECT COUNT(*) FROM comuni WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL) AS comuni_with_centroids;
```

Output atteso:

- `regions_with_centroids = 20`
- `provinces_with_centroids = 110`
- `comuni_with_centroids = 7895`

## Note importanti

- il dataset geografico e un prerequisito della ricerca distance-aware
- se il boundary ISTAT dell'anno corrente non esiste ancora, il sync usa il miglior fallback disponibile
- ogni aggiornamento significativo di `istat-current.json` richiede attenzione su test di search e seed demo
