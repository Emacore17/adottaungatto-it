import { loadWebEnv } from '@adottaungatto/config';
import { Badge, Button, cn } from '@adottaungatto/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getWebSession } from '../lib/auth';
import { LinkButton } from './link-button';
import Ricerca from './ricerca';
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_55%)]" />

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-header-overlay)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link className="flex min-w-0 flex-1 items-center gap-3" href="/">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)]">
              AG
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                {env.NEXT_PUBLIC_APP_NAME}
              </p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">Web scaffold reset</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {primaryNavigation.map((item) => (
              <Link className={navLinkClassName} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Badge
              className={cn('hidden max-w-[220px] truncate md:inline-flex')}
              variant={session ? 'success' : 'secondary'}
            >
              {session ? session.user.email : 'Guest'}
            </Badge>
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
              <LinkButton className="h-9 px-3" href="/login">
                Login
              </LinkButton>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] lg:hidden">
          <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {primaryNavigation.map((item) => (
              <Link className={navLinkClassName} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <Ricerca showHeader={false} />
        </div>
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Frontend riportato a una base pulita.
            </p>
            <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">
              Next.js App Router, UI condivisa, theme switching, motion centralizzato e collegamenti
              a backend, API e autenticazione restano disponibili come fondamenta del rebuild.
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
