# UX_UI_GUIDELINES.md

Baseline linee guida UX/UI per milestone M4.

## 1. Design tokens (M4.1)

Token attivi in `apps/web/app/globals.css` e `apps/admin/app/globals.css`:

- Palette:
  - `--color-bg-canvas`
  - `--color-surface`, `--color-surface-muted`, `--color-surface-muted-strong`
  - `--color-border`
  - `--color-text`, `--color-text-muted`
  - `--color-primary`, `--color-primary-hover`, `--color-primary-foreground`
  - `--color-ring`
- Semantic colors:
  - success: `--color-success-*`
  - warning: `--color-warning-*`
  - danger: `--color-danger-*`
  - info: `--color-info-*`
- Shape and elevation:
  - `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
  - `--shadow-sm`, `--shadow-lg`

## 2. Typography

- Font web: `Plus Jakarta Sans` (`--font-web`)
- Font admin: `Manrope` (`--font-admin`)
- Scala tipografica base con `clamp()` per `h1`, `h2`, `h3`
- Tracking headings: `-0.02em`

## 3. Component rules (`packages/ui`)

- `Button` varianti standard:
  - `default`, `secondary`, `outline`, `ghost`, `success`, `danger`
- `Badge` varianti standard:
  - `default`, `secondary`, `outline`, `success`, `warning`, `danger`, `info`
- `Card`, `Input`, `Dialog`, `Skeleton` usano token condivisi per:
  - colore superfici
  - border
  - ring focus
  - radius
  - shadow

## 4. Stato annuncio e moderazione

- Stato listing (web) standardizzato via `ListingStatusBadge`:
  - `draft -> info`
  - `pending_review -> warning`
  - `published -> success`
  - `rejected -> danger`
  - `suspended -> warning`
  - `archived -> secondary`
- Admin moderazione:
  - `In revisione` su badge `warning`
  - CTA `Approva` su bottone `success`
  - CTA `Rifiuta` su bottone `danger`

## 5. Checklist QA M4.1 (manuale)

Su pagine chiave (`/annunci`, `/account/listings`, `/moderation`):

- stato focus visibile su input/button/dialog
- badge semantici coerenti (warning/success/danger/info)
- card e dialog con stessa family di radius/shadow
- contrasto testo su sfondi semantici leggibile
- nessun blocco su mobile/desktop

## 6. Motion guidelines (M4.2)

Preset motion condivisi in `packages/ui/src/lib/motion.ts`:

- `motionDurations`:
  - `quick: 0.16`
  - `base: 0.24`
  - `slow: 0.32`
- `motionEasing`:
  - `standard: [0.22, 1, 0.36, 1]`
  - `smooth: [0.16, 1, 0.3, 1]`
  - `exit: [0.4, 0, 1, 1]`
- `motionPresets`:
  - `page`
  - `sectionEnter`
  - `listEnter`
  - `hoverLift`
  - `crossfade`

Regole:

- animazioni brevi e leggere (`<= 320ms`)
- evitare rimbalzi marcati o overshoot
- usare `hoverLift` su card cliccabili e liste principali
- usare `crossfade` per transizioni stato loading/error/empty/content
- mantenere coerenza tra web e admin

Applicazione attuale:

- page transitions:
  - `apps/web/app/template.tsx`
  - `apps/admin/app/template.tsx`
- search risultati:
  - loading -> content con `AnimatePresence` + `crossfade`
  - microinterazioni card con `hoverLift`
- dialog:
  - overlay/content con transizione open/close via `data-state`

## 7. Checklist QA M4.2 (manuale)

- transizione pagina leggera su navigazione web/admin
- card risultati annunci con hover/press feedback coerente
- dialog con entrata/uscita morbida (niente snap)
- passaggio loading skeleton -> contenuto senza stacco brusco

## 8. Responsive refinement (M4.3)

Applicazione attuale su pagine chiave:

- Home (`apps/web/app/home-content.tsx`):
  - spacing mobile-first (`px-4` su small viewport)
  - CTA principali full-width su mobile, inline da `sm`
- Ricerca/lista (`apps/web/app/annunci/search-listings-client.tsx`):
  - toolbar azioni responsive (bottoni full-width su mobile)
  - filtri avanzati in drawer mobile (`Dialog`) con larghezza piena viewport
  - controlli paginazione con wrap su schermi piccoli
- Dettaglio annuncio (`apps/web/app/annunci/[listingId]/page.tsx`):
  - gallery adattiva (hero con aspect-ratio responsive)
  - thumbs con scroll orizzontale su mobile, griglia su viewport maggiori
  - CTA contatto sticky bottom su mobile (`md:hidden`)
- Crea annuncio (`apps/web/app/account/listings/new/page.tsx`, `apps/web/components/listing-create-form.tsx`):
  - padding inferiore per evitare overlap con CTA sticky
  - action bar sticky mobile con `Invia`/`Reset`
  - griglia contatti ottimizzata per tablet (`sm`/`xl`)
- Admin moderazione (`apps/admin/app/moderation/page.tsx`, `apps/admin/app/moderation/moderation-queue-client.tsx`):
  - card statistiche con breakpoints `sm`/`xl`
  - queue cards 2 colonne da `lg`
  - action buttons full-width su mobile

## 9. Checklist QA M4.3 (manuale)

- viewport `360x800`: nessun overflow orizzontale su home, ricerca, dettaglio, crea annuncio, moderazione
- `/annunci`: drawer filtri apribile/chiudibile e azione `Cerca annunci` sempre accessibile
- `/annunci/[id]`: CTA contatto sticky visibile su mobile, non duplicata su desktop
- `/account/listings/new`: barra azioni sticky mobile non copre contenuti finali
- `/moderation` su tablet (`768x1024`): metadati leggibili e bottoni moderazione facilmente cliccabili

## 10. Loading / empty / error states (M4.4)

Elementi introdotti:

- Loading skeleton route-level:
  - `apps/web/app/annunci/loading.tsx`
  - `apps/web/app/annunci/[listingId]/loading.tsx`
  - `apps/web/app/account/listings/new/loading.tsx`
  - `apps/admin/app/moderation/loading.tsx`
- Error boundary gradevoli con retry:
  - `apps/web/app/error.tsx`
  - `apps/web/app/annunci/error.tsx`
  - `apps/admin/app/error.tsx`
  - `apps/admin/app/moderation/error.tsx`
- Toast/feedback coerenti:
  - componente condiviso `packages/ui/src/components/toast.tsx`
  - usato in `search-listings-client`, `listing-create-form`, `moderation-queue-client`
- Empty states utili:
  - moderazione vuota con CTA `Ricarica coda`
  - form creazione annuncio con hint esplicito quando non ci sono immagini selezionate

## 11. Checklist QA M4.4 (manuale)

- forzare una route error (`error.tsx`) e verificare pulsante `Riprova`
- verificare presenza skeleton su caricamento pagine chiave (`/annunci`, `/annunci/<id>`, `/account/listings/new`, `/moderation`)
- simulare errore ricerca in `/annunci` e verificare toast + azione `Riprova`
- in moderazione, eseguire azione approve/reject e verificare toast di conferma/errore
- nel form nuovo annuncio, verificare toast su errore media o submit fallito

## 12. A11y pass base (M4.5)

Applicazione attuale:

- focus-visible globale coerente su elementi interattivi (`a`, `button`, `input`, `select`, `textarea`, `[tabindex]`)
  - `apps/web/app/globals.css`
  - `apps/admin/app/globals.css`
- `LocationSelector` con pattern combobox accessibile:
  - `role="combobox"` input + `aria-expanded`, `aria-controls`, `aria-activedescendant`
  - lista suggerimenti semantica (`ul/li/button`) con item attivo tracciato via `aria-current`
  - stato annunciato via `sr-only` (`aria-describedby`)
- filtri attivi in ricerca:
  - gruppo esplicito `role="group"` con label
  - pulsanti rimozione filtro con focus ring visibile e label accessibile
  - conteggio risultati con `aria-live="polite"`
- moderazione admin:
  - `aria-label` contestuale sui bottoni azione per annuncio
  - associazione esplicita label/textarea motivazione (`htmlFor`/`id`)
- dialog/drawer:
  - focus trap affidato a `@radix-ui/react-dialog` (comportamento default)

## 13. Checklist QA M4.5 (manuale)

- navigazione tastiera:
  - `Tab/Shift+Tab` tra controlli principali in `/annunci` e `/moderation`
  - `ArrowUp/ArrowDown`, `Enter`, `Esc` nel `LocationSelector`
- focus-visible:
  - ring sempre visibile su link custom, bottoni e campi input/select/textarea
- screen reader baseline:
  - in `LocationSelector`, verifica annuncio stato suggerimenti e selezione attiva
  - in moderazione, i bottoni azione devono leggere anche il titolo annuncio
- dialog/drawer:
  - apertura dialog moderazione e drawer filtri mobile con focus iniziale interno
  - `Esc` chiude e restituisce focus al trigger
- contrasto base:
  - testi informativi/errore/feedback leggibili su card e badge semantici

## 14. Performance UX pass (M4.6)

Applicazione attuale:

- image optimization policy:
  - immagini annunci migrate a `next/image` su:
    - `apps/web/app/annunci/search-listings-client.tsx`
    - `apps/web/app/annunci/[listingId]/page.tsx`
  - `hero` dettaglio con priorita alta (`priority`) e `sizes` espliciti
  - card lista risultati con `sizes` responsive e dimensioni note (`width`/`height`)
  - policy host immagini remoti in `apps/web/next.config.ts` (`localhost`, `127.0.0.1`, `minio`)
- lazy loading componenti non critici:
  - wrapper `apps/web/components/lazy-location-selector.tsx`
  - usato in:
    - `apps/web/app/home-content.tsx`
    - `apps/web/app/annunci/search-listings-client.tsx`
    - `apps/web/components/listing-create-form.tsx`
- query caching TanStack:
  - provider React Query in:
    - `apps/web/app/query-client-provider.tsx`
    - `apps/admin/app/query-client-provider.tsx`
  - ricerca annunci (`/annunci`) usa `useQuery` con:
    - `staleTime: 30s`
    - `gcTime: 5m`
    - `placeholderData` per transizione fluida tra query
    - retry limitato (`retry: 1`)
- riduzione JS non necessario:
  - home web usa navigazione client-side (`router.push`) al posto di `window.location.href`
- web vitals local check:
  - reporter locale in:
    - `apps/web/app/web-vitals-reporter.tsx`
    - `apps/admin/app/web-vitals-reporter.tsx`
  - attivi in development e tracciano metriche `LCP`, `CLS`, `INP` su console browser

## 15. Checklist QA M4.6 (manuale)

- `/annunci`:
  - verificare caricamento iniziale risultati e transizione fluida tra pagine/filtri (senza flicker aggressivo)
  - verificare card con immagini renderizzate correttamente via `next/image`
- `/annunci/<id>`:
  - verificare hero image caricata con priorita e gallery thumbs lazy
- `/` e `/account/listings/new`:
  - verificare che `LocationSelector` compaia con skeleton iniziale e resti funzionale (keyboard + selezione)
- console browser (dev mode):
  - verificare log metriche `[web-vitals]` / `[admin-web-vitals]` con `LCP`, `CLS`, `INP`
- smoke performance percepita:
  - navigazione home -> annunci -> dettaglio senza full reload inutili
