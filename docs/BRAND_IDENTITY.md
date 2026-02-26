# BRAND_IDENTITY.md

## Visione

Brand mood: premium, caldo, affidabile, italiano, pet-friendly, non giocattoloso.

Obiettivo percezione UX:

- fiducia immediata (sicurezza, verifica, trasparenza)
- chiarezza operativa (ricerca veloce + CTA forti)
- cura editoriale (tipografia, spacing, motion sobri)

## Tone of Voice

- umano e diretto
- professionale ma non freddo
- orientato all azione concreta
- lessico semplice, italiano chiaro, no tecnicismi inutili

## Visual Direction

- Superfici: paper/glass leggero con blur moderato.
- Contrasto: testi leggibili e focus states evidenti.
- Motion: transizioni eleganti brevi (no effetti invasivi).
- Densita: alta in admin, piu ariosa nel web pubblico.

## Typography

Web:

- Sans: `Manrope` (`--font-sans`)
- Display: `Fraunces` (`--font-display`)

Admin:

- Sans: `IBM Plex Sans` (`--font-admin-sans`)
- Display: `Playfair Display` (`--font-admin-display`)

Regole:

- heading con tracking leggermente negativo
- body 14-16px su desktop, 14px su mobile
- testo funzionale admin piu compatto ma leggibile

## Palette

Web (warm premium):

- Primary: `#9d3f23`
- Primary hover: `#7f321c`
- Canvas: `#fdfaf6`
- Surface: `#fffdf9`
- Border: `#d8cfc2`
- Text: `#2b241f`

Admin (cool control):

- Primary: `#1d4ed8`
- Primary hover: `#1e40af`
- Canvas: `#f2f6fb`
- Surface: `#ffffff`
- Border: `#c9d8ee`
- Text: `#101a2b`

Dark mode:

- supportato su web/admin tramite `next-themes`
- variabili CSS dedicate (`.dark`) mantenendo contrasto AA

Semantic colors (condivise):

- success, warning, danger, info

## Gradienti e Ombre

- Gradients radial multi-spot su canvas (leggeri)
- Shadow soft:
  - `--shadow-sm` per card/input
  - `--shadow-lg` per hero/modal sezioni chiave
- Uso moderato: wow pulito, senza effetto eccessivo

## Pattern UI ricorrenti

- Badge `Verificato`
- Chips filtri rapidi
- Card annunci con media + metadata + CTA
- CTA primaria sempre visibile e chiara
- Footer professionale con trust links
- Admin shell con sidebar + topbar + breadcrumb + quick actions

## Motion

- Preset condivisi (`packages/ui/src/lib/motion.ts`)
- Durata tipica 160-320ms
- Hover/tap feedback su card e bottoni
- Crossfade su stati loading/error/empty/content

## Accessibility baseline

- focus-visible sempre visibile
- associazione label/controlli sui form
- aria-label su controlli interattivi critici
- contrasto testuale valido su light/dark

## Coerenza cross-site

- Web: emozionale, orientato conversione.
- Admin: operativo, ad alta leggibilita.
- Stesso DNA visuale tramite token CSS condivisi e componenti UI comuni.
