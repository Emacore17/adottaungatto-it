# ANALISI ## BUG - adottaungatto-it
Data analisi: 07 Marzo 2026 | Versione: Next.js + Keycloak (porta 8080)
URL testato: http://localhost:3000
Metodologia: Navigazione manuale di tutte le pagine, test di funzionalita, verifica filtri, test URL errati, test dark mode, analisi accessibilita e UX.


## STEP 1 - HOME PAGE (/)
## BUG 1.1 - [CRITICO] Bottone "Cerca" non naviga alla pagina risultati
Pagina: Home (/)
Descrizione: Il bottone con icona lente di ingrandimento nella barra di ricerca della home page, cliccato dopo aver inserito del testo, non esegue nessuna navigazione. La pagina rimane statica. La ricerca dovrebbe portare su /annunci?q=<testo>.
Riproduzione: Inserire testo nel campo "CERCA GATTI" > Cliccare il bottone di ricerca (icona lente).
Soluzione: Aggiungere un handler onClick o un form submit che reindirizzi a /annunci?q=<testo>&... con tutti i parametri compilati.


## BUG 1.2 - [MEDIO] Filtro "RAZZA" nella barra home non e collegato alla navigazione
Pagina: Home (/)
Descrizione: Il select "RAZZA" nella barra di ricerca home mostra un valore ("Indifferente") ma anche se cambiato non viene incluso nella navigazione quando si clicca cerca.
Soluzione: Includere il valore del select come parametro URL nella navigazione (es. ?razza=Persiano).


## BUG 1.3 - [MEDIO] Filtro "Cosa stai cercando?" e "SESSO" e "PREZZO" e "ETA" nella home non funzionano
Pagina: Home (/)
Descrizione: I filtri avanzati nella barra di ricerca della home ("Cosa stai cercando?", "SESSO", "PREZZO", "ETA DEL GATTO", "ORDINA PER") non vengono passati come parametri URL alla pagina annunci. Lo stesso vale per il campo "DOVE".
Soluzione: Raccogliere tutti i valori dei filtri e costruire l'URL di navigazione completo.


## BUG 1.4 - [MEDIO] Carosello "In evidenza" duplica gli annunci
Pagina: Home (/)
Descrizione: Il carosello "Annunci in evidenza" mostra gli stessi annunci due volte (annunci 51, 50, 49 si ripetono). Sono visibili 6 slides con solo 3 annunci distinti.
Soluzione: Rimuovere la duplicazione degli annunci nel componente carosello. Verificare la logica di fetching o il popolamento dell'array slides.


## BUG 1.5 - [BASSO] Titolo pagina home non ottimizzato per SEO
Pagina: Home (/)
Descrizione: Il titolo della pagina (tag <title>) mostra solo "adottaungatto-it" senza una descrizione utile. Andrebbe aggiunto un titolo descrittivo tipo "adottaungatto.it - Adozioni, stalli e segnalazioni di gatti in Italia".
Soluzione: Aggiornare il metadato title nella home page.


## STEP 2 - PAGINA ANNUNCI (/annunci)
## BUG 2.1 - [CRITICO] Contenuto degli annunci presenta dati DEMO nel database
Pagina: /annunci e tutte le schede annuncio
Descrizione: Tutti i 18 annunci presenti hanno il titolo che inizia con "[DEMO M2.11]". Questi sono dati di seed/test che non dovrebbero essere visibili in produzione. Anche le descrizioni contengono "Annuncio seed locale per test ricerca, moderazione e UI pubblica".
Soluzione: Ripulire il database dai dati demo oppure applicare un flag is_demo=true e filtrarli dalla visualizzazione pubblica.


## BUG 2.2 - [CRITICO] Ritardo di caricamento: pagina bianca prima del contenuto
Pagina: /annunci, /annunci/[id], /faq, /contatti
Descrizione: Tutte le pagine mostrano una schermata bianca per 2-3 secondi prima di caricare il contenuto. Questo suggerisce un problema con il rendering lato server (SSR/SSG) o un fetch asincrono senza skeleton/loader visibile.
Soluzione: Aggiungere skeleton loading o un componente di caricamento visibile immediatamente, oppure verificare perche il rendering server-side non funziona correttamente.


## BUG 2.3 - [MEDIO] Inconsistenza capitalizzazione campo SESSO
Pagina: /annunci (lista) e /annunci/[id] (scheda)
Descrizione: Nel carosello e nella lista annunci, il campo sesso appare in minuscolo ("maschio", "femmina"). Nella scheda dettaglio annuncio e scritto con iniziale maiuscola ("Maschio", "Femmina"). Manca uniformita.
Soluzione: Applicare una normalizzazione coerente in tutto il sito: o sempre minuscolo o sempre con prima lettera maiuscola.


## BUG 2.4 - [MEDIO] Bottone "Aggiungi ai preferiti" non funziona senza login
Pagina: /annunci, /annunci/[id]
Descrizione: Il bottone "Aggiungi ai preferiti" (cuore) e visibile nelle card annunci anche agli utenti non autenticati. Cliccandolo non da nessun feedback visivo ne modale di richiesta login.
Soluzione: Al click del cuore, se non autenticato, mostrare un messaggio/tooltip "Accedi per salvare ai preferiti" oppure aprire un modale di login.


## BUG 2.5 - [BASSO] Accentate mancanti in testi dell'interfaccia
Pagina: Multiple pagine
Descrizione: In diversi testi dell'interfaccia mancano le lettere accentate: "Citta" invece di "Citta", "piu" invece di "piu", "eta" invece di "eta", "Qualsiasi eta" ecc. Questo si nota in tutta l'app nei label dei filtri.
Soluzione: Correggere tutti i testi rimuovendo le accentate mancanti o aggiungendole dove appropriate.


## STEP 3 - PAGINA SINGOLO ANNUNCIO (/annunci/[id])
## BUG 3.1 - [CRITICO] Titolo della pagina 404 annuncio non trovato e errato
Pagina: /annunci/99999 (ID inesistente)
Descrizione: Quando si accede a un annuncio con ID inesistente, la pagina mostra correttamente "404 - Pagina non trovata" ma il tag <title> del browser rimane "Annuncio | adottaungatto-it" invece di riflettere lo stato 404.
Soluzione: Impostare il title della pagina dinamicamente in base al risultato del fetch: se l'annuncio non esiste, usare title "Annuncio non trovato | adottaungatto-it".


## BUG 3.2 - [BASSO] Manca il numero di gatti nella scheda dettaglio annuncio
Pagina: /annunci/[id]
Descrizione: Nella lista annunci ogni card mostra "1 gatto" o "2 gatti" come info. Nella scheda dettaglio annuncio questa informazione non e presente.
Soluzione: Aggiungere il campo "numero di gatti" nella scheda dettaglio, in modo coerente con la card lista.


## STEP 4 - LOGIN E AUTENTICAZIONE (/login)
## BUG 4.1 - [CRITICO] Pagina di login Keycloak completamente in inglese
Pagina: http://localhost:8080/realms/adottaungatto/... (redirect da /login)
Descrizione: Quando l'utente clicca "Continua con account" e viene reindirizzato alla pagina Keycloak, l'intera interfaccia e in inglese: "Sign in to your account", "Username or email", "Password", "Sign In", "Forgot Password?". Il sito e completamente in italiano, quindi questa discrepanza e molto evidente.
Soluzione: Configurare Keycloak per usare il tema italiano oppure creare/installare un tema personalizzato in italiano. Andare su Keycloak Admin > Realm Settings > Themes > Login theme e selezionare un tema localizzato in it-IT.


## BUG 4.2 - [MEDIO] Link "Registrati" e "Password dimenticata" non verificati
Pagina: /login
Descrizione: I link "Registrati" e "Password dimenticata" nella pagina /login del sito puntano presumibilmente a Keycloak (in inglese). Non e stato possibile verificarne il funzionamento senza credenziali, ma data la ## BUG 4.1 probabilmente anche queste pagine saranno in inglese.
Soluzione: Verificare che i flussi di registrazione e recupero password siano correttamente localizzati in italiano.


## STEP 5 - PAGINE FOOTER (Privacy, Termini, Contatti, FAQ)
## BUG 5.1 - [CRITICO] Pagina /contatti mostra schermata bianca iniziale
Pagina: /contatti
Descrizione: La pagina /contatti mostra una schermata completamente bianca per 2-3 secondi prima di caricare il contenuto. Nessun loader/skeleton visibile.
Soluzione: Vedi ## BUG 2.2 - aggiungere skeleton loader o migliorare il SSR.


## BUG 5.2 - [CRITICO] Pagina /faq mostra schermata bianca iniziale
Pagina: /faq
Descrizione: La pagina /faq mostra una schermata completamente bianca per 3-4 secondi prima di caricare il contenuto. Il ritardo e piu lungo rispetto ad altre pagine.
Soluzione: Vedi ## BUG 2.2 - implementare SSR corretto o aggiungere skeleton loader.


## BUG 5.3 - [BASSO] Pulsante "Gestisci preferenze" in /privacy porta al login invece che alle impostazioni
Pagina: /privacy
Descrizione: Il pulsante "Gestisci preferenze" nella pagina Privacy, quando cliccato, reindirizza a /login?next=/account/impostazioni invece che mostrare un pannello cookie o portare alle impostazioni. Se l'utente non e loggato, viene rimandato al login senza spiegazione.
Soluzione: Se l'utente non e autenticato, mostrare un messaggio che spiega perche il login e necessario per gestire le preferenze, oppure rendere visibili le opzioni di base senza login (es. cookie).


## STEP 6 - NAVIGAZIONE E UX GENERALE
## BUG 6.1 - [MEDIO] Nessun link "Torna agli annunci" mantiene i filtri attivi
Pagina: /annunci/[id]
Descrizione: Quando si visita una scheda annuncio dalla lista filtrata (es. /annunci?q=Milano) e si clicca "Torna agli annunci", si viene riportati a /annunci senza i filtri. L'utente perde il contesto di ricerca.
Soluzione: Il link "Torna agli annunci" dovrebbe usare il history.back() del browser oppure conservare i parametri di ricerca precedenti nell'URL.
## BUG 6.2 - [BASSO] Pulsante tema scuro/chiaro: icona non aggiornata immediatamente
Pagina: Tutte
Descrizione: Il toggle dark/light mode funziona, ma l'icona (sole/luna) mostra un indicatore circolare/colorato durante la transizione che puo sembrare un errore visivo. Sembra un artefatto del rendering.
Soluzione: Verificare il componente ThemeToggle e assicurarsi che l'icona si aggiorni correttamente e senza artefatti visivi.


## BUG 6.3 - [BASSO] Breadcrumb non presente
Pagina: /annunci/[id], /privacy, /termini, /contatti, /faq
Descrizione: Nessuna pagina interna ha un breadcrumb di navigazione. Questo rende difficile capire dove ci si trova nel sito, specialmente per gli utenti nuovi.
Soluzione: Aggiungere un componente breadcrumb coerente in tutte le pagine interne (es. Home > Annunci > [Titolo annuncio]).


## STEP 7 - RIEPILOGO PRIORITA E PIANO DI CORREZIONE
PRIORITA ALTA (da correggere subito)
1. ## BUG 1.1 - Bottone Cerca sulla Home non naviga
2. ## BUG 2.1 - Dati DEMO visibili a tutti gli utenti
3. ## BUG 2.2 - Pagina bianca su caricamento (piu pagine)
4. ## BUG 4.1 - Pagina login Keycloak in inglese
5. ## BUG 3.1 - Title tag errato su annuncio non trovato (404)
6. ## BUG 5.1 - Pagina /contatti mostra schermata bianca
8. ## BUG 8.1 - Sessione scade troppo presto senza avviso
9. ## BUG 8.4 - Eliminazione messaggio senza conferma
10. ## BUG 8.5 - Pulsante Salva/Profilo senza feedback visivo
11. ## BUG 9.3 - Crea annuncio senza feedback
12. ## BUG 9.6 - Consensi privacy disabilitati per default (GDPR)
13. ## BUG 10.1 - Pulsante Salva sticky bar senza feedback



PRIORITA MEDIA (da correggere entro breve)
1. ## BUG 1.2 - Filtro RAZZA home non collegato alla navigazione
2. ## BUG 1.3 - Filtri avanzati home (DOVE, tipo, sesso, prezzo, eta) non funzionanti
3. ## BUG 1.4 - Carosello In evidenza duplica gli annunci
4. ## BUG 2.3 - Inconsistenza capitalizzazione sesso
5. ## BUG 2.4 - Pulsante preferiti senza feedback per utenti non autenticati
6. ## BUG 4.2 - Flussi registrazione/recupero password probabilmente in inglese
7. ## BUG 6.1 - Link Torna agli annunci non mantiene i filtri
8. ## BUG 8.2 - Token JWT esposto in messaggi di errore
9. ## BUG 8.3 - Username inconsistente tra sezioni autenticate
10. ## BUG 9.1 - Stato annuncio in inglese (pending_review)
11. ## BUG 9.4 - Accenti mancanti sistematicamente
12. ## BUG 9.5 - Etichetta tecnica E.164 esposta agli utenti
13. ## BUG 10.2 - Campo ETA senza validazione valori negativi
14. ## BUG 10.3 - Campo VALUTA testo libero invece di select



PRIORITA BASSA (miglioramenti)
1. ## BUG 1.5 - Titolo pagina home non ottimizzato SEO
2. ## BUG 2.5 - Accentate mancanti nei testi interfaccia
3. ## BUG 3.2 - Manca numero gatti nella scheda dettaglio
4. ## BUG 5.3 - Pulsante Gestisci preferenze in Privacy manda al login senza spiegazione
5. ## BUG 6.2 - Artefatto visivo nel toggle dark mode
6. ## BUG 6.3 - Mancanza breadcrumb nelle pagine interne
7. ## BUG 9.2 - Route dettaglio annuncio usa "listings" invece di "annunci"
8. ## BUG 9.7 - Username "noramica" non corrisponde al profilo utente
9. ## BUG 10.4 - Campi filtrabili mancanti nel form creazione annuncio



RIEPILOGO FINALE
Totale bug identificati: 36
  - Critici: 13
  - Medi: 14
  - Bassi: 9

Pagine analizzate:
  - / (Home)
  - /annunci (Lista annunci)
  - /annunci/[id] (Singola scheda - testati ID: 39-51 e 99999)
  - /login
  - /pubblica (redirect a /login - corretto)
  - /privacy
  - /termini
  - /contatti
  - /faq
  - /paginainesistente (404 - funziona)
  - /preferiti (redirect a /login - corretto)
  - http://localhost:8080 (Keycloak login)
- /account (Dashboard)
- /account/annunci (Lista annunci personali)
- /account/listings/[id] (Dettaglio annuncio - route errata)
- /annunci/[id]/modifica (Editor annuncio)
- /messaggi (Inbox messaggi)
- /messaggi/[id] (Thread conversazione)
- /preferiti (Lista preferiti)
- /account/impostazioni (Impostazioni profilo)
- /pubblica (Creazione nuovo annuncio)


Funzionalita testate:
  - Barra di ricerca home
  - Filtri annunci (/annunci)
  - Paginazione annunci
  - Bottone aggiungi ai preferiti
  - Link Torna agli annunci
  - Toggle dark/light mode
  - Carosello annunci in evidenza
  - Sezione posizione (geolocalizzazione - non disponibile in ambiente test)
  - Link footer (Privacy, Termini, Contatti, FAQ)
  - Flusso login/auth (Keycloak)
  - FAQ accordion
  - Link percorsi rapidi (/preferiti, /messaggi)

Nota: L'analisi è stata condotta sia come utente non autenticato che come utente autenticato (credenziali: utente.demo / demo1234). Sono state testate tutte le pagine e funzionalità raggiungibili, incluse: home, annunci, singole schede, pagine footer, 404, area account, messaggi, preferiti, impostazioni e creazione annuncio.

## STEP 8 - AREA AUTENTICATA - DASHBOARD (/account)
## BUG 8.1 - [CRITICO] Sessione scade troppo presto senza avviso
Pagina: Tutte le pagine autenticate
Descrizione: Il token JWT di Keycloak scade dopo pochi minuti di utilizzo. Quando scade, l'utente viene reindirizzato silenziosamente alla pagina di login senza nessun avviso preventivo (es. "La tua sessione sta per scadere, vuoi restare connesso?"). Qualsiasi azione in corso viene persa.
Riproduzione: Fare login > navigare per 5-10 minuti > provare a salvare o navigare a pagina protetta.
Soluzione: 1) Aumentare il TTL del token Keycloak per le sessioni web. 2) Implementare il silent token refresh (refresh token automatico lato client). 3) Mostrare un avviso all'utente 1-2 minuti prima della scadenza.


## BUG 8.2 - [CRITICO] Nome utente nella sidebar workspace non corrisponde ai dati del profilo
Pagina: Tutte le pagine /account/*
Descrizione: Nella sidebar del workspace (in alto nella barra workspace) viene mostrato il nome "noramica" che non corrisponde ne al nome reale dell'utente (Mario Rossi) ne al nome pubblico (Gatto Lover). Sembra un username tecnico non formattato o un dato errato.
Soluzione: Mostrare il nome pubblico (o nome + cognome) al posto dello username tecnico nella sidebar workspace.


## BUG 8.3 - [CRITICO] Salvataggio consensi fallisce con "Invalid or expired bearer token"
Pagina: /account/impostazioni (sezione Privacy e consenso)
Descrizione: Cliccando "Salva consensi" dopo aver modificato i toggle privacy/termini/marketing, viene mostrato un errore toast: "Salvataggio non riuscito - Invalid or expired bearer token.". Questo significa che la chiamata API per il salvataggio dei consensi non invia correttamente il token di autenticazione.
Soluzione: Verificare che il token Bearer venga incluso nell'header Authorization della chiamata API per la gestione dei consensi. Verificare anche il meccanismo di refresh del token prima delle chiamate API.


## BUG 8.4 - [CRITICO] Eliminazione thread messaggi senza conferma
Pagina: /messaggi/[id]
Descrizione: L'icona cestino nel dettaglio conversazione elimina immediatamente e irreversibilmente l'intera conversazione senza mostrare nessuna finestra di conferma ("Sei sicuro di voler eliminare questa conversazione? Questa azione non puo essere annullata."). Durante il test, il thread e stato eliminato accidentalmente.
Soluzione: Aggiungere un modale di conferma prima dell'eliminazione con un pulsante di annullamento.


## BUG 8.5 - [CRITICO] Pulsante "Salva modifiche" e "Salva profilo" senza feedback visivo
Pagina: /annunci/[id]/modifica, /account/impostazioni
Descrizione: Cliccando i pulsanti di salvataggio ("Salva modifiche" nell'editor annuncio, "Salva profilo" nelle impostazioni), la pagina non mostra nessun toast di conferma, nessun messaggio di successo ne di errore. Non e possibile sapere se il salvataggio e avvenuto correttamente.
Soluzione: Aggiungere un toast/notifica di successo (es. "Modifiche salvate con successo") e uno di errore in caso di fallimento.


## STEP 9 - GESTIONE ANNUNCI PERSONALI (/account/annunci)
## BUG 9.1 - [CRITICO] Stato annuncio mostrato in inglese ("pending_review")
Pagina: /account/annunci, /account/listings/[id]
Descrizione: Lo stato dell'annuncio viene mostrato come badge con il testo "pending_review" (inglese/codice tecnico) sia nella lista degli annunci personali che nel dettaglio. Dovrebbe essere in italiano (es. "In attesa di revisione") o almeno formattato in modo leggibile.
Soluzione: Creare una mappa di traduzione per tutti gli stati dell'annuncio: pending_review -> "In attesa di revisione", published -> "Pubblicato", draft -> "Bozza", rejected -> "Rifiutato", ecc.


## BUG 9.2 - [MEDIO] Route pagina dettaglio annuncio usa "listings" (inglese) invece di "annunci"
Pagina: /account/listings/[id]
Descrizione: La route del dettaglio annuncio privato usa la parola inglese "listings" (/account/listings/33) mentre il resto del sito usa "annunci". Crea incoerenza nel sistema di routing.
Soluzione: Rinominare la route da /account/listings/[id] a /account/annunci/[id] per coerenza con il resto del sito.

## BUG 9.3 - [CRITICO] Pulsante "Crea annuncio" in /pubblica non fornisce feedback visivo
Pagina: /pubblica
Descrizione: Cliccando "Crea annuncio" con dati incompleti (titolo troppo corto, nessuna descrizione) il pulsante non risponde visivamente: nessun toast, nessun messaggio di errore, nessuna evidenziazione dei campi mancanti. La creazione può avvenire o fallire senza che l'utente lo sappia.
Soluzione: Mostrare un toast di errore con elenco dei campi mancanti. Evidenziare in rosso i campi non validi. Se la bozza viene creata con successo, reindirizzare alla pagina di modifica con un toast di conferma.

## BUG 9.4 - [MEDIO] Accenti mancanti sistematicamente in tutto il sito (problema encoding/font)
Pagina: tutte le pagine
Descrizione: Numerose parole italiane vengono visualizzate senza accenti: "Localita" (Località), "piu" (più), "eta" (età), "e" (è), "Citta" (Città), "localita" (località), ecc. Probabile problema con la codifica dei caratteri nei template o nei contenuti testuali.
Soluzione: Verificare e correggere l'encoding UTF-8 di tutti i testi hardcoded. Controllare che i file .tsx/.ts usino caratteri accentati o entità HTML corrette.

## BUG 9.5 - [MEDIO] Etichetta tecnica "Telefono (E.164)" esposta all'utente in /account/impostazioni
Pagina: /account/impostazioni
Descrizione: Il campo telefono mostra il formato tecnico "E.164" nell'etichetta, che non è comprensibile per l'utente medio. Non fornisce un esempio del formato corretto.
Soluzione: Cambiare etichetta in "Telefono" e aggiungere un placeholder o nota esplicativa: es. "+39 333 1234567".

## BUG 9.6 - [CRITICO] Consensi privacy e termini disabilitati per default in /account/impostazioni
Pagina: /account/impostazioni
Descrizione: I consensi "Informativa privacy" e "Termini di servizio" mostrano "Consenso disattivato" per default. Gli utenti possono navigare e pubblicare senza aver accettato i termini obbligatori. Possibile problema legale (GDPR).
Soluzione: Verificare che l'accettazione sia avvenuta durante la registrazione. Se non registrata, richiedere obbligatoriamente il consenso prima di permettere l'uso delle funzionalità. Bloccare le azioni critiche fino all'accettazione.

## BUG 9.7 - [BASSO] Username "noramica" nella navbar workspace non corrisponde al nome utente reale
Pagina: tutte le pagine autenticate (workspace navbar)
Descrizione: La navbar workspace mostra "noramica" come username, ma il profilo mostra Nome pubblico "Gatto Lover", l'email è utente.demo@adottaungatto.local e il nome è "Mario Rossi". Non è chiaro da dove provenga "noramica" né quale campo venga usato.
Soluzione: Definire un criterio univoco per il nome visualizzato nella navbar (es. nome pubblico o nome+cognome) e aggiornare il componente workspace.


## STEP 10 - FORM PUBBLICA ANNUNCIO (/pubblica)

## BUG 10.1 - [CRITICO] Pulsante "Salva" nella sticky bar di /pubblica non fornisce feedback
Pagina: /pubblica
Descrizione: Il pulsante "Salva" nella barra sticky in fondo alla pagina può essere cliccato in qualsiasi momento ma non mostra alcun toast di conferma, errore o stato di salvataggio. L'utente non sa se il salvataggio è avvenuto.
Soluzione: Mostrare un toast/loader durante il salvataggio e conferma/errore al completamento.

## BUG 10.2 - [MEDIO] Campo ETA nel profilo gatto non ha validazione per valori negativi o zero
Pagina: /pubblica (sezione Profilo del gatto)
Descrizione: Il campo ETA è di tipo number ma non impedisce l'inserimento di valori negativi o zero. Un'età di -5 mesi o 0 anni non ha senso e dovrebbe essere rifiutata.
Soluzione: Aggiungere attributo min="1" al campo input e validazione lato client/server.

## BUG 10.3 - [MEDIO] Il campo VALUTA nel form /pubblica è un campo testo libero invece di un select
Pagina: /pubblica (sezione Dati annuncio)
Descrizione: Il campo VALUTA mostra "EUR" ma sembra essere modificabile liberamente dall'utente. Dovrebbe essere un menu a tendina con valute supportate.
Soluzione: Sostituire il campo testo con un select con le valute supportate (EUR, USD, ecc.) o renderlo read-only se EUR è l'unica valuta.

## BUG 10.4 - [BASSO] La sezione Profilo del gatto non include tutti i campi filtrabili nella ricerca pubblica
Pagina: /pubblica, /annunci
Descrizione: La ricerca pubblica permette di filtrare per stato di salute, vaccinazioni, sterilizzazione, ecc. ma il form di creazione annuncio non include questi campi. L'utente non può specificare queste informazioni strutturate.
Soluzione: Aggiungere campi per: sterilizzato (sì/no), vaccinato (sì/no), microchip (sì/no), compatibile con bambini/altri animali.


