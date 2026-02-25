'use client';

import { Button, Input } from '@adottaungatto/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface ContactActionsProps {
  listingId: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

type ContactChannel = 'email' | 'phone';

type SubmitFeedback =
  | {
      status: 'success';
      message: string;
    }
  | {
      status: 'error';
      message: string;
    };

const contactFormSchema = z.object({
  name: z.string().trim().min(2, 'Inserisci il tuo nome.').max(120, 'Nome troppo lungo.'),
  email: z
    .string()
    .trim()
    .min(1, 'Inserisci la tua email.')
    .max(320, 'Email troppo lunga.')
    .email('Email non valida.'),
  phone: z.string().trim().max(40, 'Telefono troppo lungo.').optional(),
  message: z
    .string()
    .trim()
    .min(20, 'Messaggio troppo corto (minimo 20 caratteri).')
    .max(2000, 'Messaggio troppo lungo (max 2000 caratteri).'),
  privacyConsent: z.boolean().refine((value) => value, {
    message: 'Devi autorizzare il trattamento dati per inviare il contatto.',
  }),
  website: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const normalizePhoneHref = (phone: string): string => phone.replace(/\s+/g, '');

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const extractApiMessage = (payload: unknown, fallback: string): string => {
  const record = asRecord(payload);
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message;
  }

  const confirmation = asRecord(record.confirmation);
  if (typeof confirmation.message === 'string' && confirmation.message.trim()) {
    return confirmation.message;
  }

  return fallback;
};

export function ContactActions({ listingId, contactEmail, contactPhone }: ContactActionsProps) {
  const [feedback, setFeedback] = useState<SubmitFeedback | null>(null);
  const hasContactChannel = Boolean(contactEmail || contactPhone);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: '',
      privacyConsent: false,
      website: '',
    },
  });

  const trackContactClick = async (channel: ContactChannel) => {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'contact_clicked',
          listingId,
          source: 'web_listing_detail',
          metadata: {
            channel,
          },
        }),
      });
    } catch {
      // Tracking failures must not block contact CTA.
    }
  };

  const submitContact = form.handleSubmit(async (values) => {
    if (!hasContactChannel) {
      setFeedback({
        status: 'error',
        message: 'Contatto non disponibile per questo annuncio.',
      });
      return;
    }

    setFeedback(null);

    const response = await fetch(`/api/listings/${listingId}/contact`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        phone: values.phone?.trim() ? values.phone.trim() : null,
        message: values.message,
        privacyConsent: values.privacyConsent,
        website: values.website ?? '',
        source: 'web_public_form',
      }),
    });

    let payload: unknown = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      setFeedback({
        status: 'error',
        message: extractApiMessage(payload, 'Invio non riuscito. Riprova tra poco.'),
      });
      return;
    }

    setFeedback({
      status: 'success',
      message: extractApiMessage(payload, 'Richiesta inviata con successo.'),
    });
    form.reset({
      name: values.name,
      email: values.email,
      phone: values.phone ?? '',
      message: '',
      privacyConsent: false,
      website: '',
    });
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Canali diretti
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {contactEmail ? (
            <Button
              className="w-full"
              onClick={() => {
                void trackContactClick('email');
                window.location.href = `mailto:${contactEmail}`;
              }}
              type="button"
            >
              Scrivi email
            </Button>
          ) : null}
          {contactPhone ? (
            <Button
              className="w-full"
              onClick={() => {
                void trackContactClick('phone');
                window.location.href = `tel:${normalizePhoneHref(contactPhone)}`;
              }}
              type="button"
              variant={contactEmail ? 'secondary' : 'default'}
            >
              Chiama ora
            </Button>
          ) : null}
          {!hasContactChannel ? (
            <Button className="w-full" disabled type="button" variant="secondary">
              Contatto non disponibile
            </Button>
          ) : null}
        </div>
      </div>

      <form
        className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        onSubmit={submitContact}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Invia richiesta
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-slate-700"
              htmlFor={`contact-name-${listingId}`}
            >
              Nome
            </label>
            <Input
              id={`contact-name-${listingId}`}
              placeholder="Mario Rossi"
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-slate-700"
              htmlFor={`contact-email-${listingId}`}
            >
              Email
            </label>
            <Input
              id={`contact-email-${listingId}`}
              placeholder="nome@email.it"
              type="email"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-slate-700"
            htmlFor={`contact-phone-${listingId}`}
          >
            Telefono (opzionale)
          </label>
          <Input
            id={`contact-phone-${listingId}`}
            placeholder="+39..."
            {...form.register('phone')}
          />
          {form.formState.errors.phone ? (
            <p className="text-xs text-rose-600">{form.formState.errors.phone.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-slate-700"
            htmlFor={`contact-message-${listingId}`}
          >
            Messaggio
          </label>
          <textarea
            className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            id={`contact-message-${listingId}`}
            placeholder="Scrivi qui la tua richiesta..."
            {...form.register('message')}
          />
          {form.formState.errors.message ? (
            <p className="text-xs text-rose-600">{form.formState.errors.message.message}</p>
          ) : null}
        </div>

        <input
          autoComplete="off"
          className="hidden"
          tabIndex={-1}
          type="text"
          {...form.register('website')}
        />

        <div className="space-y-1.5">
          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              type="checkbox"
              {...form.register('privacyConsent')}
            />
            <span>
              Autorizzo il trattamento dei dati per essere ricontattato dall'inserzionista.
            </span>
          </label>
          {form.formState.errors.privacyConsent ? (
            <p className="text-xs text-rose-600">{form.formState.errors.privacyConsent.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button disabled={!hasContactChannel || form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? 'Invio in corso...' : 'Invia richiesta'}
          </Button>
          <p className="text-xs text-slate-500">
            Protezione anti-spam attiva con limite richieste.
          </p>
        </div>

        {feedback ? (
          <p
            className={
              feedback.status === 'success' ? 'text-xs text-emerald-700' : 'text-xs text-rose-700'
            }
          >
            {feedback.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
