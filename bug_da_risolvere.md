BUG REPORT — adottaungatto.it
Analisi completa e step di correzione
Data: 07 marzo 2026 | Tester: Analisi automatizzata

RIEPILOGO ESECUTIVO

Sono state analizzate tutte le pagine e funzionalita raggiungibili del sito adottaungatto.it, sia come utente anonimo che come utente autenticato (utente.demo / demo1234). Di seguito sono elencati tutti i bug, le anomalie e i miglioramenti necessari, organizzati per area e priorita.

Pagine testate:
- / (Homepage)
- /annunci (Catalogo)
- /annunci/[id] (Dettaglio annuncio)
- /annunci/[id]/modifica (Modifica annuncio)
- /pubblica (Nuovo annuncio)
- /login
- /account (Dashboard utente)
- /account/annunci (I miei annunci)
- /account/annunci/[id] (Dettaglio personale)
- /messaggi (Chat/Inbox)
- /preferiti (Preferiti)
- /account/impostazioni (Impostazioni)
- /privacy, /termini, /contatti, /faq (Footer pages)
- /annunci/9999 (Test 404)

====================================================
STEP 1 - BUG CRITICI (Alta Priorita)
====================================================

[BUG-01] PAGINA MODIFICA ANNUNCIO: REDIRECT ERRATO AL PRIMO CLIC
Pagina: /account/annunci/[id] -> bottone "Modifica annuncio"
Comportamento atteso: Click su "Modifica annuncio" dovrebbe navigare a /annunci/[id]/modifica
Comportamento riscontrato: Al primo clic, la pagina carica brevemente /annunci/[id]/modifica poi redireziona automaticamente a /account. L'utente deve navigare direttamente via URL per accedere all'editor.
Riproduzione: Login -> Account -> I miei annunci -> Apri dettaglio -> Modifica annuncio
Fix: Rimuovere il redirect indesiderato in /annunci/[id]/modifica. Verificare la logica di autenticazione/redirect nella pagina di modifica che causa il ritorno a /account.

[BUG-02] MESSAGGIO DI ERRORE IN INGLESE NELLA CHAT
Pagina: /annunci/[id] (dettaglio annuncio del proprio annuncio)
Comportamento atteso: Tutti i messaggi di errore devono essere in italiano
Comportamento riscontrato: Quando un utente tenta di inviare un messaggio al proprio annuncio, appare il toast "You cannot start a conversation on your own listing." in inglese invece che in italiano.
Fix: Tradurre il messaggio in italiano: "Non puoi avviare una conversazione sul tuo stesso annuncio."

[BUG-03] ANNUNCIO IN ATTESA DI REVISIONE NON ACCESSIBILE DALL'ANTEPRIMA
Pagina: /annunci/93/modifica -> bottone "Anteprima pubblica"
Comportamento atteso: Il proprietario dell'annuncio dovrebbe poter vedere un'anteprima del proprio annuncio anche se in stato "In attesa di revisione"
Comportamento riscontrato: Navigando a /annunci/93 (annuncio in attesa di revisione) si ottiene una pagina 404. Il link "Anteprima pubblica" nell'editor porta quindi a un 404.
Fix: Permettere al proprietario autenticato di accedere all'anteprima del proprio annuncio in qualsiasi stato. Oppure sostituire "Anteprima pubblica" con "Anteprima (non pubblicata)" e mostrare una versione preview riservata al proprietario.

[BUG-04] FOTO DELL'ANNUNCIO: DISCREPANZA TRA LISTA E DETTAGLIO
Pagina: /annunci (lista) vs /annunci/33 (dettaglio)
Comportamento atteso: Se un annuncio ha una foto, deve essere visibile sia nella lista che nel dettaglio
Comportamento riscontrato: L'annuncio #33 (TEST adweq) mostra una foto di copertina nella lista degli annunci, ma nella pagina di dettaglio mostra "Nessuna foto disponibile".
Fix: Verificare che il campo immagine di copertina venga correttamente letto e visualizzato nella pagina di dettaglio. Potrebbe essere un problema di mapping del campo cover o di caricamento delle foto nell'API del dettaglio.

====================================================
STEP 2 - BUG MEDI (Media Priorita)
====================================================

[BUG-05] CARICAMENTO LENTO DELLE PAGINE (BLANK SCREEN)
Pagine: Tutte le pagine dell'applicazione
Comportamento atteso: Le pagine dovrebbero caricarsi con uno skeleton/loading state visibile e poi mostrare il contenuto
Comportamento riscontrato: Molte pagine mostrano uno schermo completamente bianco per 2-3 secondi prima di renderizzare il contenuto. Non e presente un indicatore di caricamento o skeleton coerente durante la fase di idratazione SSR.
Pagine colpite: /account, /messaggi, /preferiti, /account/impostazioni, /pubblica, /annunci/[id]/modifica
Fix: Implementare skeleton loaders visibili durante il caricamento. Verificare la configurazione SSR/SSG per ridurre i tempi di TTFB. Assicurarsi che il contenuto critico venga renderizzato server-side.

[BUG-06] FILTRO TIPOLOGIA NELLA URL NON VIENE APPLICATO
Pagina: /annunci?tipo=adozione (URL diretta con parametro tipo)
Comportamento atteso: Il parametro URL "tipo" dovrebbe pre-selezionare il filtro tipologia e mostrare solo gli annunci di quel tipo
Comportamento riscontrato: Navigando a /annunci?tipo=adozione, il filtro tipologia rimane su "Tutti i tipi" e il filtro non viene riconosciuto come attivo nel badge "filtri attivi". I risultati mostrano 19 annunci (con solo il filtro testo "test" attivo).
Fix: Allineare il nome del parametro URL al nome usato internamente dal componente filtri. Verificare che tutti i parametri URL vengano letti correttamente al mount del componente.

[BUG-07] MODULO PUBBLICA: TITLE DEL BROWSER MANCANTE / GENERICO
Pagina: /pubblica, /login, /account e molte pagine area riservata
Comportamento atteso: Il tag <title> di ogni pagina dovrebbe essere descrittivo e specifico
Comportamento riscontrato: Il title della tab del browser mostra "adottaungatto-it" generico per molte pagine dell'area riservata (/login, /account, /pubblica etc.) invece di titoli specifici come "Accedi | adottaungatto.it", "Il tuo account | adottaungatto.it", "Pubblica annuncio | adottaungatto.it".
Fix: Aggiungere metadata <title> appropriati per ciascuna pagina dell'area riservata.

[BUG-08] RAZZA MANCANTE NELLA SELECT DEL MODULO PUBBLICA/MODIFICA
Pagina: /pubblica e /annunci/[id]/modifica - sezione Profilo del gatto
Comportamento atteso: La select RAZZA dovrebbe avere un'etichetta aria-label per l'accessibilita
Comportamento riscontrato: La select RAZZA nel form di creazione/modifica annuncio non ha aria-label nel DOM, a differenza di SESSO, ETA e gli altri campi che ce l'hanno.
Fix: Aggiungere aria-label="RAZZA" alla select della razza.

[BUG-09] LINK "NORAMICA" NEL WORKSPACE NON HA NAVIGAZIONE CHIARA
Pagina: /account e tutte le pagine workspace
Comportamento atteso: Il tab "noramica" (che sembra essere il nome utente o "panoramica") dovrebbe avere un tooltip o label chiaro
Comportamento riscontrato: Il tab "noramica" nel menu workspace e visibile ma il testo e troncato. Non e chiaro che si tratti della panoramica dell'account. Il testo completo dovrebbe essere "panoramica" ma viene mostrato solo "noramica" (la 'pa' iniziale sembra tagliata).
Fix: Verificare il render del tab di panoramica. Il testo dovrebbe essere "Panoramica" con la P maiuscola. Assicurarsi che il testo non venga troncato.



---
STEP 3: MIGLIORAMENTI E BUG MINORI (Bassa Priorità)

[BUG-10] FILTRO RICERCA: PARAMETRI URL NON AGGIORNATI CORRETTAMENTE
Pagina: /annunci
Comportamento atteso: I filtri applicati dovrebbero riflettersi nell'URL per permettere la condivisione della ricerca
Comportamento riscontrato: Alcune combinazioni di filtri non aggiornano correttamente i parametri URL, rendendo impossibile condividere o salvare una ricerca specifica
Fix: Assicurarsi che ogni modifica ai filtri aggiorni i query params nell'URL in modo sincrono.

[BUG-11] PAGINAZIONE: STATO DEI FILTRI NON PERSISTITO TRA LE PAGINE
Pagina: /annunci?page=2 e successive
Comportamento atteso: I filtri selezionati dovrebbero persistere durante la navigazione tra le pagine dei risultati
Comportamento riscontrato: Navigando alla pagina 2 o successive, i filtri precedentemente applicati potrebbero non essere mantenuti correttamente
Fix: Includere tutti i parametri dei filtri attivi nei link di paginazione.

[BUG-12] FORM CONTATTA PROPRIETARIO: NESSUN FEEDBACK VISIVO DI CARICAMENTO
Pagina: /annunci/[id] - form messaggi
Comportamento atteso: Dopo aver cliccato "Invia messaggio", dovrebbe apparire un indicatore di caricamento mentre il messaggio viene inviato
Comportamento riscontrato: Non c'e feedback visivo durante l'invio del messaggio
Fix: Aggiungere uno stato di loading al bottone "Invia messaggio" durante la richiesta API.

[BUG-13] PREFERITI: AGGIUNTA/RIMOZIONE SENZA CONFERMA
Pagina: /annunci/[id] e /preferiti
Comportamento atteso: L'azione di rimozione dai preferiti dovrebbe avere almeno un feedback visivo chiaro (cambio colore/icona)
Comportamento riscontrato: Il bottone "Aggiungi ai preferiti" non mostra chiaramente lo stato attuale (aggiunto/non aggiunto) quando si ritorna sulla pagina
Fix: Sincronizzare lo stato del bottone preferiti con i dati del server al caricamento della pagina.

[BUG-14] PAGINA /account/annunci/[id]: NAVIGAZIONE DA LISTA AI MIEI ANNUNCI
Pagina: /account/annunci e /account/annunci/[id]
Comportamento atteso: Dal dettaglio di un proprio annuncio nel workspace, dovrebbe esserci un link "Torna ai miei annunci"
Comportamento riscontrato: Non e presente una navigazione chiara per tornare alla lista dei propri annunci
Fix: Aggiungere un breadcrumb o un link "< Torna ai miei annunci" nella pagina di dettaglio del workspace.

---
STEP 4: PROBLEMI DI ACCESSIBILITA E SEO

[BUG-15] IMMAGINI SENZA ATTRIBUTO ALT
Pagina: Homepage e /annunci (lista)
Comportamento atteso: Tutte le immagini dovrebbero avere un attributo alt descrittivo per accessibilita e SEO
Comportamento riscontrato: Le foto dei gatti nella lista annunci e nella homepage potrebbero non avere alt text descrittivo
Fix: Aggiungere alt="[Nome gatto] - [razza] - disponibile per adozione" a ogni immagine degli annunci.

[BUG-16] SKIP NAVIGATION LINK MANCANTE
Pagina: Tutte le pagine
Comportamento atteso: Dovrebbe esserci un link "Salta al contenuto principale" visibile al focus per utenti che navigano con tastiera
Comportamento riscontrato: Non e presente nessun skip link
Fix: Aggiungere un link nascosto "Salta al contenuto" come primo elemento del DOM, visibile solo al focus.

[BUG-17] FORM /pubblica: MESSAGGI DI ERRORE NON ASSOCIATI AI CAMPI
Pagina: /pubblica
Comportamento atteso: I messaggi di errore di validazione dovrebbero essere associati ai rispettivi campi tramite aria-describedby
Comportamento riscontrato: Gli errori di validazione appaiono ma potrebbero non essere correttamente collegati ai campi tramite attributi ARIA
Fix: Aggiungere aria-describedby="error-[fieldname]" ai campi con errore e id corrispondente al messaggio di errore.

[BUG-18] FOCUS TRAP NEI MODALI/DROPDOWN
Pagina: Tutte le pagine con dropdown o modali
Comportamento atteso: Il focus della tastiera dovrebbe rimanere all'interno di modali e dropdown quando aperti
Comportamento riscontrato: Non verificato se il focus trap e implementato correttamente nei componenti interattivi
Fix: Implementare focus trap per tutti i componenti overlay (modali, menu dropdown, drawer).

---
STEP 5: CASI DI TEST PER REGRESSIONE

I seguenti scenari devono essere testati dopo ogni deploy:

1. AUTENTICAZIONE
   - Login con credenziali corrette -> redirect a /account
   - Login con credenziali errate -> messaggio di errore
   - Logout -> redirect a homepage, sessione eliminata
   - Accesso a pagine protette senza login -> redirect a /login

2. ANNUNCI - CREAZIONE
   - Creazione annuncio con tutti i campi obbligatori -> successo
   - Creazione annuncio senza foto -> messaggio di errore appropriato
   - Creazione annuncio con tutti i campi -> annuncio visibile in /account/annunci con stato "in attesa di revisione"

3. ANNUNCI - RICERCA E FILTRI
   - Ricerca per testo -> risultati filtrati
   - Filtro per tipo (adozione/smarrito/trovato) -> risultati corretti
   - Azzera filtri -> tutti i risultati ripristinati
   - Paginazione -> navigazione corretta tra le pagine

4. MESSAGGISTICA
   - Invio messaggio a proprietario annuncio -> messaggio ricevuto in /messaggi
   - Tentativo di messaggiare se stessi -> errore appropriato in italiano

5. PREFERITI
   - Aggiunta annuncio ai preferiti -> visibile in /preferiti
   - Rimozione dai preferiti -> rimosso da /preferiti

6. WORKSPACE
   - Modifica annuncio -> dati aggiornati correttamente
   - Anteprima annuncio in tutti gli stati -> accessibile
   - Impostazioni profilo -> salvataggio corretto

---
RIEPILOGO PRIORITA

CRITICALE (da correggere immediatamente):
- BUG-01: Redirect errato pagina modifica
- BUG-02: Messaggio di errore in inglese
- BUG-03: Anteprima annuncio in attesa non accessibile
- BUG-04: Discrepanza foto lista/dettaglio

ALTA PRIORITA:
- BUG-05: Schermate bianche al caricamento
- BUG-06: Filtri URL non funzionanti
- BUG-07: Meta title mancanti per le pagine

MEDIA PRIORITA:
- BUG-08: Aria-label mancante su select RAZZA
- BUG-09: Tab "noramica" troncato
- BUG-10 a BUG-14: Miglioramenti UX

BASSOA PRIORITA:
- BUG-15 a BUG-18: Accessibilita e SEO

---
Note: Questa analisi e stata condotta in data 07 marzo 2026 su ambiente di sviluppo locale (localhost:3000). Si raccomanda di eseguire nuovamente i test su ambiente di staging/produzione dopo l'implementazione delle correzioni.

