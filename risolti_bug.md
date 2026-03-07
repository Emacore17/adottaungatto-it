VERIFICA BUG - adottaungatto-it
Data verifica: 07 marzo 2026

Questa sezione riporta i risultati della verifica dopo le modifiche effettuate dallo sviluppatore.

========================================
BUG RISOLTI
========================================

[RISOLTO] BUG 9.1 - Stato annuncio in italiano
Pagina: /account/annunci
StatoL Lo stato ora mostra "In attesa di revisione" in italiano. RISOLTO.

[RISOLTO] BUG 9.2 - Route corretta /account/annunci/[id]
Pagina: /account/annunci
Stato: La route ora usa /account/annunci/[id] (non piu /account/listings/[id]). RISOLTO.

[RISOLTO] BUG 9.3 - Feedback su Crea annuncio
Pagina: /pubblica
Stato: "Crea annuncio" ora mostra toast di validazione (campi mancanti) e toast di conferma ("Annuncio creato") con redirect alla modifica. RISOLTO.

[RISOLTO] BUG 9.5 - Campo telefono
Pagina: /account/impostazioni
Stato: Il campo si chiama ora "Telefono" con nota esplicativa del formato. RISOLTO.

[RISOLTO] BUG 9.6 - Consensi privacy default
Pagina: /account/impostazioni
Stato: I consensi obbligatori (Privacy e Termini) sono attivi per default con badge OBBLIGATORIO. RISOLTO.

[RISOLTO] BUG 10.1 - Feedback salvataggio sticky bar
Pagina: /pubblica e /annunci/[id]/modifica
Stato: La sticky bar ora mostra "Salvataggio in corso..." con spinner. RISOLTO.

[RISOLTO] BUG 10.2 - Validazione ETA
Pagina: /pubblica
Stato: Il campo ETA ora valida e mostra "Inserisci un'eta valida maggiore di zero". RISOLTO.

[RISOLTO] BUG 10.3 - Campo VALUTA come select
Pagina: /pubblica
Stato: Il campo VALUTA e ora un select con opzione "EUR (Euro)". RISOLTO.

[RISOLTO] BUG 10.4 - Campi filtrabili nel form
Pagina: /pubblica
Stato: Aggiunti campi STERILIZZATO, VACCINATO, MICROCHIP, COMPATIBILE CON BAMBINI, COMPATIBILE CON ALTRI ANIMALI. RISOLTO.

[RISOLTO] BUG 8.5 - Feedback salvataggio impostazioni
Pagina: /account/impostazioni
Stato: Il pulsante "Salva" ora mostra stato "Salvataggio..." durante il processo. RISOLTO.

========================================
BUG PARZIALMENTE RISOLTI
========================================

[PARZIALE] BUG SALVATAGGIO - Manca toast di conferma successo
Pagina: /annunci/[id]/modifica, /account/impostazioni
Descrizione: Il loader "Salvataggio in corso" e presente ma manca un toast di conferma "Salvato con successo!" al completamento del salvataggio. L'utente non sa se il salvataggio e andato a buon fine.
Soluzione: Aggiungere un toast verde "Modifiche salvate" dopo il completamento.

========================================
NUOVI BUG TROVATI
========================================

[CRITICO] NUOVO BUG N1 - Paginazione pagina 2 non mostra annunci
Pagina: /annunci?page=2
Descrizione: La pagina 2 degli annunci mostra "Pagina 2/2 - Visibili 0" e "Nessun annuncio trovato con i filtri correnti" nonostante esistano 23+ annunci.
Soluzione: Correggere la logica di paginazione lato server/client.

[CRITICO] NUOVO BUG N2 - Ricerca testuale mostra conteggio sbagliato
Pagina: /annunci?q=gatto (o qualsiasi ricerca testuale)
Descrizione: La ricerca testuale dice "2 annunci trovati" ma mostra "Visibili 0" e "Nessun annuncio trovato". Il conteggio non corrisponde ai risultati visualizzati.
Soluzione: Correggere la logica di rendering dei risultati di ricerca testuale.

[ALTO] NUOVO BUG N3 - Sessione scade con token error esposto
Pagina: /annunci/[id] (invio messaggio)
Descrizione: Quando la sessione scade e si tenta di inviare un messaggio, compare il toast "Invio non riuscito / Invalid or expired bearer token." - Messaggio tecnico esposto all'utente.
Stato: BUG 8.1 (sessione) e BUG 8.2 (token esposto) NON RISOLTI.
Soluzione: Intercettare errore 401 e mostrare "Sessione scaduta, accedi di nuovo" con redirect al login.

[ALTO] NUOVO BUG N4 - Keycloak ancora in inglese
Pagina: pagina di login Keycloak
Descrizione: La pagina Keycloak (http://localhost:8080) rimane in inglese nonostante il parametro ui_locales=it&kc_locale=it nell'URL.
Stato: BUG 4.1 NON RISOLTO.
Soluzione: Configurare la traduzione italiana in Keycloak admin console > Realm Settings > Localization.

[MEDIO] NUOVO BUG N5 - Preferiti locali non sincronizzati al login
Pagina: /preferiti
Descrizione: I preferiti salvati localmente (prima del login) non vengono sincronizzati con l'account dopo l'autenticazione. La pagina /preferiti mostra "0 salvati" anche se c'erano preferiti locali.
Soluzione: Al login, rilevare i preferiti in localStorage e sincronizzarli con il server.

========================================
BUG CONFERMATI NON RISOLTI (dalla lista originale)
========================================

[NON RISOLTO] BUG 8.1 - Sessione scade troppo presto
[NON RISOLTO] BUG 8.2 - Token JWT esposto negli errori
[NON RISOLTO] BUG 4.1 - Keycloak UI in inglese

========================================
RIEPILOGO VERIFICA
========================================
Data: 07 marzo 2026
Bug risolti: 10
Bug parzialmente risolti: 1
Nuovi bug trovati: 5
Bug confermati non risolti: 3

Pagine testate nella verifica:
- / (Home)
- /annunci (Lista con filtri, ricerca, paginazione)
- /annunci/[id] (Dettaglio con preferiti, messaggi)
- /login (Flusso Keycloak)
- /account (Dashboard)
- /account/annunci (Lista annunci utente)
- /account/annunci/[id] (Dettaglio annuncio utente)
- /annunci/[id]/modifica (Editor annuncio)
- /messaggi (Inbox)
- /preferiti (Lista preferiti)
- /account/impostazioni (Impostazioni)
- /pubblica (Creazione annuncio)
- /privacy, /termini, /contatti, /faq (Footer)
- /paginainesistente (404)

