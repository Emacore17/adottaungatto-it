'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Toast } from '@adottaungatto/ui';
import { LoaderCircle, UserRound, UserRoundPen } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { UserProfile } from '../lib/users';

type ToastState = {
  open: boolean;
  title: string;
  description?: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
};

type ProfileFormState = {
  firstName: string;
  lastName: string;
  displayName: string;
  phoneE164: string;
  city: string;
  province: string;
  bio: string;
  avatarStorageKey: string;
};

const toInputValue = (value: string | null | undefined) => value ?? '';

const normalizeNullableString = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toProfileFormState = (profile: UserProfile): ProfileFormState => ({
  firstName: toInputValue(profile.firstName),
  lastName: toInputValue(profile.lastName),
  displayName: toInputValue(profile.displayName),
  phoneE164: toInputValue(profile.phoneE164),
  city: toInputValue(profile.city),
  province: toInputValue(profile.province),
  bio: toInputValue(profile.bio),
  avatarStorageKey: toInputValue(profile.avatarStorageKey),
});

export function ProfileSettingsForm({
  email,
  initialProfile,
}: {
  email: string;
  initialProfile: UserProfile;
}) {
  const [form, setForm] = useState<ProfileFormState>(() => toProfileFormState(initialProfile));
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'info',
  });

  const onFieldChange = (fieldName: keyof ProfileFormState, value: string) => {
    setForm((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  };

  const profilePayload = useMemo(
    () => ({
      firstName: normalizeNullableString(form.firstName),
      lastName: normalizeNullableString(form.lastName),
      displayName: normalizeNullableString(form.displayName),
      phoneE164: normalizeNullableString(form.phoneE164),
      city: normalizeNullableString(form.city),
      province: normalizeNullableString(form.province),
      bio: normalizeNullableString(form.bio),
    }),
    [form],
  );

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(profilePayload),
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Impossibile salvare il profilo.');
      }

      setToast({
        open: true,
        title: 'Profilo aggiornato',
        description: 'Le informazioni personali sono state salvate con successo.',
        variant: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Aggiornamento non riuscito',
        description: error instanceof Error ? error.message : 'Impossibile salvare il profilo.',
        variant: 'danger',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAvatarStorageKey = async () => {
    const avatarStorageKey = normalizeNullableString(form.avatarStorageKey);
    if (!avatarStorageKey) {
      setToast({
        open: true,
        title: 'Avatar non valido',
        description: 'Inserisci una chiave avatar valida prima di salvare.',
        variant: 'warning',
      });
      return;
    }

    setSavingAvatar(true);
    try {
      const response = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          avatarStorageKey,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Impossibile aggiornare avatar.');
      }

      setToast({
        open: true,
        title: 'Avatar aggiornato',
        description: 'La chiave avatar e stata salvata correttamente.',
        variant: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Avatar non aggiornato',
        description: error instanceof Error ? error.message : 'Impossibile aggiornare avatar.',
        variant: 'danger',
      });
    } finally {
      setSavingAvatar(false);
    }
  };

  const removeAvatarStorageKey = async () => {
    setSavingAvatar(true);
    try {
      const response = await fetch('/api/users/me/avatar', {
        method: 'DELETE',
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Impossibile rimuovere avatar.');
      }

      setForm((currentValue) => ({
        ...currentValue,
        avatarStorageKey: '',
      }));

      setToast({
        open: true,
        title: 'Avatar rimosso',
        description: 'La chiave avatar e stata rimossa dal profilo.',
        variant: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Rimozione non riuscita',
        description: error instanceof Error ? error.message : 'Impossibile rimuovere avatar.',
        variant: 'danger',
      });
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <>
      <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
        <CardHeader className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)]">
            <UserRoundPen className="h-4 w-4 text-[var(--color-primary)]" />
            Profilo personale
          </div>
          <CardTitle>Dati account</CardTitle>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Le informazioni qui sotto restano collegate al tuo account{' '}
            <span className="font-medium text-[var(--color-text)]">{email}</span>.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="firstName">
                Nome
              </label>
              <Input
                id="firstName"
                onChange={(event) => onFieldChange('firstName', event.target.value)}
                placeholder="Mario"
                value={form.firstName}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="lastName">
                Cognome
              </label>
              <Input
                id="lastName"
                onChange={(event) => onFieldChange('lastName', event.target.value)}
                placeholder="Rossi"
                value={form.lastName}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="displayName">
                Nome pubblico
              </label>
              <Input
                id="displayName"
                onChange={(event) => onFieldChange('displayName', event.target.value)}
                placeholder="Gatto Lover"
                value={form.displayName}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="phoneE164">
                Telefono (E.164)
              </label>
              <Input
                id="phoneE164"
                onChange={(event) => onFieldChange('phoneE164', event.target.value)}
                placeholder="+393331112233"
                value={form.phoneE164}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="city">
                Citta
              </label>
              <Input
                id="city"
                onChange={(event) => onFieldChange('city', event.target.value)}
                placeholder="Milano"
                value={form.city}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="province">
                Provincia
              </label>
              <Input
                id="province"
                onChange={(event) => onFieldChange('province', event.target.value)}
                placeholder="MI"
                value={form.province}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="bio">
              Bio
            </label>
            <textarea
              className="min-h-[110px] w-full rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.3)] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)]"
              id="bio"
              maxLength={800}
              onChange={(event) => onFieldChange('bio', event.target.value)}
              placeholder="Racconta qualcosa su di te e sulla tua esperienza con i gatti."
              value={form.bio}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              aria-busy={savingProfile}
              className="h-11 rounded-full px-5"
              disabled={savingProfile}
              onClick={() => void saveProfile()}
              type="button"
            >
              {savingProfile ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva profilo'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[color:color-mix(in_srgb,var(--color-border)_80%,white_20%)] bg-[color:color-mix(in_srgb,var(--color-surface-overlay-strong)_88%,white_12%)]">
        <CardHeader className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)]">
            <UserRound className="h-4 w-4 text-[var(--color-primary)]" />
            Avatar
          </div>
          <CardTitle>Chiave avatar profilo</CardTitle>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Campo tecnico predisposto per integrazione upload media dedicata.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="avatarStorageKey">
              Avatar storage key
            </label>
            <Input
              id="avatarStorageKey"
              onChange={(event) => onFieldChange('avatarStorageKey', event.target.value)}
              placeholder="avatars/user-123/avatar.webp"
              value={form.avatarStorageKey}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              aria-busy={savingAvatar}
              className="h-11 rounded-full px-5"
              disabled={savingAvatar}
              onClick={() => void saveAvatarStorageKey()}
              type="button"
            >
              {savingAvatar ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva avatar'
              )}
            </Button>
            <Button
              className="h-11 rounded-full px-5"
              disabled={savingAvatar}
              onClick={() => void removeAvatarStorageKey()}
              type="button"
              variant="secondary"
            >
              Rimuovi avatar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Toast
        description={toast.description}
        onOpenChange={(open) => setToast((currentValue) => ({ ...currentValue, open }))}
        open={toast.open}
        title={toast.title}
        variant={toast.variant}
      />
    </>
  );
}
