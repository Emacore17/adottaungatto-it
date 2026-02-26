# BACKUP_RESTORE_DRILL.md

Runbook operativo per policy backup DB e restore drill (M6.5).

## Obiettivo

- avere backup ripristinabili del database
- dimostrare periodicamente che il restore funziona
- conservare evidenze verificabili per audit tecnico

## Scope

- database Postgres (`adottaungatto`)
- ambiente locale (drill tecnico) e staging (processo equivalente)

## Policy minima consigliata

- backup pre-release obbligatorio prima di deploy staging/prod
- backup giornaliero completo con retention minima 14 giorni
- restore drill almeno settimanale in staging (almeno mensile in locale)
- checksum del file backup obbligatorio
- evidenze archiviate: timestamp, release, esito, owner

## Prerequisiti

- container Postgres attivo: `adottaungatto-postgres`
- spazio disco sufficiente per dump + restore drill
- credenziali DB valide (`POSTGRES_USER`, `POSTGRES_DB`)

## Backup pre-release (PowerShell)

```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "backups"
$backupFile = Join-Path $backupDir "adottaungatto-$timestamp.dump"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

docker exec adottaungatto-postgres pg_dump -U adottaungatto -d adottaungatto -Fc > $backupFile

Get-FileHash $backupFile -Algorithm SHA256
```

Output atteso:
- file `.dump` creato in `backups/`
- hash SHA256 disponibile

## Restore drill (PowerShell)

Il drill ripristina il dump in un database shadow e verifica le tabelle core.

```powershell
$backupFile = "backups/adottaungatto-YYYYMMDD-HHMMSS.dump"
$tmpFileInContainer = "/tmp/restore-drill.dump"
$shadowDb = "adottaungatto_restore_drill"

docker cp $backupFile "adottaungatto-postgres:$tmpFileInContainer"

docker exec adottaungatto-postgres psql -U adottaungatto -d postgres -c "DROP DATABASE IF EXISTS $shadowDb;"
docker exec adottaungatto-postgres psql -U adottaungatto -d postgres -c "CREATE DATABASE $shadowDb;"

docker exec adottaungatto-postgres pg_restore -U adottaungatto -d $shadowDb --clean --if-exists $tmpFileInContainer

docker exec adottaungatto-postgres psql -U adottaungatto -d $shadowDb -c "SELECT COUNT(*) AS users_count FROM app_users;"
docker exec adottaungatto-postgres psql -U adottaungatto -d $shadowDb -c "SELECT COUNT(*) AS listings_count FROM listings;"
docker exec adottaungatto-postgres psql -U adottaungatto -d $shadowDb -c "SELECT COUNT(*) AS comuni_count FROM comuni;"

docker exec adottaungatto-postgres psql -U adottaungatto -d postgres -c "DROP DATABASE IF EXISTS $shadowDb;"
docker exec adottaungatto-postgres rm -f $tmpFileInContainer
```

Output atteso:
- restore completato senza errori
- query di validazione eseguite con conteggi coerenti
- database shadow eliminato a fine drill

## Criteri pass/fail drill

Pass:
- restore completo senza errori
- tabelle core presenti (`app_users`, `listings`, `comuni`)
- query di validazione riuscite

Fail:
- dump non importabile
- schema incompleto dopo restore
- query core in errore

## Azioni in caso di fail

1. bloccare deploy successivi fino a chiarimento
2. aprire incidente tecnico (`SEV2` minimo)
3. rigenerare backup e ripetere restore drill
4. aggiornare runbook con root cause e correzioni

## Evidenze da registrare

- data/ora drill
- `RELEASE_SHA` / `RELEASE_TAG` (se legato a deploy)
- nome backup file + SHA256
- esito (`PASS`/`FAIL`)
- owner operativo
- link ticket incidente (se `FAIL`)
