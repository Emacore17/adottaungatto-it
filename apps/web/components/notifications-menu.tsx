'use client';

import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@adottaungatto/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getMockNotifications, markMockNotificationAsRead } from '../lib/mock-client-store';

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(getMockNotifications());

  useEffect(() => {
    setNotifications(getMockNotifications());
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
        Notifiche
        {unreadCount > 0 ? (
          <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-semibold text-[var(--color-primary-foreground)]">
            {unreadCount}
          </span>
        ) : null}
      </Button>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notifiche</DialogTitle>
          </DialogHeader>
          <div className="max-h-[56vh] space-y-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
                Nessuna notifica disponibile.
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                  key={notification.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {notification.title}
                    </p>
                    {!notification.read ? <Badge variant="warning">Nuova</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{notification.body}</p>
                  <div className="mt-2 flex gap-2">
                    <Link
                      className="text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                      href={notification.href}
                      onClick={() => {
                        setNotifications(markMockNotificationAsRead(notification.id));
                        setOpen(false);
                      }}
                    >
                      Apri
                    </Link>
                    {!notification.read ? (
                      <button
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        onClick={() =>
                          setNotifications(markMockNotificationAsRead(notification.id))
                        }
                        type="button"
                      >
                        Segna come letta
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
