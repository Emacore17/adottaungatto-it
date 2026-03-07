import {
  type LocationIntent,
  type LocationIntentScope,
  NO_BREED_FILTER,
  normalizeCatBreedLabel,
} from '@adottaungatto/types';
import { z } from 'zod';
import { type SearchSort, searchSortValues } from '../models/listing.model';

type ValidationIssue = {
  path: string;
  message: string;
};

const locationScopeValues = [
  'italy',
  'region',
  'province',
  'comune',
  'comune_plus_province',
] as const;

const defaultLocationLabelByScope: Record<LocationIntentScope, string> = {
  italy: 'Tutta Italia',
  region: 'Regione',
  province: 'Provincia',
  comune: 'Comune',
  comune_plus_province: 'Comune e provincia',
};

const optionalTrimmedString = (maxLength: number, fieldName: string) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized.length === 0 ? undefined : normalized;
  }, z
    .string()
    .max(maxLength, `Query parameter "${fieldName}" exceeds maximum length (${maxLength}).`)
    .optional());

const optionalPositiveIntegerAsString = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      if (typeof value === 'number' && Number.isInteger(value)) {
        return value.toString();
      }

      if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized.length === 0 ? undefined : normalized;
      }

      return value;
    },
    z
      .string()
      .regex(/^[1-9]\d*$/, `Query parameter "${fieldName}" must be a positive integer.`)
      .optional(),
  );

const optionalNonNegativeNumber = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      if (typeof value === 'number') {
        return value;
      }

      if (typeof value === 'string') {
        const normalized = value.trim();
        if (!normalized) {
          return undefined;
        }

        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : value;
      }

      return value;
    },
    z
      .number({
        invalid_type_error: `Query parameter "${fieldName}" must be a non-negative number.`,
      })
      .nonnegative(`Query parameter "${fieldName}" must be a non-negative number.`)
      .optional(),
  );

const optionalBoundedNumber = (fieldName: string, minValue: number, maxValue: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      if (typeof value === 'number') {
        return value;
      }

      if (typeof value === 'string') {
        const normalized = value.trim();
        if (!normalized) {
          return undefined;
        }

        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : value;
      }

      return value;
    },
    z
      .number({
        invalid_type_error: `Query parameter "${fieldName}" must be a number.`,
      })
      .min(minValue, `Query parameter "${fieldName}" must be >= ${minValue}.`)
      .max(maxValue, `Query parameter "${fieldName}" must be <= ${maxValue}.`)
      .optional(),
  );

const optionalInteger = (fieldName: string, minValue: number, maxValue?: number) =>
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
        invalid_type_error: `Query parameter "${fieldName}" must be an integer.`,
      })
      .int(`Query parameter "${fieldName}" must be an integer.`)
      .min(minValue, `Query parameter "${fieldName}" must be >= ${minValue}.`)
      .max(
        maxValue ?? Number.MAX_SAFE_INTEGER,
        `Query parameter "${fieldName}" must be <= ${maxValue ?? Number.MAX_SAFE_INTEGER}.`,
      )
      .optional(),
  );

const optionalBoolean = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'number') {
        if (value === 1) {
          return true;
        }

        if (value === 0) {
          return false;
        }
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (!normalized) {
          return undefined;
        }

        if (['true', '1', 'yes', 'si'].includes(normalized)) {
          return true;
        }

        if (['false', '0', 'no'].includes(normalized)) {
          return false;
        }
      }

      return value;
    },
    z
      .boolean({
        invalid_type_error: `Query parameter "${fieldName}" must be a boolean.`,
      })
      .optional(),
  );

const optionalSort = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}, z.enum(searchSortValues).optional());

const optionalLocationScope = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}, z.enum(locationScopeValues).optional());

const buildLocationIntent = (
  scope: LocationIntentScope,
  options: {
    regionId?: string;
    provinceId?: string;
    comuneId?: string;
    label?: string;
    secondaryLabel?: string;
  },
): LocationIntent => ({
  scope,
  regionId: scope === 'italy' ? null : (options.regionId ?? null),
  provinceId: scope === 'italy' || scope === 'region' ? null : (options.provinceId ?? null),
  comuneId:
    scope === 'comune' || scope === 'comune_plus_province' ? (options.comuneId ?? null) : null,
  label: options.label ?? defaultLocationLabelByScope[scope],
  secondaryLabel: options.secondaryLabel ?? null,
});

const coalesceOptionalBoolean = (...values: Array<boolean | undefined>) =>
  values.find((value) => value !== undefined);

const searchListingsQuerySchema = z
  .object({
    q: optionalTrimmedString(120, 'q'),
    query: optionalTrimmedString(120, 'query'),
    locationScope: optionalLocationScope,
    scope: optionalLocationScope,
    regionId: optionalPositiveIntegerAsString('regionId'),
    provinceId: optionalPositiveIntegerAsString('provinceId'),
    comuneId: optionalPositiveIntegerAsString('comuneId'),
    locationLabel: optionalTrimmedString(180, 'locationLabel'),
    locationSecondaryLabel: optionalTrimmedString(200, 'locationSecondaryLabel'),
    referenceLat: optionalBoundedNumber('referenceLat', -90, 90),
    referenceLon: optionalBoundedNumber('referenceLon', -180, 180),
    listingType: optionalTrimmedString(40, 'listingType'),
    listing_type: optionalTrimmedString(40, 'listingType'),
    type: optionalTrimmedString(40, 'listingType'),
    priceMin: optionalNonNegativeNumber('priceMin'),
    priceMax: optionalNonNegativeNumber('priceMax'),
    ageText: optionalTrimmedString(80, 'ageText'),
    ageMinMonths: optionalInteger('ageMinMonths', 0, 480),
    ageMaxMonths: optionalInteger('ageMaxMonths', 0, 480),
    sex: optionalTrimmedString(20, 'sex'),
    breed: optionalTrimmedString(120, 'breed'),
    isSterilized: optionalBoolean('isSterilized'),
    is_sterilized: optionalBoolean('isSterilized'),
    isVaccinated: optionalBoolean('isVaccinated'),
    is_vaccinated: optionalBoolean('isVaccinated'),
    hasMicrochip: optionalBoolean('hasMicrochip'),
    has_microchip: optionalBoolean('hasMicrochip'),
    compatibleWithChildren: optionalBoolean('compatibleWithChildren'),
    compatible_with_children: optionalBoolean('compatibleWithChildren'),
    compatibleWithOtherAnimals: optionalBoolean('compatibleWithOtherAnimals'),
    compatible_with_other_animals: optionalBoolean('compatibleWithOtherAnimals'),
    sort: optionalSort,
    limit: optionalInteger('limit', 1, 100),
    offset: optionalInteger('offset', 0),
  })
  .superRefine((value, context) => {
    const locationScope = value.locationScope ?? value.scope;
    const hasLocationPayload =
      locationScope !== undefined ||
      value.regionId !== undefined ||
      value.provinceId !== undefined ||
      value.comuneId !== undefined ||
      value.locationLabel !== undefined ||
      value.locationSecondaryLabel !== undefined;

    if (hasLocationPayload && !locationScope) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationScope'],
        message: 'Query parameter "locationScope" is required when location filters are provided.',
      });
      return;
    }

    if (locationScope === 'italy') {
      if (value.regionId || value.provinceId || value.comuneId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['locationScope'],
          message: '"italy" scope cannot include regionId/provinceId/comuneId.',
        });
      }

      return;
    }

    if (locationScope === 'region' && !value.regionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['regionId'],
        message: 'Query parameter "regionId" is required for locationScope=region.',
      });
    }

    if (
      (locationScope === 'province' || locationScope === 'comune_plus_province') &&
      !value.provinceId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['provinceId'],
        message:
          'Query parameter "provinceId" is required for locationScope=province/comune_plus_province.',
      });
    }

    if (locationScope === 'comune') {
      if (!value.regionId || !value.provinceId || !value.comuneId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['comuneId'],
          message:
            'Query parameters "regionId", "provinceId" and "comuneId" are required for locationScope=comune.',
        });
      }
    }

    if ((value.referenceLat === undefined) !== (value.referenceLon === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['referenceLat'],
        message: 'Query parameters "referenceLat" and "referenceLon" must be provided together.',
      });
    }

    if (
      value.priceMin !== undefined &&
      value.priceMax !== undefined &&
      value.priceMin > value.priceMax
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceMin'],
        message: 'Query parameter "priceMin" cannot be greater than "priceMax".',
      });
    }

    if (
      value.ageMinMonths !== undefined &&
      value.ageMaxMonths !== undefined &&
      value.ageMinMonths > value.ageMaxMonths
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ageMinMonths'],
        message: 'Query parameter "ageMinMonths" cannot be greater than "ageMaxMonths".',
      });
    }

    if (
      value.breed !== undefined &&
      value.breed !== NO_BREED_FILTER &&
      !normalizeCatBreedLabel(value.breed)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['breed'],
        message: 'Query parameter "breed" must match one of the supported cat breeds.',
      });
    }
  })
  .transform((value): SearchListingsQueryDto => {
    const locationScope = value.locationScope ?? value.scope;
    const listingType = value.listingType ?? value.listing_type ?? value.type ?? null;
    const queryText = value.q ?? value.query ?? null;
    const isSterilized = coalesceOptionalBoolean(value.isSterilized, value.is_sterilized);
    const isVaccinated = coalesceOptionalBoolean(value.isVaccinated, value.is_vaccinated);
    const hasMicrochip = coalesceOptionalBoolean(value.hasMicrochip, value.has_microchip);
    const compatibleWithChildren = coalesceOptionalBoolean(
      value.compatibleWithChildren,
      value.compatible_with_children,
    );
    const compatibleWithOtherAnimals = coalesceOptionalBoolean(
      value.compatibleWithOtherAnimals,
      value.compatible_with_other_animals,
    );

    const locationIntent = locationScope
      ? buildLocationIntent(locationScope, {
          regionId: value.regionId,
          provinceId: value.provinceId,
          comuneId: value.comuneId,
          label: value.locationLabel,
          secondaryLabel: value.locationSecondaryLabel,
        })
      : null;

    return {
      queryText,
      locationIntent,
      referencePoint:
        value.referenceLat !== undefined && value.referenceLon !== undefined
          ? {
              lat: value.referenceLat,
              lon: value.referenceLon,
            }
          : null,
      listingType,
      priceMin: value.priceMin ?? null,
      priceMax: value.priceMax ?? null,
      ageText: value.ageText ?? null,
      ...(value.ageMinMonths !== undefined ? { ageMinMonths: value.ageMinMonths } : {}),
      ...(value.ageMaxMonths !== undefined ? { ageMaxMonths: value.ageMaxMonths } : {}),
      sex: value.sex ?? null,
      breed:
        value.breed === NO_BREED_FILTER
          ? NO_BREED_FILTER
          : (normalizeCatBreedLabel(value.breed) ?? null),
      ...(isSterilized !== undefined ? { isSterilized } : {}),
      ...(isVaccinated !== undefined ? { isVaccinated } : {}),
      ...(hasMicrochip !== undefined ? { hasMicrochip } : {}),
      ...(compatibleWithChildren !== undefined ? { compatibleWithChildren } : {}),
      ...(compatibleWithOtherAnimals !== undefined ? { compatibleWithOtherAnimals } : {}),
      sort: (value.sort ?? 'relevance') as SearchSort,
      limit: value.limit ?? 24,
      offset: value.offset ?? 0,
    };
  });

export interface SearchListingsQueryDto {
  queryText: string | null;
  locationIntent: LocationIntent | null;
  referencePoint?: {
    lat: number;
    lon: number;
  } | null;
  listingType: string | null;
  priceMin: number | null;
  priceMax: number | null;
  ageText: string | null;
  ageMinMonths?: number | null;
  ageMaxMonths?: number | null;
  sex: string | null;
  breed: string | null;
  isSterilized?: boolean | null;
  isVaccinated?: boolean | null;
  hasMicrochip?: boolean | null;
  compatibleWithChildren?: boolean | null;
  compatibleWithOtherAnimals?: boolean | null;
  sort: SearchSort;
  limit: number;
  offset: number;
}

export const validateSearchListingsQueryDto = (
  payload: unknown,
): { dto: SearchListingsQueryDto } | { issues: ValidationIssue[] } => {
  const result = searchListingsQuerySchema.safeParse(payload);
  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : 'query',
      message: issue.message,
    }));
    return { issues };
  }

  return { dto: result.data };
};
