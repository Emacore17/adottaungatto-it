'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  cn,
} from '@adottaungatto/ui';
import {
  ChevronRight,
  Compass,
  Home,
  LogIn,
  LogOut,
  MessageCircle,
  PlusCircle,
  Search,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { type ShellNavMatchMode, isShellNavLinkActive } from './shell-nav-link';
import { ThemeToggle } from './theme-toggle';

interface MobileNavItem {
  href: string;
  label: string;
  matchMode?: ShellNavMatchMode;
}

interface MobileNavMenuProps {
  appName: string;
  isAuthenticated: boolean;
  items: readonly MobileNavItem[];
}

const resolveMobileNavItemIcon = (href: string): LucideIcon => {
  if (href === '/') {
    return Home;
  }
  if (href.startsWith('/annunci')) {
    return Search;
  }
  if (href.startsWith('/pubblica')) {
    return PlusCircle;
  }
  if (href.startsWith('/messaggi')) {
    return MessageCircle;
  }
  if (href.startsWith('/account')) {
    return UserRound;
  }
  return Compass;
};

export function MobileNavMenu({ appName, isAuthenticated, items }: MobileNavMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const menuTitleId = `${menuId}-title`;
  const menuDescriptionId = `${menuId}-description`;

  useEffect(() => {
    if (!pathname) {
      return;
    }
    setIsOpen(false);
  }, [pathname]);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <button
          aria-label={isOpen ? 'Chiudi menu di navigazione' : 'Apri menu di navigazione'}
          aria-controls={menuId}
          aria-expanded={isOpen}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_90%,white_10%)] text-[var(--color-text)] shadow-[0_10px_24px_rgb(42_28_33_/_0.1)] transition-[background-color,border-color,box-shadow] duration-200 hover:bg-[var(--color-surface-muted)] hover:shadow-[0_14px_28px_rgb(42_28_33_/_0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] lg:hidden"
          type="button"
        >
          {isOpen ? (
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              viewBox="0 0 24 24"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 8l8 8M16 8l-8 8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              viewBox="0 0 24 24"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          )}
        </button>
      </DialogTrigger>

      <DialogContent
        aria-describedby={menuDescriptionId}
        aria-label="Menu"
        className={cn(
          '[&>button]:hidden lg:hidden mobile-nav-panel',
          'left-auto right-0 top-0 h-[100dvh] max-h-none w-[min(92vw,24.5rem)] translate-x-0 translate-y-0 rounded-none rounded-l-[30px]',
          'border-b-0 border-l border-r-0 border-t-0 bg-[var(--color-bg-canvas)] p-0 shadow-[0_28px_78px_rgb(14_10_12_/_0.24)]',
          'data-[state=closed]:translate-x-10 data-[state=closed]:opacity-0 data-[state=open]:translate-x-0 data-[state=open]:opacity-100',
        )}
        id={menuId}
      >
        <section className="flex h-full min-h-0 flex-col" data-test-mobile-nav-menu="true">
          <header className="relative overflow-hidden border-b border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] px-4 pb-4 pt-4">
            <div aria-hidden="true" className="mobile-nav-aura" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-3">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--color-border)_72%,white_28%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_92%,white_8%)] px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                  Menu
                </span>
                <div className="space-y-1">
                  <DialogTitle
                    className="truncate text-lg font-semibold tracking-tight text-[var(--color-text)]"
                    id={menuTitleId}
                  >
                    {appName}
                  </DialogTitle>
                  <DialogDescription
                    className="text-sm leading-6 text-[var(--color-text-muted)]"
                    id={menuDescriptionId}
                  >
                    Navigazione principale e azioni rapide ottimizzate per mobile.
                  </DialogDescription>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Chiudi menu di navigazione"
                  className="relative z-10 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="18"
                    viewBox="0 0 24 24"
                    width="18"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 8l8 8M16 8l-8 8"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              </DialogClose>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <nav aria-label="Menu principale" className="flex flex-col gap-2.5">
              {items.map((item) => {
                const isActive = isShellNavLinkActive(pathname, item.href, item.matchMode);
                const Icon = resolveMobileNavItemIcon(item.href);

                return (
                  <DialogClose asChild key={`mobile-nav-${item.href}`}>
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'group flex min-h-[54px] items-center justify-between rounded-[22px] border px-4 py-3 shadow-[0_10px_24px_rgb(42_28_33_/_0.08)] transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]',
                        isActive
                          ? 'border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-border)_72%)] bg-[color:color-mix(in_srgb,var(--color-primary)_11%,var(--color-surface-elevated)_89%)] text-[var(--color-text)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
                      )}
                      data-mobile-nav-link="true"
                      href={item.href}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                            isActive
                              ? 'border-[color:color-mix(in_srgb,var(--color-primary)_34%,var(--color-border)_66%)] bg-[color:color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface)_86%)]'
                              : 'border-[color:color-mix(in_srgb,var(--color-border)_84%,white_16%)] bg-[color:color-mix(in_srgb,var(--color-surface)_90%,white_10%)]',
                          )}
                        >
                          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                        </span>
                        <span className="truncate text-[1.02rem] font-semibold leading-none">
                          {item.label}
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 group-hover:translate-x-0.5',
                          isActive ? 'text-[var(--color-primary)]' : '',
                        )}
                      />
                    </Link>
                  </DialogClose>
                );
              })}
            </nav>
          </div>

          <section className="space-y-3 border-t border-[var(--color-border)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Azioni rapide
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <DialogClose asChild>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                  href="/pubblica"
                >
                  <PlusCircle aria-hidden="true" className="h-4 w-4" />
                  Pubblica
                </Link>
              </DialogClose>
              <DialogClose asChild>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                  href={isAuthenticated ? '/messaggi' : '/login'}
                >
                  {isAuthenticated ? (
                    <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <LogIn aria-hidden="true" className="h-4 w-4" />
                  )}
                  {isAuthenticated ? 'Messaggi' : 'Login'}
                </Link>
              </DialogClose>
            </div>

            <div className="flex min-h-[52px] items-center justify-between rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
              <span className="text-sm font-medium text-[var(--color-text)]">Tema</span>
              <ThemeToggle />
            </div>

            {isAuthenticated ? (
              <form action="/api/auth/logout" className="w-full" method="post">
                <button
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                  type="submit"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Logout
                </button>
              </form>
            ) : null}
          </section>
        </section>
      </DialogContent>
    </Dialog>
  );
}
