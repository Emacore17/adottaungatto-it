import { loadWebEnv } from '@adottaungatto/config';
import { Button } from '@adottaungatto/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getWebSession } from '../lib/auth';
import { LinkButton } from './link-button';
import { MobileNavMenu } from './mobile-nav-menu';
import { ScrollAwareHeader } from './scroll-aware-header';
import { ShellSearch } from './shell-search';
import { ThemeToggle } from './theme-toggle';

const primaryNavigation = [
  { href: '/', label: 'Home' },
  { href: '/annunci', label: 'Annunci' },
  { href: '/pubblica', label: 'Pubblica' },
  { href: '/account', label: 'Account' },
] as const;

const footerNavigation = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/termini', label: 'Termini' },
  { href: '/contatti', label: 'Contatti' },
  { href: '/faq', label: 'FAQ' },
] as const;

const navLinkClassName =
  'rounded-full px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]';

interface AppShellProps {
  children: ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const env = loadWebEnv();
  const session = await getWebSession().catch(() => null);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <ScrollAwareHeader>
        <div className="mx-auto flex h-[var(--shell-header-height)] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <Link className="flex min-w-0 items-center gap-3 lg:justify-self-start" href="/">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)]"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              }}
            >
              AG
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                {env.NEXT_PUBLIC_APP_NAME}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:col-start-2 lg:flex lg:justify-self-center">
            {primaryNavigation.map((item) => (
              <Link className={navLinkClassName} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 lg:col-start-3 lg:justify-self-end">
            <MobileNavMenu items={primaryNavigation} />

            <ThemeToggle />
            {session ? (
              <>
                <LinkButton
                  className="hidden h-9 px-3 sm:inline-flex"
                  href="/account"
                  variant="outline"
                >
                  Account
                </LinkButton>
                <form action="/api/auth/logout" method="post">
                  <Button size="sm" type="submit" variant="secondary">
                    Logout
                  </Button>
                </form>
              </>
            ) : (
              <LinkButton className="h-9 gap-2 px-3" href="/login">
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="16"
                  viewBox="0 0 24 24"
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
                Login
              </LinkButton>
            )}
          </div>
        </div>
      </ScrollAwareHeader>

      <main className="relative mx-auto w-full max-w-6xl px-4 py-[var(--shell-main-padding)] sm:px-6">
        <ShellSearch />
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Una piattaforma semplice per adottare, offrire stallo o pubblicare annunci dedicati ai
              gatti.
            </p>
            <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">
              Ricerca rapida, pagine leggere e temi coerenti facilitano la consultazione degli
              annunci, sia in modalità chiara sia scura.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {footerNavigation.map((item) => (
              <Link className={navLinkClassName} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
