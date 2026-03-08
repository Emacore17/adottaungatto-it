const normalizeListingImageTitle = (value: string) => {
  const normalized = value
    .trim()
    .replace(/^\[[^\]]+\]\s*/u, '')
    .replace(/\s*#\d+\s*$/u, '')
    .trim();

  return normalized || 'Gatto';
};

const normalizeBreedLabel = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : 'Non di razza';
};

export const buildListingImageAlt = (input: { title: string; breed?: string | null }) => {
  const titleLabel = normalizeListingImageTitle(input.title);
  const breedLabel = normalizeBreedLabel(input.breed);
  return `${titleLabel} - ${breedLabel} - disponibile per adozione`;
};
