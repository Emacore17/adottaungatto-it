'use client';

import { Toast } from '@adottaungatto/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SESSION_EXPIRED_MESSAGE,
  WEB_SESSION_REFRESHED_EVENT,
  refreshWebSessionSilently,
} from '../lib/client-auth-fetch';

const WARNING_LEAD_MS = 2 * 60 * 1_000;
const AUTO_REFRESH_LEAD_MS = 60 * 1_000;
const EXPIRED_REDIRECT_DELAY_MS = 1_200;

interface SessionExpiryMonitorProps {
  enabled: boolean;
  initialExpiresAt: number | null;
}

const getCurrentPath = () => {
  if (typeof window === 'undefined') {
    return '/account';
  }

  const path = `${window.location.pathname}${window.location.search}`;
  return path.startsWith('/') ? path : '/account';
};

const parseExpiresAtFromRefreshEvent = (event: Event): number | null => {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail =
    typeof event.detail === 'object' && event.detail !== null && !Array.isArray(event.detail)
      ? (event.detail as Record<string, unknown>)
      : null;

  if (!detail) {
    return null;
  }

  const expiresAt = detail.expiresAt;
  return typeof expiresAt === 'number' && Number.isFinite(expiresAt) ? expiresAt : null;
};

export function SessionExpiryMonitor({ enabled, initialExpiresAt }: SessionExpiryMonitorProps) {
  const router = useRouter();
  const [expiresAt, setExpiresAt] = useState<number | null>(initialExpiresAt);
  const [showExpiringToast, setShowExpiringToast] = useState(false);
  const [showExpiredToast, setShowExpiredToast] = useState(false);

  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef(false);

  const clearScheduledTasks = useCallback(() => {
    if (warningTimeoutRef.current !== null) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (refreshTimeoutRef.current !== null) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    if (redirectTimeoutRef.current !== null) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }, []);

  const redirectToLogin = useCallback(() => {
    const nextPath = getCurrentPath();
    router.replace(`/login?next=${encodeURIComponent(nextPath)}&error=session_expired`);
    router.refresh();
  }, [router]);

  const scheduleRedirectToLogin = useCallback(() => {
    if (redirectTimeoutRef.current !== null) {
      clearTimeout(redirectTimeoutRef.current);
    }

    redirectTimeoutRef.current = setTimeout(() => {
      redirectToLogin();
    }, EXPIRED_REDIRECT_DELAY_MS);
  }, [redirectToLogin]);

  const refreshSession = useCallback(
    async ({ fromWarningAction = false }: { fromWarningAction?: boolean } = {}) => {
      if (!enabled || refreshInFlightRef.current) {
        return;
      }

      refreshInFlightRef.current = true;
      try {
        const result = await refreshWebSessionSilently();
        if (result.ok) {
          setShowExpiringToast(false);
          setShowExpiredToast(false);
          if (result.expiresAt !== null) {
            setExpiresAt(result.expiresAt);
          }
          return;
        }

        if (result.status === 401) {
          setShowExpiringToast(false);
          setShowExpiredToast(true);
          scheduleRedirectToLogin();
          return;
        }

        if (fromWarningAction) {
          setShowExpiringToast(true);
        }
      } finally {
        refreshInFlightRef.current = false;
      }
    },
    [enabled, scheduleRedirectToLogin],
  );

  useEffect(() => {
    if (!enabled) {
      setShowExpiringToast(false);
      setShowExpiredToast(false);
      clearScheduledTasks();
      return;
    }

    if (typeof initialExpiresAt === 'number' && Number.isFinite(initialExpiresAt)) {
      setExpiresAt(initialExpiresAt);
    }
  }, [clearScheduledTasks, enabled, initialExpiresAt]);

  useEffect(() => {
    if (!enabled || expiresAt === null) {
      clearScheduledTasks();
      return;
    }

    clearScheduledTasks();
    const now = Date.now();

    if (expiresAt <= now + AUTO_REFRESH_LEAD_MS) {
      void refreshSession();
      return;
    }

    const warningDelay = Math.max(0, expiresAt - WARNING_LEAD_MS - now);
    warningTimeoutRef.current = setTimeout(() => {
      setShowExpiringToast(true);
    }, warningDelay);

    const refreshDelay = Math.max(0, expiresAt - AUTO_REFRESH_LEAD_MS - now);
    refreshTimeoutRef.current = setTimeout(() => {
      void refreshSession();
    }, refreshDelay);

    return () => {
      if (warningTimeoutRef.current !== null) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      if (refreshTimeoutRef.current !== null) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [clearScheduledTasks, enabled, expiresAt, refreshSession]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleSessionRefreshed = (event: Event) => {
      const nextExpiresAt = parseExpiresAtFromRefreshEvent(event);
      if (nextExpiresAt !== null) {
        setExpiresAt(nextExpiresAt);
        setShowExpiringToast(false);
        setShowExpiredToast(false);
      }
    };

    window.addEventListener(WEB_SESSION_REFRESHED_EVENT, handleSessionRefreshed as EventListener);
    return () => {
      window.removeEventListener(
        WEB_SESSION_REFRESHED_EVENT,
        handleSessionRefreshed as EventListener,
      );
    };
  }, [enabled]);

  useEffect(
    () => () => {
      clearScheduledTasks();
    },
    [clearScheduledTasks],
  );

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Toast
        actionLabel="Resta connesso"
        autoHideMs={0}
        description="La sessione sta per scadere. Vuoi restare connesso?"
        onAction={() => {
          void refreshSession({ fromWarningAction: true });
        }}
        onOpenChange={setShowExpiringToast}
        open={showExpiringToast && !showExpiredToast}
        title="Sessione in scadenza"
        variant="warning"
      />

      <Toast
        actionLabel="Accedi"
        autoHideMs={0}
        description={SESSION_EXPIRED_MESSAGE}
        onAction={redirectToLogin}
        onOpenChange={setShowExpiredToast}
        open={showExpiredToast}
        title="Sessione scaduta"
        variant="danger"
      />
    </>
  );
}
