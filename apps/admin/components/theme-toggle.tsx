'use client';

import { Button } from '@adottaungatto/ui';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function AdminThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button size="sm" variant="outline">
        Tema
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      size="sm"
      type="button"
      variant="outline"
    >
      {isDark ? 'Chiaro' : 'Scuro'}
    </Button>
  );
}
