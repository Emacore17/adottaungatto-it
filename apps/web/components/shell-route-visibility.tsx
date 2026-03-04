'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export type WebRouteSection =
  | 'marketing'
  | 'discovery'
  | 'auth'
  | 'workspace'
  | 'system';

const authPaths = new Set(['/login', '/registrati', '/password-dimenticata']);
const systemPaths = new Set(['/500']);

export const isDiscoveryCatalogPath = (pathname: string | null) =>
  pathname === '/annunci' || pathname === '/cerca';

const isWorkspacePath = (pathname: string) => {
  return (
    pathname.startsWith('/account') ||
    pathname.startsWith('/messaggi') ||
    pathname.startsWith('/preferiti') ||
    pathname === '/pubblica' ||
    /^\/annunci\/[^/]+\/modifica$/u.test(pathname)
  );
};

const isDiscoveryPath = (pathname: string) => {
  return pathname === '/annunci' || pathname === '/cerca' || /^\/annunci\/[^/]+$/u.test(pathname);
};

export const getWebRouteSection = (pathname: string | null): WebRouteSection => {
  if (!pathname) {
    return 'marketing';
  }

  if (authPaths.has(pathname)) {
    return 'auth';
  }

  if (systemPaths.has(pathname)) {
    return 'system';
  }

  if (isWorkspacePath(pathname)) {
    return 'workspace';
  }

  if (isDiscoveryPath(pathname)) {
    return 'discovery';
  }

  return 'marketing';
};

export function ShellRouteVisibility({
  children,
  sections,
}: {
  children: ReactNode;
  sections: WebRouteSection[];
}) {
  const pathname = usePathname();
  const section = getWebRouteSection(pathname);

  if (!sections.includes(section)) {
    return null;
  }

  return <>{children}</>;
}
