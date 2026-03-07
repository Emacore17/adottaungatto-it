'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { LinkButton } from './link-button';

interface BackToListingsButtonProps {
  fallbackHref?: string;
  preferredHref?: string | null;
}

const resolveListingsReferrerHref = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!document.referrer) {
    return null;
  }

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) {
      return null;
    }

    const normalizedPath = referrer.pathname.replace(/\/+$/u, '') || '/';
    if (normalizedPath !== '/annunci') {
      return null;
    }

    return `${normalizedPath}${referrer.search}${referrer.hash}`;
  } catch {
    return null;
  }
};

export function BackToListingsButton({
  fallbackHref = '/annunci',
  preferredHref = null,
}: BackToListingsButtonProps) {
  const router = useRouter();
  const targetHref = preferredHref ?? fallbackHref;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (preferredHref) {
      event.preventDefault();
      router.push(preferredHref);
      return;
    }

    const referrerHref = resolveListingsReferrerHref();
    if (!referrerHref) {
      return;
    }

    event.preventDefault();
    router.push(referrerHref);
  };

  return (
    <LinkButton href={targetHref} onClick={handleClick} variant="outline">
      Torna agli annunci
    </LinkButton>
  );
}
