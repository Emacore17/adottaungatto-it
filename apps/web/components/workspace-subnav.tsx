'use client';

import { cn } from '@adottaungatto/ui';
import { usePathname } from 'next/navigation';
import { ShellNavLink } from './shell-nav-link';

const isDashboardPath = (pathname: string) => pathname === '/account';

const isListingsPath = (pathname: string) => {
  return (
    pathname.startsWith('/account/annunci') ||
    pathname.startsWith('/account/listings') ||
    /^\/annunci\/[^/]+\/modifica$/u.test(pathname)
  );
};

const isMessagesPath = (pathname: string) => pathname.startsWith('/messaggi');

const isFavoritesPath = (pathname: string) => pathname.startsWith('/preferiti');

const isSettingsPath = (pathname: string) => {
  return pathname.startsWith('/account/impostazioni') || pathname.startsWith('/account/sicurezza');
};

const isPublishPath = (pathname: string) => pathname === '/pubblica';

const workspaceItems = [
  {
    href: '/account',
    label: 'Panoramica',
    matches: isDashboardPath,
  },
  {
    href: '/account/annunci',
    label: 'I miei annunci',
    matches: isListingsPath,
  },
  {
    href: '/messaggi',
    label: 'Messaggi',
    matches: isMessagesPath,
  },
  {
    href: '/preferiti',
    label: 'Preferiti',
    matches: isFavoritesPath,
  },
  {
    href: '/account/impostazioni',
    label: 'Impostazioni',
    matches: isSettingsPath,
  },
  {
    href: '/pubblica',
    label: 'Nuovo annuncio',
    matches: isPublishPath,
  },
] as const;

const subnavLinkClassName =
  'inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition-[background-color,color,box-shadow]';
const subnavLinkActiveClassName =
  'bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-[var(--shadow-sm)]';
const subnavLinkInactiveClassName =
  'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]';

interface WorkspaceSubnavProps {
  accountLabel?: string | null;
}

export function WorkspaceSubnav({ accountLabel = null }: WorkspaceSubnavProps) {
  const pathname = usePathname() ?? '/account';

  return (
    <div className="rounded-[30px] border border-[color:color-mix(in_srgb,var(--color-border)_82%,white_18%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_84%,white_16%)] p-2 shadow-[0_16px_44px_rgb(66_40_49_/_0.07)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="px-2 pt-1 sm:pt-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Workspace
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {accountLabel
              ? `Accesso attivo: ${accountLabel}.`
              : 'Annunci, messaggi, preferiti e impostazioni del tuo account.'}
          </p>
        </div>

        <nav
          aria-label="Navigazione area riservata"
          className="flex min-w-0 gap-2 overflow-x-auto pb-1 sm:justify-end"
        >
          {workspaceItems.map((item) => (
            <ShellNavLink
              activeClassName={subnavLinkActiveClassName}
              activeOverride={item.matches(pathname)}
              className={cn(subnavLinkClassName, 'shrink-0')}
              href={item.href}
              inactiveClassName={subnavLinkInactiveClassName}
              key={item.href}
              matchMode="exact"
            >
              {item.label}
            </ShellNavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
