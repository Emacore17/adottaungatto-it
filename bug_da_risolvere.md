# Bug Report — adottaungatto.it

**Data analisi:** 08/03/2026  
**Tester:** Analisi automatica completa (utente: utente.demo / demo1234)  
**Pagine analizzate:** Home, Annunci, Annuncio dettaglio, Pubblica, Account, I miei annunci, Messaggi, Preferiti, Impostazioni, Modifica annuncio, Privacy, Termini, Contatti, FAQ, 404  

---

## BUG 01 — Skeleton loading prolungato su tutte le pagine

**Pagine:** Tutte (/, /annunci, /annunci/:id, /privacy, /termini, /contatti, /faq, /account, /account/annunci, /account/impostazioni, /preferiti, /messaggi, /pubblica)  
**Descrizione:** Al caricamento di ogni pagina, il contenuto principale non è visibile per 2–4 secondi: la pagina appare completamente bianca o con contenuto al 20% di opacità (skeleton). L'utente vede una pagina vuota prima che i dati vengano renderizzati.  
**Comportamento atteso:** Il contenuto dovrebbe essere visibile immediatamente tramite SSR (Server-Side Rendering) o SSG (Static Site Generation), oppure mostrare un skeleton esplicito e riconoscibile invece di una pagina bianca.  
**Da correggere:** Convertire le pagine da Client-Side Rendering a SSR/SSG con Next.js (`getServerSideProps` / `generateStaticParams`), oppure implementare un skeleton loader visualmente coerente invece di ridurre l'opacità dei contenuti reali.

---

## BUG 02 — Titolo del tab del browser errato su pagine footer e 404 generica

**Pagine:** /privacy, /termini, /contatti, /faq, /pagina-inesistente (404 generica)  
**Descrizione:** Il `<title>` della pagina mostrato nella tab del browser è sempre `"adottaungatto-it"` invece di contenere il nome specifico della pagina.  
**Comportamento atteso:**
- `/privacy` → `"Privacy | adottaungatto-it"`  
- `/termini` → `"Termini d'uso | adottaungatto-it"`  
- `/contatti` → `"Contatti | adottaungatto-it"`  
- `/faq` → `"FAQ | adottaungatto-it"`  
- 404 generica → `"404 – Pagina non trovata | adottaungatto-it"`  
**Da correggere:** Aggiungere il metadata `title` corretto in ciascuna pagina tramite `export const metadata = { title: '...' }` in Next.js App Router.

---

## BUG 03 — Filtri nella sidebar /annunci non funzionano

**Pagina:** /annunci  
**Descrizione:** Selezionando un filtro dalla sidebar (es. TIPOLOGIA = "Adozione") e cliccando "Applica filtri", i risultati **non cambiano** e mostrano ancora tutti i 24 annunci inclusi quelli di tipologia diversa (es. "Stallo"). Anche l'URL non viene aggiornato con i parametri di ricerca.  
**Comportamento atteso:** Cliccando "Applica filtri" l'URL dovrebbe aggiornarsi (es. `/annunci?tipologia=adozione`) e i risultati dovrebbero essere filtrati correttamente.  
**Da correggere:** Il form dei filtri deve navigare aggiornando i query params nell'URL. Il componente deve leggere i `searchParams` dalla URL e passarli alla query API/backend.

---

## BUG 04 — I filtri nella sidebar non si pre-popolano dai query params URL

**Pagina:** /annunci  
**Descrizione:** Visitando `/annunci?cerca=gatto&tipologia=adozione&sesso=maschio` direttamente, i controlli della sidebar (dropdown TIPOLOGIA, SESSO, campo CERCA) non rispecchiano i valori presenti nell'URL. Visivamente i filtri appaiono tutti azzerati anche se l'URL contiene parametri.  
**Comportamento atteso:** I filtri della sidebar devono essere inizializzati dai query params presenti nell'URL al momento del caricamento della pagina.  
**Da correggere:** Al mount del componente filtri, leggere i `searchParams` e impostare i valori nei relativi `useState` / form controls.

---

## BUG 05 — Homepage: il carosello "In evidenza" mostra slide duplicate

**Pagina:** /  
**Descrizione:** Il carosello degli annunci in evidenza mostra gli stessi 3 annunci due volte (6 slide totali per 3 annunci reali). I punti di navigazione inferiori mostrano 6 dot ma in realtà i contenuti si ripetono ogni 3 slide.  
**Comportamento atteso:** Ogni annuncio deve apparire una sola volta nel carosello. Se il numero di annunci è inferiore alle slide previste, il carosello non deve duplicare il contenuto.  
**Da correggere:** Rimuovere la duplicazione nel rendering delle slide del carosello (probabile doppio `.map()` o `slides.concat(slides)` nel codice).

---

## BUG 06 — Homepage: sezione "Vicino a te" non richiede la geolocalizzazione

**Pagina:** /  
**Descrizione:** La sezione "Annunci più vicini a te" mostra solo il messaggio "Sto preparando gli annunci più vicini..." senza mai richiedere il permesso di geolocalizzazione all'utente, né mostrare un pulsante per attivarlo.  
**Comportamento atteso:** La sezione dovrebbe mostrare un pulsante "Usa la mia posizione" che, al click, richiede il permesso di geolocalizzazione. Se il permesso viene negato, deve mostrare un messaggio esplicativo. In alternativa, non mostrare affatto questa sezione se la geolocalizzazione non è supportata.  
**Da correggere:** Aggiungere un trigger esplicito per richiedere `navigator.geolocation.getCurrentPosition()` solo su azione dell'utente, non in modo automatico/silenzioso.

---

## BUG 07 — Pagina dettaglio annuncio: RAZZA mostra "Non specificata" invece di "Non di razza"

**Pagina:** /annunci/33 (e probabilmente altri annunci con razza = "Non di razza")  
**Descrizione:** Nel dettaglio dell'annuncio, il campo RAZZA mostra "Non specificata" mentre nella lista annunci lo stesso annuncio mostra "Non di razza". La denominazione è incoerente tra le due visualizzazioni.  
**Comportamento atteso:** Il valore della razza deve essere consistente ovunque nel sito. Se il valore salvato è "Non di razza / non specificata", dovrebbe essere visualizzato uniformemente.  
**Da correggere:** Unificare la logica di formattazione del campo razza. Definire un mapping centralizzato (es. `formatRazza(value)`) usato sia nella card lista che nella pagina dettaglio.

---

## BUG 08 — Pagina dettaglio annuncio: mancano le card STERILIZZATO, VACCINATO, MICROCHIP, COMPATIBILE BAMBINI, COMPATIBILE ANIMALI

**Pagina:** /annunci/:id  
**Descrizione:** Nel dettaglio dell'annuncio (es. /annunci/33), la sidebar informazioni mostra solo: PREZZO, NUMERO GATTI, RAZZA, SESSO, ETÀ. I campi STERILIZZATO, VACCINATO, MICROCHIP, COMPATIBILE CON BAMBINI, COMPATIBILE CON ALTRI ANIMALI sono completamente assenti dall'interfaccia pubblica.  
**Comportamento atteso:** Tutti i campi compilati dell'annuncio dovrebbero essere visibili nella pagina di dettaglio. Se il campo è "Non specificato" si può omettere, ma se ha un valore (Sì/No) deve essere mostrato.  
**Da correggere:** Aggiungere le card informative mancanti nel componente della sidebar del dettaglio annuncio. Mostrare il campo solo se il valore non è "Non specificato".

---

## BUG 09 — Pagina dettaglio annuncio: il modulo chat è visibile al proprietario dell'annuncio

**Pagina:** /annunci/33 (annuncio dell'utente loggato)  
**Descrizione:** Quando l'utente visualizza il proprio annuncio, la sezione "Contatta l'inserzionista in chat" con il campo di testo e il pulsante "Invia messaggio" è comunque visibile e interattiva. Il blocco dell'invio avviene solo lato server (errore "Non puoi avviare una conversazione sul tuo stesso annuncio"), ma la UI permette di digitare e tentare l'invio.  
**Comportamento atteso:** Se l'utente è il proprietario dell'annuncio, la sezione chat deve essere sostituita con un blocco "Gestisci annuncio" contenente link a Modifica e link a I miei annunci.  
**Da correggere:** Nel componente del dettaglio annuncio, confrontare `listing.owner_id` con l'`userId` della sessione corrente. Se coincidono, nascondere il form chat e mostrare i controlli di gestione.

---

## BUG 10 — Icona del toggle tema chiaro/scuro non rappresenta lo stato corrente

**Pagine:** Tutte (navbar)  
**Descrizione:** Il bottone per cambiare tema (chiaro/scuro) nella navbar mostra sempre un piccolo cerchio "o" come icona, indipendentemente dal tema attivo. L'icona non cambia tra sole (☀️) e luna (🌙) al toggle del tema.  
**Comportamento atteso:** In modalità chiara il bottone deve mostrare un'icona luna (per passare al tema scuro). In modalità scura deve mostrare un'icona sole (per tornare al tema chiaro). L'icona deve essere visivamente riconoscibile.  
**Da correggere:** Verificare che il componente Lucide/React-icons corretto sia importato. L'icona probabilmente non viene renderizzata perché il font delle icone non è caricato o il componente non viene trovato. Assicurarsi che `SunIcon` / `MoonIcon` siano correttamente importati e che il rendering condizionale funzioni.

---

## BUG 11 — Pagina 404 generica priva di link di navigazione

**Pagina:** Qualsiasi URL inesistente (es. /pagina-che-non-esiste)  
**Descrizione:** La pagina 404 generica (per rotte non esistenti del sito) mostra solo il testo "404 – Pagina non trovata" senza alcun link o bottone per tornare alla home o agli annunci.  
**Comportamento atteso:** La pagina 404 deve includere almeno due CTA: "Torna alla home" e "Vai agli annunci" (come correttamente implementato nella 404 specifica per annunci non trovati).  
**Da correggere:** Aggiungere i bottoni di navigazione nel componente `not-found.tsx` globale (la 404 per annunci non trovati funziona già correttamente — usarla come riferimento).

---

## BUG 12 — Il form di login non mostra i campi username/password direttamente

**Pagina:** /login  
**Descrizione:** La pagina di login non mostra un form con i campi username e password. Mostra solo un link "Continua con account" che redirige a Keycloak (Identity Provider esterno). L'utente non sa che deve inserire le credenziali su un dominio diverso (`localhost:8080`).  
**Comportamento atteso:** La pagina di login dovrebbe spiegare chiaramente il flusso di autenticazione, specificare che si verrà reindirizzati a una pagina esterna, oppure (preferibilmente) incorporare il form di login Keycloak nella pagina stessa tramite OIDC implicit grant.  
**Da correggere:** Aggiungere una descrizione informativa sul redirect a Keycloak nella pagina `/login`. In alternativa, valutare l'embedding del form Keycloak tramite Keycloak JS Adapter per un'esperienza seamless.

---

## BUG 13 — Pagina /account/annunci: "I miei annunci" conta 2 ma mostra il conteggio nella dashboard in modo non aggiornato

**Pagina:** /account  
**Descrizione:** La card "Annunci" nella dashboard account mostra il numero 2. Se un annuncio viene eliminato o aggiunto, questo numero potrebbe non aggiornarsi in tempo reale senza reload della pagina.  
**Comportamento atteso:** Il conteggio degli annunci deve essere sempre sincronizzato con i dati reali.  
**Da correggere:** Il dato del conteggio deve essere fetchato dinamicamente con SWR o `revalidatePath` di Next.js ogni volta che cambia il numero di annunci.

---

## BUG 14 — Form modifica annuncio: TIPOLOGIA mostra valore errato (Adozione) invece di Stallo per annuncio #33

**Pagina:** /annunci/33/modifica  
**Descrizione:** Il form di modifica dell'annuncio #33 ha TIPOLOGIA impostata su "Adozione", ma nella lista e nel dettaglio pubblico l'annuncio mostra il badge "Stallo". C'è un disallineamento tra il dato salvato nel DB e quello mostrato nel form di modifica.  
**Comportamento atteso:** Il form di modifica deve pre-popolare TIPOLOGIA con il valore effettivamente salvato nel database ("Stallo").  
**Da correggere:** Verificare che il fetch dei dati dell'annuncio nel form di modifica recuperi il campo `tipo` corretto e che il mapping tra il valore API e le opzioni del select sia consistente.

---

## BUG 15 — Impostazioni account: toggle "Informativa privacy" e "Termini" OBBLIGATORI appaiono come toggle interattivi

**Pagina:** /account/impostazioni  
**Descrizione:** I consensi obbligatori (Informativa privacy e Termini di servizio) vengono visualizzati come toggle/checkbox con aspetto identico al consenso opzionale "Comunicazioni marketing", ma sono disabilitati. Questo può confondere l'utente che potrebbe tentare di disattivarli senza capire perché non rispondono al click.  
**Comportamento atteso:** I consensi obbligatori devono essere visivamente distinti da quelli facoltativi. Dovrebbero essere mostrati come badge/etichette statiche "Attivo e obbligatorio" senza il componente toggle interattivo.  
**Da correggere:** Sostituire il toggle `disabled` per i consensi obbligatori con un elemento statico (es. badge verde "Attivo") che non suggerisca interattività.

---
