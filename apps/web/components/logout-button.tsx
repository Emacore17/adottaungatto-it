'use client';

import { Button } from '@adottaungatto/ui';
import { useState } from 'react';

export function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'x-auth-mode': 'spa',
        },
      });

      let redirectTo = '/login';
      if (response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | {
              redirectTo?: string;
            }
          | null;
        if (typeof payload?.redirectTo === 'string' && payload.redirectTo.length > 0) {
          redirectTo = payload.redirectTo;
        }
      }

      window.location.assign(redirectTo);
    } catch {
      window.location.assign('/login');
    }
  };

  return (
    <Button disabled={isPending} onClick={handleLogout} size="sm" type="button" variant="secondary">
      {isPending ? 'Uscita...' : 'Logout'}
    </Button>
  );
}
