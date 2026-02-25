# CHANGE REQUEST CR-001 - Location Search Semantico

- Progetto: `adottaungatto-it`
- Data richiesta: `2026-02-25`
- Stato: `approved`
- Priorita: `P0-core`
- Ambito: `web`, `admin`, `api`, `sdk`, `docs`

## 1) Contesto e problema

L'attuale selezione luogo a cascata (regione -> provincia -> comune) non e sufficiente per una UX premium:

- e lenta su mobile
- richiede troppi click
- non chiarisce subito l'intento di ricerca geografica
- non consente pattern naturali tipo "Torino e provincia" da input testuale

## 2) Obiettivo del cambiamento

Introdurre un unico input testuale intelligente con suggerimenti semantici espliciti per tipo area:

- `Regione` (es. `Piemonte - Regione`)
- `Provincia` (es. `Torino (TO) - Provincia`)
- `Comune` (es. `Chieri (TO) - Comune`)
- `Comune + provincia` (es. `Torino e provincia (TO)`)
- `Tutta Italia`

L'utente deve capire sempre cosa sta selezionando.

## 3) Decisione funzionale

Il sistema deve adottare il concetto di `LocationIntent` come contratto unico tra UI e API.

`LocationIntent` minimo:

- `scope`: `italy | region | province | comune | comune_plus_province`
- `regionId` opzionale
- `provinceId` opzionale
- `comuneId` opzionale
- `label` (testo UI)
- `secondaryLabel` (meta contestuale, es. sigla provincia/regione)

## 4) Impatto API

### Endpoint geography

- `GET /v1/geography/search?q=...`
  - evolve da autocomplete generico a suggerimenti semantici ordinati.
  - ogni item deve includere:
    - tipo suggestion (`region`, `province`, `comune`, `comune_plus_province`, `italy`)
    - label chiara
    - metadati (sigla provincia, nome regione, ids amministrativi)
    - payload `locationIntent` pronto per query listings

### Compatibilita

- Gli endpoint esistenti:
  - `GET /v1/geography/regions`
  - `GET /v1/geography/provinces`
  - `GET /v1/geography/comuni`
  restano disponibili per retrocompatibilita e fallback tecnico.

## 5) Impatto UI/UX

- Sostituire il selettore a 3 select con:
  - input text/search
  - lista suggerimenti con sezioni e badge tipo area
  - supporto tastiera (`ArrowUp/Down`, `Enter`, `Esc`)
  - stato loading, empty, error, retry
  - selected state con chip/pill chiara
- Per i comuni mostrare sempre sigla provincia: esempio `Chieri (TO)`.
- Per ambiguita mostrare contesto: esempio `Torino (TO) - Comune`, `Torino e provincia (TO)`.

## 6) Impatto ricerca annunci

Tutta la ricerca listings deve accettare `LocationIntent` come input canonico.

La logica fallback anti zero risultati rimane invariata nell'ordine:

1. comune
2. provincia del comune
3. vicinanza
4. regione
5. italia

ma deve partire dal `scope` selezionato dall'utente.

## 7) Impatto milestone

- M1.7 viene ridefinita come:
  - "UI Location Search semantico (input + suggerimenti), non sola cascata select".
- M3 deve riusare lo stesso `LocationIntent` nei filtri search/listings.
- Aggiungere test e2e specifici su disambiguazione:
  - query `Torino` -> mostra almeno `Torino (TO) - Comune` e `Torino e provincia (TO)`.
  - query `Piemonte` -> mostra opzione regione.

## 8) Criteri di accettazione CR-001

- UI location picker testuale funzionante in locale su `web`.
- Suggestion chiare per livello area con sigla provincia nei comuni.
- API geography search restituisce payload semantico con `locationIntent`.
- Contratto location riusato dai flussi listings/search (predisposizione M2/M3).
- Lint, typecheck, test pertinenti passanti.
- Documentazione aggiornata (`SRS`, `MILESTONES`, setup/testing).

## 9) Piano di adozione

1. Aggiornare documenti baseline (`SRS`, `MILESTONES`) - questo task.
2. Implementare API suggestion semantica.
3. Sostituire componente UI location con input search.
4. Aggiornare wiring form/listings per usare `LocationIntent`.
5. Estendere test e2e.
