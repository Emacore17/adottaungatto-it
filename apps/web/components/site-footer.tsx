import Link from 'next/link';

const footerSections = [
  {
    title: 'Piattaforma',
    links: [
      { href: '/faq', label: 'FAQ' },
      { href: '/contatti', label: 'Contatti' },
      { href: '/chi-siamo', label: 'Chi siamo' },
      { href: '/lavora-con-noi', label: 'Lavora con noi' },
    ],
  },
  {
    title: 'Policy e Sicurezza',
    links: [
      { href: '/sicurezza', label: 'Anti-truffa' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/termini', label: 'Termini' },
      { href: '/cookie', label: 'Cookie' },
    ],
  },
  {
    title: 'Area Utente',
    links: [
      { href: '/pubblica', label: 'Pubblica annuncio' },
      { href: '/preferiti', label: 'Preferiti' },
      { href: '/messaggi', label: 'Messaggi' },
      { href: '/account', label: 'Dashboard' },
    ],
  },
];

const socialLinks = [
  { href: '#', label: 'Instagram' },
  { href: '#', label: 'Facebook' },
  { href: '#', label: 'YouTube' },
];

const year = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--color-border)] bg-[var(--color-surface-overlay)] backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <p className="font-display text-xl font-semibold text-[var(--color-text)]">
              adottaungatto.it
            </p>
            <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
              Marketplace italiano per adozioni, stalli e segnalazioni con moderazione attiva,
              contatti tracciati e user experience premium.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2 py-1 text-[var(--color-success-fg)]">
                Inserzionisti verificati
              </span>
              <span>Supporto 7 giorni su 7</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {socialLinks.map((link) => (
                <Link
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-overlay-strong)] px-3 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
                  href={link.href}
                  key={link.label}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {footerSections.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">{section.title}</h2>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} adottaungatto.it. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-4">
            <Link className="transition-colors hover:text-[var(--color-text)]" href="/sicurezza">
              Sicurezza
            </Link>
            <Link className="transition-colors hover:text-[var(--color-text)]" href="/contatti">
              Assistenza
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
