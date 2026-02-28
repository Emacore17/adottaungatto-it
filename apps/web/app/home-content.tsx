'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  motionPresets,
} from '@adottaungatto/ui';
import { motion } from 'framer-motion';
import { Heart, House, type LucideIcon, PawPrint } from 'lucide-react';
import Link from 'next/link';
import { ListingCard } from '../components/listing-card';
import { mockListings } from '../mocks/listings';

const featuredListings = mockListings.slice(0, 6);
const nearbyListings = [...mockListings]
  .sort((left, right) => (left.distanceKm ?? 999) - (right.distanceKm ?? 999))
  .slice(0, 3);

const trustBullets = [
  'Annunci moderati con policy anti-truffa e controllo immagini.',
  'Badge Verificato su inserzionisti con storico affidabile.',
  'Canali di contatto tracciati e report listing in un clic.',
];

const steps = [
  {
    title: '1. Cerca con filtri smart',
    description: 'Zona, età, sesso e tipo annuncio in un flusso rapido anche da mobile.',
  },
  {
    title: "2. Parla con l'inserzionista",
    description: 'Messaggi integrati e profilo venditore con rating e recensioni.',
  },
  {
    title: '3. Concludi in sicurezza',
    description: 'Checklist anti-truffa, verifiche pre-affido e supporto dedicato.',
  },
];

const testimonials = [
  {
    author: 'Laura, Torino',
    quote: 'In tre giorni ho trovato la famiglia perfetta: percorso chiaro e serio.',
  },
  {
    author: 'Davide, Roma',
    quote: 'Filtri comodi da smartphone e contatto immediato con il rescue.',
  },
  {
    author: 'Martina, Firenze',
    quote: 'UI pulita, annuncio completo e zero frizioni nel processo di affido.',
  },
];

const highlightPillars: Array<{ title: string; subtitle: string; Icon: LucideIcon }> = [
  {
    title: 'Adozioni sicure',
    subtitle: 'Moderazione attiva e profili verificati',
    Icon: Heart,
  },
  {
    title: 'Tantissimi gattini',
    subtitle: 'Nuovi annunci ogni giorno in tutta Italia',
    Icon: PawPrint,
  },
  {
    title: 'Nuove famiglie felici',
    subtitle: 'Percorso chiaro fino al contatto finale',
    Icon: House,
  },
];

const sectionReveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  viewport: { once: true, amount: 0.18 },
} as const;

export function HomeContent() {
  return (
    <main className="-mt-6 mx-auto w-full max-w-[1280px] space-y-10 px-4 pb-12 sm:px-6 lg:px-8">
      <section className="relative min-h-screen overflow-hidden rounded-[2.35rem] border border-[var(--color-border)] bg-[var(--color-surface-overlay)] shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <motion.div
          animate={{ scale: [1, 1.035, 1], x: [0, 8, 0], y: [0, -10, 0] }}
          className="absolute -left-12 top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(244,186,162,0.5),transparent_68%)]"
          transition={{ duration: 10, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          animate={{ scale: [1, 1.04, 1], x: [0, -8, 0], y: [0, 8, 0] }}
          className="absolute -right-14 top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(232,180,206,0.42),transparent_70%)]"
          transition={{ duration: 12, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
        />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.78),transparent_70%)]" />
        <div className="absolute left-[8%] top-[32%] hidden opacity-20 md:block">
          <PawPrint className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <div className="absolute right-[10%] top-[28%] hidden opacity-20 md:block">
          <PawPrint className="h-9 w-9 text-[var(--color-primary)]" />
        </div>

        <motion.div
          animate={motionPresets.sectionEnter.animate}
          className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-28 sm:px-8 sm:pt-32"
          initial={motionPresets.sectionEnter.initial}
          transition={motionPresets.sectionEnter.transition}
        >
          <div className="w-full max-w-5xl space-y-6 text-center">
            <h1 className="mx-auto max-w-4xl text-balance text-4xl font-semibold text-[var(--color-text)] sm:text-6xl">
              Trova il tuo nuovo amico felino
            </h1>
            <p className="mx-auto max-w-2xl text-base text-[var(--color-text-muted)]">
              Cerca gatti e gattini in adozione vicino a te.
            </p>

            <form
              action="/cerca"
              className="mx-auto grid gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)] p-2 shadow-[var(--shadow-sm)] lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
            >
              <label className="sr-only" htmlFor="home-query">
                Cerca annunci
              </label>
              <input
                className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
                id="home-query"
                name="q"
                placeholder="Cerca una parola chiave..."
              />
              <input
                className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
                name="locationLabel"
                placeholder="Località"
              />
              <input
                className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
                name="breed"
                placeholder="Razza"
              />
              <select
                className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
                name="sex"
              >
                <option value="">Sesso</option>
                <option value="femmina">Femmina</option>
                <option value="maschio">Maschio</option>
              </select>
              <Button className="h-12 px-8" type="submit">
                Cerca
              </Button>
            </form>
          </div>

          <div className="mt-10 grid w-full max-w-5xl gap-4 border-t border-[var(--color-border)] pt-6 md:grid-cols-3">
            {highlightPillars.map((pillar) => (
              <motion.div
                className="px-4 py-3 text-center"
                key={pillar.title}
                transition={motionPresets.hoverLift.transition}
                whileHover={motionPresets.hoverLift.whileHover}
                whileTap={motionPresets.hoverLift.whileTap}
              >
                <span className="mx-auto mb-3 inline-flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-border)] bg-[radial-gradient(circle,rgba(252,225,210,0.92),rgba(255,250,247,0.64))] text-[var(--color-primary)] shadow-[var(--shadow-sm)]">
                  <pillar.Icon className="h-9 w-9" />
                </span>
                <p className="font-display text-[1.65rem] font-semibold text-[var(--color-text)] sm:text-[1.9rem]">
                  {pillar.title}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">{pillar.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <motion.section
        className="space-y-4"
        initial={sectionReveal.initial}
        transition={sectionReveal.transition}
        viewport={sectionReveal.viewport}
        whileInView={sectionReveal.whileInView}
      >
        <div className="flex items-center justify-between">
          <h2>Nuovi annunci</h2>
          <Link className="text-sm font-medium text-[var(--color-primary)]" href="/cerca">
            Vedi tutti
          </Link>
        </div>
        <motion.div
          animate={motionPresets.staggerContainer.animate}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          initial={motionPresets.staggerContainer.initial}
          viewport={sectionReveal.viewport}
          whileInView={motionPresets.staggerContainer.animate}
        >
          {featuredListings.map((listing) => (
            <motion.div
              key={listing.id}
              transition={motionPresets.staggerItem.transition}
              variants={motionPresets.staggerItem}
            >
              <ListingCard listing={listing} />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="space-y-4"
        initial={sectionReveal.initial}
        transition={sectionReveal.transition}
        viewport={sectionReveal.viewport}
        whileInView={sectionReveal.whileInView}
      >
        <h2>Vicini a te</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {nearbyListings.map((listing) => (
            <Card
              className="border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)]"
              key={listing.id}
            >
              <CardHeader>
                <CardTitle className="text-base">{listing.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <p>
                  {listing.city} ({listing.province}) - {listing.distanceKm?.toFixed(1)} km
                </p>
                <Link className="text-[var(--color-primary)]" href={`/annunci/${listing.slug}`}>
                  Apri annuncio
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="grid gap-4 lg:grid-cols-2"
        initial={sectionReveal.initial}
        transition={sectionReveal.transition}
        viewport={sectionReveal.viewport}
        whileInView={sectionReveal.whileInView}
      >
        <Card className="border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)]">
          <CardHeader>
            <CardTitle>Adozione vs vendita: policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>
              La piattaforma privilegia adozioni responsabili. Gli annunci con contributo spese
              devono essere chiari e conformi alle linee guida.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>No pratiche abusive o cessioni non tracciate.</li>
              <li>Documentazione sanitaria consigliata nel dettaglio annuncio.</li>
              <li>Moderazione manuale per contenuti sensibili.</li>
            </ul>
            <Link className="font-medium text-[var(--color-primary)]" href="/termini">
              Leggi policy completa
            </Link>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)]">
          <CardHeader>
            <CardTitle>Sicurezza anti-truffa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <ul className="list-disc space-y-1 pl-5">
              {trustBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <Link className="font-medium text-[var(--color-primary)]" href="/sicurezza">
              Apri guida sicurezza
            </Link>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        className="space-y-4"
        initial={sectionReveal.initial}
        transition={sectionReveal.transition}
        viewport={sectionReveal.viewport}
        whileInView={sectionReveal.whileInView}
      >
        <h2>Come funziona</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <Card
              className="border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)]"
              key={step.title}
            >
              <CardHeader>
                <CardTitle className="text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--color-text-muted)]">
                {step.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="space-y-4"
        initial={sectionReveal.initial}
        transition={sectionReveal.transition}
        viewport={sectionReveal.viewport}
        whileInView={sectionReveal.whileInView}
      >
        <h2>Testimonianze</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card
              className="border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)]"
              key={testimonial.author}
            >
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm text-[var(--color-text-muted)]">"{testimonial.quote}"</p>
                <p className="text-xs font-semibold text-[var(--color-text)]">
                  {testimonial.author}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>
    </main>
  );
}
