'use client';

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { NotificationsMenu } from './notifications-menu';
import { ThemeToggle } from './theme-toggle';

const mainLinks = [
  { href: '/', label: 'Home' },
  { href: '/cerca', label: 'Cerca' },
  { href: '/preferiti', label: 'Preferiti' },
  { href: '/messaggi', label: 'Messaggi' },
  { href: '/account', label: 'Account' },
];

const topLinks = [
  { href: '/faq', label: 'Come funziona' },
  { href: '/sicurezza', label: 'Consigli' },
  { href: '/contatti', label: 'Contatti' },
];

const quickFilters = [
  { href: '/cerca?listingType=adozione', label: 'Adozione' },
  { href: '/cerca?listingType=stallo', label: 'Stallo' },
  { href: '/cerca?listingType=segnalazione', label: 'Segnalazioni' },
  { href: '/cerca?sex=femmina', label: 'Femmine' },
  { href: '/cerca?sex=maschio', label: 'Maschi' },
];

const isPathActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const placeholder = useMemo(() => 'Cerca per razza, zona o keyword', []);
  const isHome = pathname === '/';

  return (
    <header
      className={[
        isHome
          ? 'absolute inset-x-0 top-0 z-50 px-2 pt-4 sm:px-4'
          : 'sticky top-3 z-50 px-2 sm:px-4',
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto w-full max-w-[1280px] overflow-hidden rounded-[1.6rem] border border-[var(--color-border)] shadow-[var(--shadow-lg)]',
          isHome
            ? 'bg-[var(--color-surface-overlay)] backdrop-blur-xl'
            : 'bg-[var(--color-surface-overlay-strong)] backdrop-blur-md',
        ].join(' ')}
      >
        <div
          className={[
            'flex items-center gap-3 px-4 py-3 sm:px-5',
            'border-b border-[var(--color-border)]',
          ].join(' ')}
        >
          <Link className="group inline-flex items-center gap-2" href="/">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)]">
              AG
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-none text-[var(--color-text)]">
                adottaungatto.it
              </p>
              <p className="hidden text-xs text-[var(--color-text-muted)] sm:block">
                Annunci verificati in Italia
              </p>
            </div>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {topLinks.map((link) => (
              <Link
                className={[
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isPathActive(pathname, link.href)
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
                ].join(' ')}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <ThemeToggle />
            <NotificationsMenu />
            <Link href="/login">
              <Button size="sm" variant="outline">
                Login
              </Button>
            </Link>
            <Link href="/pubblica">
              <Button size="sm">Annuncio</Button>
            </Link>
          </div>

          <Button
            className="sm:hidden"
            onClick={() => setIsMenuOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            Menu
          </Button>
        </div>

        {!isHome ? (
          <div className="grid gap-3 px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <form action="/cerca">
              <label className="sr-only" htmlFor="global-search-input">
                Cerca annunci
              </label>
              <input
                className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)] shadow-[var(--shadow-sm)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
                id="global-search-input"
                name="q"
                placeholder={placeholder}
              />
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {quickFilters.map((filter) => (
                <Link
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)]"
                  href={filter.href}
                  key={filter.href}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Dialog onOpenChange={setIsMenuOpen} open={isMenuOpen}>
        <DialogContent className="left-auto right-0 top-0 h-dvh w-full max-w-[88vw] translate-x-0 translate-y-0 rounded-none border-l border-[var(--color-border)] p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Navigazione</DialogTitle>
          </DialogHeader>
          <nav className="mt-3 space-y-2">
            {[...topLinks, ...mainLinks].map((link) => (
              <Link
                className={[
                  'block rounded-xl px-3 py-2 text-sm',
                  isPathActive(pathname, link.href)
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
                ].join(' ')}
                href={link.href}
                key={`${link.href}-${link.label}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="grid gap-2 pt-3">
              <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full" variant="outline">
                  Login
                </Button>
              </Link>
              <Link href="/pubblica" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full">Pubblica annuncio</Button>
              </Link>
            </div>
          </nav>
        </DialogContent>
      </Dialog>
    </header>
  );
}
