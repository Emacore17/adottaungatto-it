Ho visto tutto. Ecco l'analisi completa dei problemi grafici con le correzioni precise:

***

## Problemi grafici e correzioni puntuali

***

### PROBLEMA 1 — Il titolo è scollegato dall'intestazione destra
**Cosa succede:** Il titolo `h1` sta nella colonna sinistra da solo, mentre i badge (Adozione, Imola) e la data stanno nella colonna destra. Visivamente sembrano due blocchi separati e scoordinati. [localhost](http://localhost:3000/annunci/51)

**Correzione:** Sposta il titolo `h1`, il badge cuore e la descrizione breve **dentro la colonna destra**, sopra i badge tipo/luogo. La colonna sinistra deve contenere **solo la galleria**. Il layout diventa:

```
┌──────────────────┬─────────────────────────────────┐
│                  │  [Dettaglio annuncio]             │
│   FOTO GRANDE    │  Titolo h1                ♡      │
│                  │  Badge tipo · Badge luogo         │
│   thumbnail      │  Pubblicato: 09 feb 2026          │
│                  │  ─────────────────────────        │
│                  │  Contatti e navigazione           │
└──────────────────┴─────────────────────────────────┘
│  Descrizione + scheda info (full width sotto)       │
```

***

### PROBLEMA 2 — Il bottone cuore ♡ è fluttuante e isolato
**Cosa succede:** Il cuore è da solo su una riga vuota sotto il titolo, sembra abbandonato. [localhost](http://localhost:3000/annunci/51)

**Correzione:** Metti il cuore **in linea con il titolo**, allineato a destra con `flex justify-between items-start`. Il titolo occupa la parte sinistra, il cuore è un bottone icona in alto a destra dello stesso contenitore.

***

### PROBLEMA 3 — La descrizione breve appare due volte
**Cosa succede:** Il testo *"Micia dolce disponibile in Imola..."* compare sia sotto il titolo (in alto, colonna sinistra) **sia** dentro la card Descrizione in basso. È duplicato.

**Correzione:** Rimuovi la descrizione breve che sta sopra la galleria. Lascia **solo** quella dentro la card Descrizione.

***

### PROBLEMA 4 — La galleria è sotto la descrizione invece che sopra
**Cosa succede:** L'ordine attuale è: titolo → testo descrittivo → foto → thumbnail → card descrizione. La foto viene vista solo scrollando. [localhost](http://localhost:3000/annunci/51)

**Correzione:** La galleria (foto grande + thumbnail) deve essere il **primo elemento** della colonna sinistra, immediatamente sotto la navbar/searchbar, senza nulla sopra di essa.

***

### PROBLEMA 5 — La thumbnail è troppo piccola e senza stile
**Cosa succede:** La thumbnail è un quadratino 60x60px grezzo, senza bordo attivo, senza padding, senza stato hover/selected. [localhost](http://localhost:3000/annunci/51)

**Correzione:**
- Dimensione: `80x80px` con `rounded-xl object-cover`
- Bordo sottile di default: `border-2 border-transparent`
- Bordo attivo (foto selezionata): `border-2 border-[colore primario del sito]`
- `cursor-pointer` e transizione hover `opacity-80`

***

### PROBLEMA 6 — "Media collegate: 1." è testo grezzo visibile
**Cosa succede:** In fondo alla card descrizione appare la stringa di debug `Media collegate: 1.`. [localhost](http://localhost:3000/annunci/51)

**Correzione:** Rimuovi completamente questa riga. È un residuo di placeholder.

***

### PROBLEMA 7 — La card Descrizione contiene troppo: descrizione + scheda info insieme
**Cosa succede:** Dentro la stessa card bianca ci sono il testo descrittivo, le 4 card (Razza, Sesso, Età, Prezzo) e il testo media collegate. È una card unica che fa tutto, risulta affollata.

**Correzione:** Separa in **due card distinte** a full width sotto la galleria:
1. **Card "Descrizione"** — solo il testo descrittivo
2. **Card "Il gatto"** (o "Scheda")  — griglia 2x2 con Razza / Sesso / Età / Prezzo

Aggiungi `gap-4` tra le due card.

***

### PROBLEMA 8 — La colonna destra (Contatti) è troppo vuota nella metà inferiore
**Cosa succede:** Dopo il bottone "Torna alla lista" la colonna destra finisce e resta uno spazio bianco enorme mentre la colonna sinistra continua con galleria e descrizione. [localhost](http://localhost:3000/annunci/51)

**Correzione:** Aggiungi `sticky top-4` alla colonna destra in modo che il box Contatti segua lo scroll dell'utente e rimanga sempre visibile. Classe da aggiungere al wrapper della colonna destra: `lg:sticky lg:top-4 lg:self-start`.

***

### RIEPILOGO ORDINE FINALE DEGLI ELEMENTI

**Colonna sinistra (2/3 larghezza):**
1. Galleria foto (foto grande + thumbnail)
2. Card "Descrizione" (solo testo)
3. Card "Scheda" (Razza, Sesso, Età, Prezzo)

**Colonna destra (1/3 larghezza, sticky):**
1. Label "Dettaglio annuncio"
2. Titolo `h1` + bottone ♡ inline
3. Badge tipo (colorato) + Badge luogo
4. Data pubblicazione
5. Separatore
6. Card "Contatti e navigazione"
7. Bottone "Torna alla lista"