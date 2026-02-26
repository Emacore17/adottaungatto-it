'use client';

import { Button } from '@adottaungatto/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminThemeToggle } from './theme-toggle';

interface AdminShellProps {
  children: ReactNode;
}

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/moderazione', label: 'Moderazione' },
  { href: '/admin/utenti', label: 'Utenti' },
  { href: '/admin/segnalazioni', label: 'Segnalazioni' },
  { href: '/admin/impostazioni', label: 'Impostazioni' },
  { href: '/admin/audit-log', label: 'Audit log' },
];

const isPathActive = (pathname: string, href: string) =>
  href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

const breadcrumbMap: Record<string, string> = {
  admin: 'Dashboard',
  moderazione: 'Moderazione',
  utenti: 'Utenti',
  segnalazioni: 'Segnalazioni',
  impostazioni: 'Impostazioni',
  'audit-log': 'Audit log',
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((segment) => breadcrumbMap[segment] ?? segment);

  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)] pb-8">
      <div className="mx-auto grid w-full max-w-[1480px] gap-4 px-4 py-4 md:grid-cols-[250px_minmax(0,1fr)] md:px-6 lg:px-8">
        <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:overflow-y-auto">
          <Link className="block rounded-xl px-2 py-2" href="/admin">
            <p className="font-admin-display text-lg font-semibold text-[var(--color-text)]">
              Admin Arena
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Moderazione e controllo qualità
            </p>
          </Link>
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => (
              <Link
                className={[
                  'block rounded-xl px-3 py-2 text-sm transition-colors',
                  isPathActive(pathname, item.href)
                    ? 'bg-[var(--color-primary)]/14 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
                ].join(' ')}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action="/api/auth/logout" className="mt-6" method="post">
            <Button className="w-full" type="submit" variant="secondary">
              Logout
            </Button>
          </form>
        </aside>

        <div className="space-y-4">
          <header className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Breadcrumb
                </p>
                <p className="text-sm text-[var(--color-text)]">{breadcrumbs.join(' / ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <AdminThemeToggle />
                <Link href="/admin/moderazione">
                  <Button size="sm">Apri coda</Button>
                </Link>
              </div>
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
