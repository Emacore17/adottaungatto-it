import { redirect } from 'next/navigation';

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = new URLSearchParams();

  if (resolvedSearchParams) {
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          query.append(key, item);
        }
        continue;
      }

      if (value) {
        query.set(key, value);
      }
    }
  }

  const queryString = query.toString();
  redirect(queryString ? `/annunci?${queryString}` : '/annunci');
}
