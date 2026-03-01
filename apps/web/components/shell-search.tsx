'use client';

import { usePathname } from 'next/navigation';
import Ricerca from './ricerca';

export function ShellSearch() {
  const pathname = usePathname();

  if (pathname === '/') {
    return null;
  }

  return (
    <div className="mb-6">
      <Ricerca showHeader={false} />
    </div>
  );
}
