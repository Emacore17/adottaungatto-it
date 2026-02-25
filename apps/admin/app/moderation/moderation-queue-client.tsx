'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Toast,
  motionPresets,
} from '@adottaungatto/ui';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ModerationAction, ModerationQueueItem } from '../../lib/moderation-types';
import { listingStatusLabel, moderationActionLabel } from '../../lib/moderation-types';

interface ModerationQueueClientProps {
  items: ModerationQueueItem[];
}

type FeedbackState = {
  type: 'success' | 'error';
  title: string;
  message?: string;
} | null;

type DialogState = {
  action: ModerationAction;
  listing: ModerationQueueItem;
} | null;

const formatDateTime = (rawDate: string) => {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const resolveActionDescription = (action: ModerationAction) => {
  if (action === 'approve') {
    return "L'annuncio verra pubblicato nella lista pubblica.";
  }

  if (action === 'reject') {
    return "L'annuncio verra rifiutato e non sara visibile pubblicamente.";
  }

  if (action === 'suspend') {
    return "L'annuncio verra sospeso e nascosto dalla lista pubblica.";
  }

  return "L'annuncio verra ripristinato secondo la policy di stato.";
};

const parseApiMessage = (payload: unknown, fallback: string) => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === 'string') {
    return record.message;
  }

  if (Array.isArray(record.message) && record.message.every((item) => typeof item === 'string')) {
    return record.message.join('; ');
  }

  return fallback;
};

export function ModerationQueueClient({ items }: ModerationQueueClientProps) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const canSubmit = useMemo(
    () => reason.trim().length >= 3 && !isSubmitting,
    [reason, isSubmitting],
  );

  const openDialog = (listing: ModerationQueueItem, action: ModerationAction) => {
    setDialogState({ listing, action });
    setReason('');
    setFeedback(null);
  };

  const closeDialog = () => {
    if (isSubmitting) {
      return;
    }

    setDialogState(null);
    setReason('');
  };

  const submitAction = async () => {
    if (!dialogState) {
      return;
    }

    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      setFeedback({
        type: 'error',
        title: 'Motivazione non valida',
        message: 'La motivazione deve contenere almeno 3 caratteri.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/moderation/${dialogState.listing.id}/${dialogState.action}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            reason: normalizedReason,
          }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) {
        throw new Error(parseApiMessage(payload, "Errore durante l'azione di moderazione."));
      }

      setDialogState(null);
      setReason('');
      setFeedback({
        type: 'success',
        title: 'Moderazione aggiornata',
        message: `${moderationActionLabel[dialogState.action]} completata su "${dialogState.listing.title}".`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Azione non riuscita',
        message:
          error instanceof Error && error.message
            ? error.message
            : "Errore durante l'azione di moderazione.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Toast
        autoHideMs={5000}
        description={feedback?.message}
        onOpenChange={(open) => {
          if (!open) {
            setFeedback(null);
          }
        }}
        open={feedback !== null}
        title={feedback?.title ?? ''}
        variant={feedback?.type === 'success' ? 'success' : 'danger'}
      />

      {items.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white/80">
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-base font-medium text-slate-900">Nessun annuncio in coda.</p>
            <p className="text-sm text-slate-600">
              La coda moderazione e vuota. Controlla di nuovo tra poco o aggiorna la vista.
            </p>
            <div className="pt-1">
              <Button onClick={() => router.refresh()} size="sm" type="button" variant="outline">
                Ricarica coda
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {items.map((item, index) => (
            <motion.div
              animate={motionPresets.listEnter.animate}
              initial={motionPresets.listEnter.initial}
              key={item.id}
              transition={{
                ...motionPresets.listEnter.transition,
                delay: Math.min(index * 0.04, 0.24),
              }}
              whileHover={motionPresets.hoverLift.whileHover}
              whileTap={motionPresets.hoverLift.whileTap}
            >
              <Card className="h-full border-slate-300/80 bg-white/95 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base leading-tight">{item.title}</CardTitle>
                      <CardDescription>
                        ID #{item.id} - {listingStatusLabel[item.status]}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="warning">In revisione</Badge>
                      <Badge variant="outline">{item.mediaCount} immagini</Badge>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-sm text-slate-700">{item.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Autore
                      </p>
                      <p className="text-sm text-slate-800">{item.ownerEmail || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Luogo
                      </p>
                      <p className="text-sm text-slate-800">
                        {item.comuneName} ({item.provinceSigla}) - {item.regionName}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tipo
                      </p>
                      <p className="text-sm text-slate-800">{item.listingType || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Creato il
                      </p>
                      <p className="text-sm text-slate-800">{formatDateTime(item.createdAt)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <Button
                      aria-label={`Approva annuncio ${item.title}`}
                      className="w-full sm:w-auto"
                      onClick={() => openDialog(item, 'approve')}
                      type="button"
                      variant="success"
                    >
                      Approva
                    </Button>
                    <Button
                      aria-label={`Rifiuta annuncio ${item.title}`}
                      className="w-full sm:w-auto"
                      onClick={() => openDialog(item, 'reject')}
                      type="button"
                      variant="danger"
                    >
                      Rifiuta
                    </Button>
                    <Button
                      aria-label={`Sospendi annuncio ${item.title}`}
                      className="w-full sm:w-auto"
                      disabled={item.status !== 'published'}
                      onClick={() => openDialog(item, 'suspend')}
                      type="button"
                      variant="secondary"
                    >
                      Sospendi
                    </Button>
                  </div>

                  {item.status !== 'published' ? (
                    <p className="text-xs text-slate-500">
                      Azione &quot;Sospendi&quot; disponibile solo per annunci pubblicati.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>
      )}

      <Dialog
        onOpenChange={(open) => (!open ? closeDialog() : undefined)}
        open={dialogState !== null}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialogState ? moderationActionLabel[dialogState.action] : 'Azione moderazione'}{' '}
              annuncio
            </DialogTitle>
            <DialogDescription>
              {dialogState
                ? `${resolveActionDescription(dialogState.action)} Inserisci una motivazione per tracciare l'audit log.`
                : 'Inserisci una motivazione.'}
            </DialogDescription>
          </DialogHeader>

          {dialogState ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">{dialogState.listing.title}</p>
                <p className="text-xs text-slate-600">
                  ID #{dialogState.listing.id} - {dialogState.listing.comuneName} (
                  {dialogState.listing.provinceSigla})
                </p>
              </div>

              <label className="block space-y-2" htmlFor="moderation-reason">
                <span className="text-sm font-medium text-slate-800">Motivazione</span>
                <textarea
                  className="min-h-28 w-full resize-y rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  id="moderation-reason"
                  maxLength={2000}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Scrivi una motivazione chiara per il team e per audit."
                  value={reason}
                />
              </label>

              <DialogFooter>
                <Button
                  disabled={isSubmitting}
                  onClick={closeDialog}
                  type="button"
                  variant="secondary"
                >
                  Annulla
                </Button>
                <Button disabled={!canSubmit} onClick={submitAction} type="button">
                  {isSubmitting
                    ? 'Invio in corso...'
                    : `${moderationActionLabel[dialogState.action]} annuncio`}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
