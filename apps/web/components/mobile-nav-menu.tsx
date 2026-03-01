'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MobileNavItem {
  href: string;
  label: string;
}

interface MobileNavMenuProps {
  items: readonly MobileNavItem[];
}

export function MobileNavMenu({ items }: MobileNavMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        aria-label={isOpen ? 'Chiudi menu di navigazione' : 'Apri menu di navigazione'}
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] lg:hidden"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
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
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        )}
      </button>

      {mounted && isOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] lg:hidden"
              style={{ backgroundColor: 'var(--color-bg-canvas)' }}
            >
              <div className="relative flex h-full flex-col px-6 pb-8 pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Menu
                  </p>
                  <button
                    aria-label="Chiudi menu di navigazione"
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
                    onClick={() => setIsOpen(false)}
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
                </div>

                <nav className="mt-8 flex flex-col gap-3">
                  {items.map((item) => (
                    <Link
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 py-4 text-xl font-semibold text-[var(--color-text)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-surface-muted)]"
                      href={item.href}
                      key={`mobile-nav-${item.href}`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
