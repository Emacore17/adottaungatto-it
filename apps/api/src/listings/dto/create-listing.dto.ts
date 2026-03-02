import { z } from 'zod';
import { MAX_LISTING_AGE_MONTHS, normalizeListingAge } from '../listing-age';

type ValidationIssue = {
  path: string;
  message: string;
};

const trimmedString = (maxLength: number, fieldName: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z
      .string()
      .min(1, `Field "${fieldName}" cannot be empty.`)
      .max(maxLength, `Field "${fieldName}" exceeds maximum length (${maxLength} characters).`),
  );

const optionalTrimmedNullableString = (maxLength: number, fieldName: string) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  }, z
    .string()
    .max(maxLength, `Field "${fieldName}" exceeds maximum length (${maxLength} characters).`)
    .nullable());

const positiveIntegerAsString = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (typeof value === 'number' && Number.isInteger(value)) {
        return value.toString();
      }

      if (typeof value === 'string') {
        return value.trim();
      }

      return value;
    },
    z.string().regex(/^[1-9]\d*$/, `Field "${fieldName}" must be a positive integer.`),
  );

const currencyCode = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value.trim().toUpperCase();
    }

    return value;
  },
  z
    .string()
    .regex(/^[A-Z]{3}$/, 'Field "currency" must be a valid 3-letter code.')
    .optional(),
);

const optionalNonNegativeInteger = (fieldName: string, maxValue: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
      }

      if (typeof value === 'string') {
        const normalized = value.trim();
        if (!normalized) {
          return undefined;
        }

        if (!/^-?\d+$/.test(normalized)) {
          return value;
        }

        return Number.parseInt(normalized, 10);
      }

      return value;
    },
    z
      .number({
        invalid_type_error: `Field "${fieldName}" must be an integer.`,
      })
      .int(`Field "${fieldName}" must be an integer.`)
      .min(0, `Field "${fieldName}" must be >= 0.`)
      .max(maxValue, `Field "${fieldName}" must be <= ${maxValue}.`)
      .optional(),
  );

const listingTypeAlias = trimmedString(40, 'listingType').optional();
const optionalAgeText = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}, z.string().max(80, 'Field "ageText" exceeds maximum length (80 characters).').optional());

const createListingBodySchema = z
  .object({
    title: trimmedString(160, 'title'),
    description: trimmedString(6000, 'description'),
    listingType: listingTypeAlias,
    listing_type: listingTypeAlias,
    type: listingTypeAlias,
    listingKind: listingTypeAlias,
    priceAmount: z
      .number({
        invalid_type_error: 'Field "priceAmount" must be a positive number or null.',
      })
      .nonnegative('Field "priceAmount" must be a positive number or null.')
      .nullable()
      .optional(),
    currency: currencyCode,
    ageText: optionalAgeText,
    ageMonths: optionalNonNegativeInteger('ageMonths', MAX_LISTING_AGE_MONTHS),
    sex: trimmedString(20, 'sex'),
    breed: optionalTrimmedNullableString(120, 'breed'),
    regionId: positiveIntegerAsString('regionId'),
    provinceId: positiveIntegerAsString('provinceId'),
    comuneId: positiveIntegerAsString('comuneId'),
    contactName: optionalTrimmedNullableString(120, 'contactName'),
    contactPhone: optionalTrimmedNullableString(40, 'contactPhone'),
    contactEmail: z
      .preprocess((value) => {
        if (value === undefined || value === null) {
          return null;
        }

        if (typeof value !== 'string') {
          return value;
        }

        const normalized = value.trim();
        return normalized.length === 0 ? null : normalized;
      }, z
        .string()
        .max(320, 'Field "contactEmail" exceeds maximum length (320 characters).')
        .email('Field "contactEmail" must be a valid email address.')
        .nullable())
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.listingType && !value.listing_type && !value.type && !value.listingKind) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['listingType'],
        message: 'Field "listingType" is required and must be a string.',
      });
    }

    const normalizedAge = normalizeListingAge({
      ageText: value.ageText,
      ageMonths: value.ageMonths,
    });
    if ('error' in normalizedAge) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: value.ageMonths !== undefined ? ['ageMonths'] : ['ageText'],
        message: normalizedAge.error,
      });
    }
  })
  .transform((value) => {
    const listingType = value.listingType ?? value.listing_type ?? value.type ?? value.listingKind;
    if (!listingType) {
      throw new Error('Unexpected invalid listingType state.');
    }

    const normalizedAge = normalizeListingAge({
      ageText: value.ageText,
      ageMonths: value.ageMonths,
    });
    if ('error' in normalizedAge) {
      throw new Error('Unexpected invalid age state.');
    }

    return {
      title: value.title,
      description: value.description,
      listingType,
      priceAmount: value.priceAmount ?? null,
      currency: value.currency ?? 'EUR',
      ageText: normalizedAge.ageText,
      ageMonths: normalizedAge.ageMonths,
      sex: value.sex,
      breed: value.breed ?? null,
      regionId: value.regionId,
      provinceId: value.provinceId,
      comuneId: value.comuneId,
      contactName: value.contactName ?? null,
      contactPhone: value.contactPhone ?? null,
      contactEmail: value.contactEmail ?? null,
    };
  });

export type CreateListingDto = z.infer<typeof createListingBodySchema>;

export const validateCreateListingDto = (
  payload: unknown,
): { dto: CreateListingDto } | { issues: ValidationIssue[] } => {
  const result = createListingBodySchema.safeParse(payload);
  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : 'body',
      message: issue.message,
    }));
    return { issues };
  }

  return { dto: result.data };
};
