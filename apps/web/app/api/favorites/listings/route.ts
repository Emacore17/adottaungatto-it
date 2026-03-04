import { NextResponse } from 'next/server';
import { fetchPublicListingById } from '../../../../lib/listings';

const maxFavoriteIds = 24;

const parseFavoriteIds = (request: Request) => {
  const { searchParams } = new URL(request.url);
  const allValues = [
    ...searchParams.getAll('id'),
    ...searchParams
      .getAll('ids')
      .flatMap((value) => value.split(',')),
  ];

  return Array.from(
    new Set(
      allValues
        .map((value) => value.trim())
        .filter((value) => /^[a-zA-Z0-9-]+$/u.test(value))
        .slice(0, maxFavoriteIds),
    ),
  );
};

export async function GET(request: Request) {
  const favoriteIds = parseFavoriteIds(request);
  if (favoriteIds.length === 0) {
    return NextResponse.json({
      listings: [],
      missingIds: [],
    });
  }

  const results = await Promise.allSettled(
    favoriteIds.map(async (favoriteId) => ({
      favoriteId,
      listing: await fetchPublicListingById(favoriteId),
    })),
  );

  const rejectedRequest = results.find((result) => result.status === 'rejected');
  if (rejectedRequest?.status === 'rejected') {
    return NextResponse.json(
      {
        message: 'Impossibile caricare i preferiti in questo momento.',
      },
      { status: 502 },
    );
  }

  const listings = results
    .flatMap((result) => (result.status === 'fulfilled' && result.value.listing ? [result.value.listing] : []));
  const missingIds = results.flatMap((result) =>
    result.status === 'fulfilled' && result.value.listing === null ? [result.value.favoriteId] : [],
  );

  return NextResponse.json({
    listings,
    missingIds,
  });
}
