'use client';

import { cn } from '@adottaungatto/ui';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface ScrollAwareHeaderProps {
  children: ReactNode;
}

export function ScrollAwareHeader({ children }: ScrollAwareHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 4);
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollState);
    };
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300',
        isScrolled
          ? 'shadow-[0_6px_16px_rgb(0_0_0_/_0.04)] backdrop-blur-xl'
          : 'border-transparent bg-transparent backdrop-blur-0',
      )}
      style={
        isScrolled
          ? {
              backgroundColor: 'color-mix(in srgb, var(--color-header-overlay) 42%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-border) 55%, transparent)',
            }
          : undefined
      }
    >
      {children}
    </header>
  );
}
