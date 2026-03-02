export const CAT_BREEDS = [
  {
    slug: 'europeo',
    label: 'Europeo',
  },
  {
    slug: 'persiano',
    label: 'Persiano',
  },
  {
    slug: 'maine-coon',
    label: 'Maine Coon',
  },
  {
    slug: 'siamese',
    label: 'Siamese',
  },
  {
    slug: 'ragdoll',
    label: 'Ragdoll',
  },
  {
    slug: 'british-shorthair',
    label: 'British Shorthair',
  },
  {
    slug: 'bengala',
    label: 'Bengala',
  },
  {
    slug: 'sphynx',
    label: 'Sphynx',
  },
] as const;

export type CatBreedDefinition = (typeof CAT_BREEDS)[number];

export type CatBreedSlug = CatBreedDefinition['slug'];

export type CatBreedLabel = CatBreedDefinition['label'];

export const CAT_BREED_LABELS = CAT_BREEDS.map((breed) => breed.label);

const canonicalBreedLookup = new Map<string, CatBreedDefinition>();

for (const breed of CAT_BREEDS) {
  canonicalBreedLookup.set(breed.slug.toLowerCase(), breed);
  canonicalBreedLookup.set(breed.label.toLowerCase(), breed);
}

export const normalizeCatBreed = (value: string | null | undefined): CatBreedDefinition | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return canonicalBreedLookup.get(normalized) ?? null;
};

export const normalizeCatBreedLabel = (value: string | null | undefined): CatBreedLabel | null =>
  normalizeCatBreed(value)?.label ?? null;

export const isSupportedCatBreedLabel = (value: string): value is CatBreedLabel =>
  normalizeCatBreedLabel(value) !== null;
