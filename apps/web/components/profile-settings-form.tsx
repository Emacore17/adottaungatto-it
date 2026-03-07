'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Toast } from '@adottaungatto/ui';
import { LoaderCircle, UserRound, UserRoundPen } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SESSION_EXPIRED_MESSAGE, fetchWithAuthRefresh } from '../lib/client-auth-fetch';
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
};

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
});

const toAvatarPreviewSrc = (avatarObjectUrl: string | null): string => {
  if (!avatarObjectUrl) {
    return '/mock-media/gattino-1.jpg';
  }

  const params = new URLSearchParams({
    src: avatarObjectUrl,
    fallbackFile: 'gattino-1.jpg',
  });
  return `/api/listings/media-proxy?${params.toString()}`;
};

const readFileAsDataUrl = async (file: File): Promise<string> =>
  await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !reader.result) {
        reject(new Error('Impossibile leggere il file selezionato.'));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Impossibile leggere il file selezionato.'));
    reader.readAsDataURL(file);
  });

export function ProfileSettingsForm({
  email,
  initialProfile,
}: {
  email: string;
  initialProfile: UserProfile;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<ProfileFormState>(() => toProfileFormState(initialProfile));
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarStorageKey, setAvatarStorageKey] = useState<string | null>(
    initialProfile.avatarStorageKey,
  );
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(
    initialProfile.avatarObjectUrl,
  );
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedAvatarPreviewUrl, setSelectedAvatarPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: '',
    variant: 'info',
  });

  useEffect(
    () => () => {
      if (selectedAvatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedAvatarPreviewUrl);
      }
    },
    [selectedAvatarPreviewUrl],
  );

  const onFieldChange = (fieldName: keyof ProfileFormState, value: string) => {
    setForm((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  };

  const replaceSelectedAvatarPreviewUrl = (nextValue: string | null) => {
    setSelectedAvatarPreviewUrl((currentValue) => {
      if (currentValue?.startsWith('blob:')) {
        URL.revokeObjectURL(currentValue);
      }

      return nextValue;
    });
  };

  const clearSelectedAvatar = () => {
    setSelectedAvatarFile(null);
    replaceSelectedAvatarPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      const response = await fetchWithAuthRefresh('/api/users/me/profile', {
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
        if (response.status === 401) {
          throw new Error(SESSION_EXPIRED_MESSAGE);
        }
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

  const onAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (!AVATAR_ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      clearSelectedAvatar();
      setToast({
        open: true,
        title: 'Formato non supportato',
        description: 'Usa un file JPEG, PNG oppure WebP.',
        variant: 'warning',
      });
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      clearSelectedAvatar();
      setToast({
        open: true,
        title: 'File troppo grande',
        description: 'La dimensione massima consentita per l avatar e 2 MB.',
        variant: 'warning',
      });
      return;
    }

    setSelectedAvatarFile(file);
    replaceSelectedAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const saveAvatar = async () => {
    if (!selectedAvatarFile) {
      setToast({
        open: true,
        title: 'Nessun file selezionato',
        description: 'Seleziona un immagine prima di caricare l avatar.',
        variant: 'warning',
      });
      return;
    }

    setSavingAvatar(true);
    try {
      const contentBase64 = await readFileAsDataUrl(selectedAvatarFile);
      const response = await fetchWithAuthRefresh('/api/users/me/avatar', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          mimeType: selectedAvatarFile.type.toLowerCase(),
          contentBase64,
          fileName: selectedAvatarFile.name,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        profile?: {
          avatarStorageKey?: string | null;
          avatarObjectUrl?: string | null;
        };
      } | null;

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(SESSION_EXPIRED_MESSAGE);
        }
        throw new Error(payload?.message ?? 'Impossibile caricare avatar.');
      }

      setAvatarStorageKey(payload?.profile?.avatarStorageKey ?? null);
      setAvatarObjectUrl(payload?.profile?.avatarObjectUrl ?? null);
      clearSelectedAvatar();

      setToast({
        open: true,
        title: 'Avatar aggiornato',
        description: 'Il nuovo avatar e stato caricato correttamente.',
        variant: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        title: 'Upload non riuscito',
        description: error instanceof Error ? error.message : 'Impossibile caricare avatar.',
        variant: 'danger',
      });
    } finally {
      setSavingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!avatarStorageKey) {
      if (selectedAvatarFile) {
        clearSelectedAvatar();
        setToast({
          open: true,
          title: 'Selezione rimossa',
          description: 'Il file selezionato e stato rimosso.',
          variant: 'info',
        });
      } else {
        setToast({
          open: true,
          title: 'Nessun avatar presente',
          description: 'Non ci sono avatar caricati da rimuovere.',
          variant: 'warning',
        });
      }

      return;
    }

    setSavingAvatar(true);
    try {
      const response = await fetchWithAuthRefresh('/api/users/me/avatar', {
        method: 'DELETE',
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(SESSION_EXPIRED_MESSAGE);
        }
        throw new Error(payload?.message ?? 'Impossibile rimuovere avatar.');
      }

      setAvatarStorageKey(null);
      setAvatarObjectUrl(null);
      clearSelectedAvatar();

      setToast({
        open: true,
        title: 'Avatar rimosso',
        description: 'L avatar e stato rimosso dal profilo.',
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

  const avatarPreviewSrc = selectedAvatarPreviewUrl ?? toAvatarPreviewSrc(avatarObjectUrl);

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
                Telefono
              </label>
              <Input
                id="phoneE164"
                onChange={(event) => onFieldChange('phoneE164', event.target.value)}
                placeholder="+39 333 1234567"
                value={form.phoneE164}
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Formato internazionale consigliato, ad esempio +39 333 1234567.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="city">
                Città
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
          <CardTitle>Avatar profilo</CardTitle>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Carica un immagine JPEG, PNG o WebP fino a 2 MB. Il file precedente viene sostituito
            automaticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <img
              alt="Anteprima avatar"
              className="h-24 w-24 rounded-full border border-[var(--color-border)] object-cover"
              src={avatarPreviewSrc}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {selectedAvatarFile
                  ? `File selezionato: ${selectedAvatarFile.name}`
                  : avatarStorageKey
                    ? 'Avatar attuale salvato'
                    : 'Nessun avatar caricato'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">JPEG, PNG o WebP · max 2 MB</p>
              {avatarStorageKey ? (
                <p className="text-xs text-[var(--color-text-muted)]">Chiave: {avatarStorageKey}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="avatarFile">
              Seleziona immagine
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="block w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:opacity-95"
              id="avatarFile"
              onChange={onAvatarFileChange}
              ref={fileInputRef}
              type="file"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              aria-busy={savingAvatar}
              className="h-11 rounded-full px-5"
              disabled={savingAvatar || !selectedAvatarFile}
              onClick={() => void saveAvatar()}
              type="button"
            >
              {savingAvatar ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Upload...
                </>
              ) : (
                'Carica avatar'
              )}
            </Button>
            <Button
              className="h-11 rounded-full px-5"
              disabled={savingAvatar}
              onClick={() => void removeAvatar()}
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
