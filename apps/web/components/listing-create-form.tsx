'use client';

import type { LocationIntent } from '@adottaungatto/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Toast,
  cn,
} from '@adottaungatto/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { LazyLocationSelector } from './lazy-location-selector';

const maxMediaFiles = 8;
const maxFileSizeBytes = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const listingTypeOptions = [
  { value: 'adozione', label: 'Adozione' },
  { value: 'stallo', label: 'Stallo' },
  { value: 'segnalazione', label: 'Segnalazione' },
] as const;

const sexOptions = [
  { value: 'femmina', label: 'Femmina' },
  { value: 'maschio', label: 'Maschio' },
  { value: 'non_specificato', label: 'Non specificato' },
] as const;

const locationSchema = z.object({
  scope: z.enum(['italy', 'region', 'province', 'comune', 'comune_plus_province']),
  regionId: z.string().nullable(),
  provinceId: z.string().nullable(),
  comuneId: z.string().nullable(),
  label: z.string().min(1),
  secondaryLabel: z.string().nullable(),
});

const listingCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, 'Inserisci un titolo di almeno 5 caratteri.')
      .max(160, 'Titolo troppo lungo (max 160 caratteri).'),
    description: z
      .string()
      .trim()
      .min(20, 'Inserisci una descrizione di almeno 20 caratteri.')
      .max(6000, 'Descrizione troppo lunga (max 6000 caratteri).'),
    listingType: z.enum(['adozione', 'stallo', 'segnalazione']),
    ageText: z
      .string()
      .trim()
      .min(2, 'Indica eta o fascia eta.')
      .max(80, 'Campo eta troppo lungo (max 80 caratteri).'),
    sex: z.enum(['femmina', 'maschio', 'non_specificato']),
    breed: z.string().trim().max(120, 'Razza troppo lunga (max 120 caratteri).').optional(),
    priceAmount: z.string().trim().optional(),
    contactName: z.string().trim().max(120, 'Nome contatto troppo lungo.').optional(),
    contactPhone: z.string().trim().max(40, 'Telefono contatto troppo lungo.').optional(),
    contactEmail: z.string().trim().max(320, 'Email contatto troppo lunga.').optional(),
    location: locationSchema.nullable(),
  })
  .superRefine((value, context) => {
    if (!value.location) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'Seleziona un comune tramite ricerca luogo.',
      });
      return;
    }

    if (value.location.scope !== 'comune' && value.location.scope !== 'comune_plus_province') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'Per creare un annuncio devi selezionare un comune.',
      });
    }

    if (!value.location.regionId || !value.location.provinceId || !value.location.comuneId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'Selezione luogo incompleta. Scegli un comune dai suggerimenti.',
      });
    }

    if (value.priceAmount && value.priceAmount.length > 0) {
      const normalizedPrice = value.priceAmount.replace(',', '.');
      const numericPrice = Number.parseFloat(normalizedPrice);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceAmount'],
          message: 'Prezzo non valido. Inserisci un numero maggiore o uguale a 0.',
        });
      }
    }

    if (value.contactEmail && value.contactEmail.length > 0) {
      const emailResult = z.string().email().safeParse(value.contactEmail);
      if (!emailResult.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contactEmail'],
          message: 'Email contatto non valida.',
        });
      }
    }
  });

type ListingCreateFormValues = z.infer<typeof listingCreateSchema>;

const toOptionalNullable = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseApiErrorMessage = (payload: unknown, fallbackMessage: string): string => {
  if (typeof payload !== 'object' || payload === null) {
    return fallbackMessage;
  }

  const record = payload as Record<string, unknown>;
  const issues = record.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    const firstIssue = issues[0];
    if (typeof firstIssue === 'object' && firstIssue !== null) {
      const issueRecord = firstIssue as Record<string, unknown>;
      if (typeof issueRecord.message === 'string' && issueRecord.message.length > 0) {
        return issueRecord.message;
      }
    }
  }

  if (typeof record.message === 'string' && record.message.length > 0) {
    return record.message;
  }

  return fallbackMessage;
};

const fileToBase64Payload = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unsupported file reader result.'));
        return;
      }

      const commaIndex = reader.result.indexOf(',');
      resolve(commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface ListingCreateFormProps {
  apiBaseUrl: string;
  defaultContactEmail: string;
}

type FormToastState = {
  title: string;
  description: string;
  variant: 'danger' | 'warning';
} | null;

export function ListingCreateForm({ apiBaseUrl, defaultContactEmail }: ListingCreateFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    uploaded: number;
    total: number;
  } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [formToast, setFormToast] = useState<FormToastState>(null);

  const form = useForm<ListingCreateFormValues>({
    resolver: zodResolver(listingCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      listingType: 'adozione',
      ageText: '',
      sex: 'femmina',
      breed: '',
      priceAmount: '',
      contactName: '',
      contactPhone: '',
      contactEmail: defaultContactEmail,
      location: null,
    },
  });

  const fileLimitLabel = useMemo(() => `${maxMediaFiles} immagini max`, []);

  useEffect(() => {
    if (submitError) {
      setFormToast({
        title: 'Invio annuncio non riuscito',
        description: submitError,
        variant: 'danger',
      });
    }
  }, [submitError]);

  useEffect(() => {
    if (mediaError) {
      setFormToast({
        title: 'Controlla le immagini',
        description: mediaError,
        variant: 'warning',
      });
    }
  }, [mediaError]);

  const addFiles = useCallback(
    (incomingFiles: File[]) => {
      const nextFiles = [...selectedFiles];
      const errors: string[] = [];

      for (const incomingFile of incomingFiles) {
        if (!allowedMimeTypes.has(incomingFile.type)) {
          errors.push(`${incomingFile.name}: formato non supportato.`);
          continue;
        }

        if (incomingFile.size > maxFileSizeBytes) {
          errors.push(`${incomingFile.name}: supera ${formatFileSize(maxFileSizeBytes)}.`);
          continue;
        }

        const isDuplicate = nextFiles.some(
          (file) =>
            file.name === incomingFile.name &&
            file.size === incomingFile.size &&
            file.lastModified === incomingFile.lastModified,
        );
        if (isDuplicate) {
          continue;
        }

        if (nextFiles.length >= maxMediaFiles) {
          errors.push(`Hai raggiunto il limite di ${maxMediaFiles} immagini.`);
          break;
        }

        nextFiles.push(incomingFile);
      }

      setSelectedFiles(nextFiles);
      setMediaError(errors.length > 0 ? errors[0] : null);
    },
    [selectedFiles],
  );

  const removeFile = useCallback((fileIndex: number) => {
    setSelectedFiles((previousFiles) => previousFiles.filter((_, index) => index !== fileIndex));
    setMediaError(null);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      const droppedFiles = Array.from(event.dataTransfer.files ?? []);
      addFiles(droppedFiles);
    },
    [addFiles],
  );

  const resetForm = useCallback(() => {
    form.reset();
    setSelectedFiles([]);
    setMediaError(null);
    setSubmitError(null);
    setUploadProgress(null);
    setFormToast(null);
  }, [form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setUploadProgress(null);

    if (selectedFiles.length === 0) {
      setMediaError("Carica almeno una immagine per completare l'annuncio.");
      return;
    }

    const location = values.location as LocationIntent | null;
    if (!location?.regionId || !location.provinceId || !location.comuneId) {
      form.setError('location', {
        type: 'manual',
        message: 'Seleziona un comune valido dai suggerimenti.',
      });
      return;
    }

    const normalizedPrice = values.priceAmount?.trim() ?? '';
    const priceAmount =
      normalizedPrice.length > 0 ? Number.parseFloat(normalizedPrice.replace(',', '.')) : null;

    const createPayload = {
      title: values.title.trim(),
      description: values.description.trim(),
      listingType: values.listingType,
      priceAmount,
      currency: 'EUR',
      ageText: values.ageText.trim(),
      sex: values.sex,
      breed: toOptionalNullable(values.breed),
      regionId: location.regionId,
      provinceId: location.provinceId,
      comuneId: location.comuneId,
      contactName: toOptionalNullable(values.contactName),
      contactPhone: toOptionalNullable(values.contactPhone),
      contactEmail: toOptionalNullable(values.contactEmail),
    };

    const createResponse = await fetch('/api/listings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    const createBody = (await createResponse.json().catch(() => ({}))) as unknown;
    if (!createResponse.ok) {
      setSubmitError(parseApiErrorMessage(createBody, 'Creazione annuncio non riuscita.'));
      return;
    }

    const listingRecord =
      typeof createBody === 'object' && createBody !== null
        ? (createBody as Record<string, unknown>).listing
        : null;
    const listingId =
      typeof listingRecord === 'object' && listingRecord !== null
        ? (listingRecord as Record<string, unknown>).id
        : null;

    if (typeof listingId !== 'string' || listingId.length === 0) {
      setSubmitError('Risposta API non valida: id annuncio mancante.');
      return;
    }

    let uploadedCount = 0;
    const failedUploads: string[] = [];

    for (const [index, file] of selectedFiles.entries()) {
      setUploadProgress({
        uploaded: index,
        total: selectedFiles.length,
      });

      try {
        const contentBase64 = await fileToBase64Payload(file);
        const uploadResponse = await fetch(`/api/listings/${listingId}/media`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            mimeType: file.type,
            contentBase64,
            fileName: file.name,
            isPrimary: index === 0,
          }),
        });

        if (!uploadResponse.ok) {
          failedUploads.push(file.name);
          continue;
        }

        uploadedCount += 1;
      } catch {
        failedUploads.push(file.name);
      }
    }

    setUploadProgress({
      uploaded: selectedFiles.length,
      total: selectedFiles.length,
    });

    const query = new URLSearchParams();
    query.set('id', listingId);
    query.set('uploaded', uploadedCount.toString());
    query.set('failed', failedUploads.length.toString());
    router.push(`/account/listings/submitted?${query.toString()}`);
  });

  return (
    <div className="space-y-6">
      <Toast
        description={formToast?.description}
        onOpenChange={(open) => {
          if (!open) {
            setFormToast(null);
          }
        }}
        open={formToast !== null}
        title={formToast?.title ?? ''}
        variant={formToast?.variant ?? 'danger'}
      />

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50 to-white p-4 shadow-sm"
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Nuovo annuncio adozione</p>
            <p className="text-xs text-slate-600">
              Flusso M2.6: compilazione guidata + upload immagini + invio in revisione.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">M2.6</Badge>
            <Badge variant="success">RHF + Zod</Badge>
          </div>
        </div>
      </motion.div>

      <form className="space-y-6 pb-20 sm:pb-0" onSubmit={onSubmit}>
        <Card className="border-slate-300/80">
          <CardHeader>
            <CardTitle>Dati annuncio</CardTitle>
            <CardDescription>
              Inserisci le informazioni principali del gatto e del contesto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="listing-title">
                  Titolo
                </label>
                <Input
                  id="listing-title"
                  placeholder="Es. Gatta affettuosa in cerca di famiglia"
                  {...form.register('title')}
                />
                {form.formState.errors.title ? (
                  <p className="text-xs text-rose-700">{form.formState.errors.title.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="listing-type">
                  Tipo annuncio
                </label>
                <select
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  id="listing-type"
                  {...form.register('listingType')}
                >
                  {listingTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="listing-sex">
                  Sesso
                </label>
                <select
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  id="listing-sex"
                  {...form.register('sex')}
                >
                  {sexOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="listing-age">
                  Eta
                </label>
                <Input id="listing-age" placeholder="Es. 2 anni" {...form.register('ageText')} />
                {form.formState.errors.ageText ? (
                  <p className="text-xs text-rose-700">{form.formState.errors.ageText.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="listing-breed">
                  Razza (opzionale)
                </label>
                <Input id="listing-breed" placeholder="Es. Europeo" {...form.register('breed')} />
                {form.formState.errors.breed ? (
                  <p className="text-xs text-rose-700">{form.formState.errors.breed.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="listing-price">
                  Prezzo adozione (opzionale)
                </label>
                <Input
                  id="listing-price"
                  inputMode="decimal"
                  placeholder="Es. 0 oppure 50"
                  {...form.register('priceAmount')}
                />
                {form.formState.errors.priceAmount ? (
                  <p className="text-xs text-rose-700">
                    {form.formState.errors.priceAmount.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="listing-description">
                  Descrizione
                </label>
                <textarea
                  className="min-h-36 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  id="listing-description"
                  placeholder="Racconta carattere, stato sanitario, compatibilita, note utili."
                  {...form.register('description')}
                />
                {form.formState.errors.description ? (
                  <p className="text-xs text-rose-700">
                    {form.formState.errors.description.message}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-300/80">
          <CardHeader>
            <CardTitle>Luogo e contatti</CardTitle>
            <CardDescription>
              Cerca il comune di riferimento. Regione/provincia da sole non sono valide per il
              publish flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              control={form.control}
              name="location"
              render={({ field }) => (
                <LazyLocationSelector
                  apiBaseUrl={apiBaseUrl}
                  onChange={(nextValue) => field.onChange(nextValue)}
                  showDebugState={false}
                  showSelectItalyAction={false}
                  value={field.value}
                />
              )}
            />
            {form.formState.errors.location ? (
              <p className="text-xs text-rose-700">{form.formState.errors.location.message}</p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="contact-name">
                  Nome contatto
                </label>
                <Input
                  id="contact-name"
                  placeholder="Es. Laura"
                  {...form.register('contactName')}
                />
                {form.formState.errors.contactName ? (
                  <p className="text-xs text-rose-700">
                    {form.formState.errors.contactName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="contact-phone">
                  Telefono
                </label>
                <Input
                  id="contact-phone"
                  placeholder="+39 333 1234567"
                  {...form.register('contactPhone')}
                />
                {form.formState.errors.contactPhone ? (
                  <p className="text-xs text-rose-700">
                    {form.formState.errors.contactPhone.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                <label className="text-sm font-medium text-slate-900" htmlFor="contact-email">
                  Email contatto
                </label>
                <Input
                  id="contact-email"
                  placeholder="nome@email.it"
                  {...form.register('contactEmail')}
                />
                {form.formState.errors.contactEmail ? (
                  <p className="text-xs text-rose-700">
                    {form.formState.errors.contactEmail.message}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-300/80">
          <CardHeader>
            <CardTitle>Immagini annuncio</CardTitle>
            <CardDescription>
              Trascina file o usa il selettore. Formati: JPG, PNG, WEBP. Limite: {fileLimitLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                'rounded-xl border border-dashed p-5 transition-colors',
                isDragActive ? 'border-slate-900 bg-slate-100/70' : 'border-slate-300 bg-slate-50',
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDrop={handleDrop}
            >
              <div className="space-y-3 text-center">
                <p className="text-sm font-medium text-slate-900">
                  Trascina qui le foto del gatto oppure selezionale manualmente
                </p>
                <p className="text-xs text-slate-600">
                  Max {maxMediaFiles} immagini, {formatFileSize(maxFileSizeBytes)} per file.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  variant="outline"
                >
                  Seleziona immagini
                </Button>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    addFiles(files);
                    event.target.value = '';
                  }}
                  ref={fileInputRef}
                  type="file"
                />
              </div>
            </div>

            {mediaError ? <p className="text-xs text-rose-700">{mediaError}</p> : null}

            {selectedFiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-3 py-2 text-xs text-slate-600">
                Nessuna immagine selezionata. Aggiungi almeno una foto per inviare l&apos;annuncio
                in revisione.
              </div>
            ) : null}

            <AnimatePresence initial={false}>
              {selectedFiles.length > 0 ? (
                <motion.ul
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                  initial={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  {selectedFiles.map((file, index) => (
                    <li
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-600">{formatFileSize(file.size)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {index === 0 ? <Badge variant="success">Primaria</Badge> : null}
                        <Button onClick={() => removeFile(index)} size="sm" variant="ghost">
                          Rimuovi
                        </Button>
                      </div>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </CardContent>
        </Card>

        {submitError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {submitError}
          </p>
        ) : null}

        {uploadProgress ? (
          <p className="text-sm text-slate-700">
            Upload immagini: {uploadProgress.uploaded}/{uploadProgress.total}
          </p>
        ) : null}

        <div className="hidden flex-wrap items-center gap-3 sm:flex">
          <Button disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? 'Invio in corso...' : 'Invia annuncio'}
          </Button>
          <Button
            disabled={form.formState.isSubmitting}
            onClick={resetForm}
            type="button"
            variant="secondary"
          >
            Reset form
          </Button>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-2">
            <Button
              className="w-full"
              disabled={form.formState.isSubmitting}
              onClick={resetForm}
              type="button"
              variant="secondary"
            >
              Reset
            </Button>
            <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? 'Invio...' : 'Invia'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
