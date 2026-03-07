'use client';

import { Button } from '@adottaungatto/ui';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        aria-label="Caricamento tema"
        className="h-11 w-11 p-0 lg:h-9 lg:w-9"
        size="sm"
        variant="outline"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="16"
          viewBox="0 0 24 24"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      aria-pressed={isDark}
      className="h-11 w-11 p-0 lg:h-9 lg:w-9"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      size="sm"
      title={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      type="button"
      variant="outline"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="16"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isDark ? (
          <path
            d="M18 14.5A7.5 7.5 0 1 1 9.5 6a6.2 6.2 0 0 0 8.5 8.5Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </>
        )}
      </svg>
    </Button>
  );
}
