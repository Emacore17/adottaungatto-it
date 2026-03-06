'use client';

import { Button, Input } from '@adottaungatto/ui';
import type { FormEvent } from 'react';
import { useState } from 'react';

interface AccountPhoneVerificationFormsProps {
  defaultPhoneE164: string | null;
}

const normalizePhoneCandidate = (value: string): string => {
  const trimmed = value.trim();
  const compact = trimmed.replace(/[\s()-]/g, '');
  if (compact.startsWith('00')) {
    return `+${compact.slice(2)}`;
  }

  return compact;
};

const isValidPhoneCandidate = (value: string): boolean => {
  const normalized = normalizePhoneCandidate(value);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
};

const sanitizeCodeCandidate = (value: string): string => value.trim().replace(/\s+/g, '');

export const AccountPhoneVerificationForms = ({
  defaultPhoneE164,
}: AccountPhoneVerificationFormsProps) => {
  const [requestPending, setRequestPending] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const anyPending = requestPending || confirmPending;
  const hasProfilePhone = Boolean(defaultPhoneE164 && defaultPhoneE164.trim());

  const handleRequestSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const phoneRaw = String(formData.get('phoneE164') ?? '').trim();

    setRequestError(null);
    if (!phoneRaw && !hasProfilePhone) {
      event.preventDefault();
      setRequestError('Inserisci un numero di telefono prima di richiedere il codice OTP.');
      return;
    }

    if (phoneRaw && !isValidPhoneCandidate(phoneRaw)) {
      event.preventDefault();
      setRequestError('Numero non valido. Usa formato E.164, ad esempio +393331112233.');
      return;
    }

    setRequestPending(true);
  };

  const handleConfirmSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const phoneRaw = String(formData.get('phoneE164') ?? '').trim();
    const codeRaw = String(formData.get('code') ?? '');
    const code = sanitizeCodeCandidate(codeRaw);

    setConfirmError(null);
    if (!phoneRaw && !hasProfilePhone) {
      event.preventDefault();
      setConfirmError('Inserisci un numero di telefono prima di confermare la verifica.');
      return;
    }

    if (phoneRaw && !isValidPhoneCandidate(phoneRaw)) {
      event.preventDefault();
      setConfirmError('Numero non valido. Usa formato E.164, ad esempio +393331112233.');
      return;
    }

    if (!/^\d{4,8}$/.test(code)) {
      event.preventDefault();
      setConfirmError('Inserisci un codice OTP numerico (4-8 cifre).');
      return;
    }

    setConfirmPending(true);
  };

  return (
    <>
      <form
        action="/api/auth/phone-verification/request"
        className="space-y-2"
        method="post"
        onSubmit={handleRequestSubmit}
      >
        <label
          className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)]"
          htmlFor="phoneE164Request"
        >
          Numero telefono
        </label>
        <Input
          defaultValue={defaultPhoneE164 ?? ''}
          id="phoneE164Request"
          name="phoneE164"
          onChange={() => {
            if (requestError) {
              setRequestError(null);
            }
          }}
          placeholder="+393331112233"
          type="text"
        />
        {requestError ? (
          <p className="text-xs text-amber-300" role="alert">
            {requestError}
          </p>
        ) : null}
        <Button disabled={anyPending} type="submit" variant="outline">
          {requestPending ? 'Invio OTP in corso...' : 'Richiedi codice OTP'}
        </Button>
      </form>

      <form
        action="/api/auth/phone-verification/confirm"
        className="space-y-2"
        method="post"
        onSubmit={handleConfirmSubmit}
      >
        <label
          className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)]"
          htmlFor="phoneE164Confirm"
        >
          Numero telefono
        </label>
        <Input
          defaultValue={defaultPhoneE164 ?? ''}
          id="phoneE164Confirm"
          name="phoneE164"
          onChange={() => {
            if (confirmError) {
              setConfirmError(null);
            }
          }}
          placeholder="+393331112233"
          type="text"
        />
        <label
          className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)]"
          htmlFor="phoneOtpCode"
        >
          Codice OTP
        </label>
        <Input
          id="phoneOtpCode"
          name="code"
          onChange={() => {
            if (confirmError) {
              setConfirmError(null);
            }
          }}
          placeholder="123456"
          type="text"
        />
        {confirmError ? (
          <p className="text-xs text-amber-300" role="alert">
            {confirmError}
          </p>
        ) : null}
        <Button disabled={anyPending} type="submit">
          {confirmPending ? 'Verifica in corso...' : 'Conferma verifica'}
        </Button>
      </form>
    </>
  );
};
