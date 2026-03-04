# FRONTEND_GUIDE.md

Guida canonica per interventi su `apps/web` e `apps/admin`.

## Obiettivo

Mantenere il frontend coerente con il codice esistente, ridurre le superfici transitorie e preparare il terreno per i prossimi sviluppi senza creare un nuovo strato di documentazione speculative.

## Baseline visuale da preservare

- riusare i token CSS gia presenti in `apps/web/app/globals.css` e `apps/admin/app/globals.css`
- web usa `Inter`, `Poppins` e `JetBrains Mono`
- admin usa `Inter` e `Poppins`
- preferire `packages/ui` per button, input, card, badge, dialog, skeleton
- non introdurre un terzo sistema di search, dialog, drawer o nav state

## Modello corrente delle route web

### Marketing

- `/`
- `/chi-siamo`
- `/faq`
- `/contatti`
- `/privacy`
- `/termini`
- `/cookie`
- `/sicurezza`
- `/lavora-con-noi`
- `/maintenance`

### Discovery

- `/annunci`
- `/annunci/[listingId]`
- `/cerca`

### Auth

- `/login`
- `/registrati`
- `/password-dimenticata`

### Workspace

- `/account`
- `/account/annunci`
- `/account/impostazioni`
- `/account/sicurezza`
- `/account/listings`
- `/account/listings/new`
- `/account/listings/[listingId]`
- `/account/listings/submitted`
- `/messaggi`
- `/messaggi/[threadId]`
- `/preferiti`
- `/pubblica`
- `/annunci/[listingId]/modifica`

### Sistema

- `/500`
- `app/error.tsx`
- `app/not-found.tsx`

## Modello corrente delle route admin

- `/login`
- `/admin`
- `/admin/moderazione`
- `/admin/moderazione/[listingId]`
- `/admin/utenti`
- `/admin/segnalazioni`
- `/admin/impostazioni`
- `/admin/audit-log`
- `/unauthorized`

Legacy route ancora presenti:

- `/moderation`
- `/analytics`

## Superfici reali, parziali e mock

### Reali o quasi reali

- login web/admin
- account e workspace base
- catalogo pubblico e dettaglio annuncio
- pubblicazione/modifica annuncio
- messaggi
- moderazione core
- KPI admin base

### Informative only

- `/registrati`
- `/password-dimenticata`

### Mock-backed o ibride

- `/profilo/[username]`
- recensioni venditore
- admin `utenti`
- admin `segnalazioni`
- admin `audit-log`
- parte della pagina admin `impostazioni`

### Browser-local only

- `/preferiti`
  - l'elenco e persistito in `localStorage`
  - il route handler `/api/favorites/listings` serve solo a risolvere i dettagli degli ID salvati

## Regole di implementazione

- per fetch autenticati dal browser preferire sempre i route handler same-origin in `app/api/**`
- le pagine workspace devono controllare la sessione lato server prima del render
- quando si lavora nel workspace riusare `WorkspacePageShell` e `WorkspaceSubnav`
- non reintrodurre una search globale su auth, workspace, pagine legali o pagine errore
- se una pagina resta intenzionalmente parziale, la UI deve dirlo in modo prodotto-centrico, non tecnico

## Regole specifiche per UI/UX

- evitare testo interno da cantiere: niente `scaffold`, `placeholder`, `endpoint preservato`, `route preservata`
- i mock devono essere espliciti solo dove serve al team, non all'utente finale
- le CTA principali devono restare leggibili e vicine al contesto
- mobile-first: prima verificare viewport piccole, poi tablet e desktop
- non annidare elementi interattivi dentro link/click target piu grandi

## Search e discovery

Vincoli attuali:

- `LocationIntent` e il contratto canonico tra UI e API
- `/annunci` e `/cerca` devono comportarsi come due ingressi allo stesso dominio di ricerca
- la ricerca non deve dipendere da una shell globale appesa ovunque

Direzione raccomandata:

- consolidare i componenti di filtri e ricerca attorno a uno state model unico
- riusare gli stessi pattern desktop/mobile per catalogo, home e discovery

## Admin

- moderazione e analytics sono le superfici admin piu vicine allo stato reale
- prima di espandere nuove pagine admin, decidere se sono reali o volutamente mock
- evitare di dare l'impressione di una feature pronta se e solo una vetrina UI

## Priorita frontend

1. unificare definitivamente la search UX
2. ridurre o sostituire le superfici mock piu visibili
3. estendere loading/error states e test E2E sulle route core

