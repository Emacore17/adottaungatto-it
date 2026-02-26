'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/cerca', label: 'Cerca' },
  { href: '/preferiti', label: 'Preferiti' },
  { href: '/messaggi', label: 'Messaggi' },
  { href: '/account', label: 'Account' },
];

const isPathActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione rapida mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-2 pb-[calc(env(safe-area-inset-bottom,0rem)+0.35rem)] pt-2 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid w-full max-w-[1280px] grid-cols-5 gap-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              className={[
                'flex min-h-11 items-center justify-center rounded-xl px-2 text-[11px] font-medium transition-colors',
                isPathActive(pathname, link.href)
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
              href={link.href}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
