# UX_UI_GUIDELINES.md

Regole operative UX/UI per mantenere qualità premium su web + admin.

## 1. Layout e navigazione

- Ogni pagina deve avere shell coerente (header/nav + footer sul web, sidebar/topbar su admin).
- CTA primaria sempre raggiungibile:
  - web mobile: sticky/bottom nav dove utile
  - admin: quick actions in topbar e pagine core
- Nessun overflow orizzontale sui breakpoint target.

## 2. Responsive (mobile-first)

Breakpoint di controllo manuale obbligatorio:

- `360x800`
- `390x844`
- `768x1024`
- `1024x768`
- `1440x900`

Regole:

- filtri ricerca in drawer/sheet su mobile
- griglie che degradano a 1 colonna senza perdita funzionale
- tap target >= 40px
- contenuti lunghi in card con clamp o wrapping controllato

## 3. Stati UX obbligatori

Ogni route chiave deve gestire:

- loading: skeleton o placeholder chiaro
- empty: messaggio utile + CTA alternativa
- error: messaggio comprensibile + retry

Nessuna pagina core deve restare in stato bloccato senza via d uscita.

## 4. Motion

Principi:

- transizioni 160-320ms
- easing morbido, no bounce aggressivo
- motion funzionale (orienta, non distrae)

Pattern consigliati:

- page enter leggero (fade + y)
- hover lift su card cliccabili
- crossfade su cambi stato risultati
- drawer/dialog con apertura coerente

## 5. Typography e spacing

- gerarchia heading esplicita e consistente
- body copy leggibile (14-16px)
- spacing basato su multipli costanti (4/8)
- no muri di testo: usare card/sezioni con ritmo visivo

## 6. Componenti e pattern

Pattern ricorrenti da mantenere:

- badge verificato
- chips filtri attivi + reset
- card annuncio con media + metadata + CTA
- blocchi trust/sicurezza
- tabelle admin pulite con densità controllata

## 7. Accessibilità minima

- focus visible sempre presente
- label associate ai controlli form
- aria-label per controlli icon-only / azioni critiche
- testo/contrasto compatibile con light e dark mode
- navigazione keyboard funzionante su dialog, form, filtri

## 8. Performance percepita

- evitare layout shift visibile (skeleton + dimensioni media note)
- immagini ottimizzate (`next/image` quando possibile)
- fallback mock rapido quando backend non pronto
- no errori console lato web/admin

## 9. Mock UX policy

Con `NEXT_PUBLIC_USE_MOCKS=1`:

- mostrare feature non ancora backend-complete senza blocchi UX
- preferire dati deterministici e tipizzati
- tentare endpoint reale prima, fallback mock quando endpoint non pronto/non disponibile

Feature mock minime da mantenere:

- preferiti
- messaggi (thread + chat)
- recensioni venditore
- notifiche
- KPI/admin data non disponibili

## 10. Done criteria UX/UI

Una milestone UI è “done” solo se:

- route sitemap presenti e navigabili
- mobile e desktop coerenti senza rotture
- loading/empty/error implementati sulle pagine core
- brand consistency rispettata (palette, ombre, componenti, tone)
- build/lint/typecheck verdi
