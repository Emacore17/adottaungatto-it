'use client';

import { cn } from '@adottaungatto/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type ShellNavMatchMode = 'exact' | 'prefix';

const resolveHref = (href: string) => href.replace(/\/+$/u, '') || '/';

export const isShellNavLinkActive = (
  pathname: string | null,
  href: string,
  matchMode: ShellNavMatchMode = 'prefix',
) => {
  if (!pathname) {
    return false;
  }

  const normalizedPathname = resolveHref(pathname);
  const normalizedHref = resolveHref(href);

  if (matchMode === 'exact' || normalizedHref === '/') {
    return normalizedPathname === normalizedHref;
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  );
};

interface ShellNavLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, 'href'> {
  activeOverride?: boolean;
  activeClassName?: string;
  children: ReactNode;
  href: string;
  inactiveClassName?: string;
  matchMode?: ShellNavMatchMode;
}

export function ShellNavLink({
  activeOverride,
  activeClassName,
  children,
  className,
  href,
  inactiveClassName,
  matchMode = 'prefix',
  ...props
}: ShellNavLinkProps) {
  const pathname = usePathname();
  const isActive =
    typeof activeOverride === 'boolean'
      ? activeOverride
      : isShellNavLinkActive(pathname, href, matchMode);

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={cn(className, isActive ? activeClassName : inactiveClassName)}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
