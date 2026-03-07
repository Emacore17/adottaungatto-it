import { loadWebEnv } from '@adottaungatto/config';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getWebSession, getWebSessionCookiePayload } from '../lib/auth';
import { LinkButton } from './link-button';
import { LogoutButton } from './logout-button';
import { MobileNavMenu } from './mobile-nav-menu';
import { ScrollAwareHeader } from './scroll-aware-header';
import { SessionExpiryMonitor } from './session-expiry-monitor';
import { ShellNavLink, type ShellNavMatchMode } from './shell-nav-link';
import { ShellRouteVisibility } from './shell-route-visibility';
import { ThemeToggle } from './theme-toggle';

interface NavigationItem {
  href: string;
  label: string;
  matchMode?: ShellNavMatchMode;
}

const baseNavigation: NavigationItem[] = [
  { href: '/', label: 'Home', matchMode: 'exact' },
  { href: '/annunci', label: 'Annunci' },
  { href: '/pubblica', label: 'Pubblica', matchMode: 'exact' },
];

const footerNavigation = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/termini', label: 'Termini' },
  { href: '/contatti', label: 'Contatti' },
  { href: '/faq', label: 'FAQ' },
] as const;

const desktopNavLinkClassName =
  'rounded-full px-3.5 py-2 text-sm font-medium transition-[background-color,color,box-shadow]';
const desktopNavLinkActiveClassName =
  'bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-[var(--shadow-sm)]';
const desktopNavLinkInactiveClassName =
  'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]';
const footerLinkClassName =
  'rounded-full px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]';

interface AppShellProps {
  children: ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const env = loadWebEnv();
  const [session, sessionCookie] = await Promise.all([
    getWebSession().catch(() => null),
    getWebSessionCookiePayload().catch(() => null),
  ]);
  const primaryNavigation = session
    ? [
        ...baseNavigation,
        { href: '/messaggi', label: 'Messaggi' },
        { href: '/account', label: 'Account' },
      ]
    : baseNavigation;

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
              <ShellNavLink
                activeClassName={desktopNavLinkActiveClassName}
                className={desktopNavLinkClassName}
                href={item.href}
                inactiveClassName={desktopNavLinkInactiveClassName}
                key={item.href}
                matchMode={item.matchMode}
              >
                {item.label}
              </ShellNavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 lg:col-start-3 lg:justify-self-end">
            <MobileNavMenu
              appName={env.NEXT_PUBLIC_APP_NAME}
              isAuthenticated={Boolean(session)}
              items={primaryNavigation}
            />

            <div className="hidden items-center gap-2 lg:flex">
              <ThemeToggle />
              {session ? (
                <LogoutButton />
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
        </div>
      </ScrollAwareHeader>

      <main className="relative mx-auto w-full max-w-6xl px-4 py-[var(--shell-main-padding)] sm:px-6">
        {children}
      </main>
      <SessionExpiryMonitor
        enabled={Boolean(sessionCookie?.refreshToken)}
        initialExpiresAt={sessionCookie?.expiresAt ?? null}
      />

      <ShellRouteVisibility sections={['marketing', 'discovery']}>
        <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-text)]">
                Una piattaforma semplice per adottare, offrire stallo o pubblicare annunci dedicati
                ai gatti.
              </p>
              <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">
                Ricerca rapida, pagine leggere e temi coerenti facilitano la consultazione degli
                annunci, sia in modalita chiara sia scura.
              </p>
            </div>

            <nav className="flex flex-wrap gap-2">
              {footerNavigation.map((item) => (
                <Link className={footerLinkClassName} href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
      </ShellRouteVisibility>
    </div>
  );
}
