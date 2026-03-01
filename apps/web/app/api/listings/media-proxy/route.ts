import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const isSupportedProtocol = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const safeFallbackFileName = (value: string | null): string => {
  if (!value) {
    return 'gattino-1.jpg';
  }

  const normalized = value.trim();
  if (!/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(normalized)) {
    return 'gattino-1.jpg';
  }

  return normalized;
};

const fallbackImageUrl = (request: Request, fallbackFile: string) =>
  new URL(`/mock-media/${fallbackFile}`, request.url);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get('src')?.trim() ?? '';
  const fallbackFile = safeFallbackFileName(url.searchParams.get('fallbackFile'));
  const fallbackUrl = fallbackImageUrl(request, fallbackFile);

  if (!src || !isSupportedProtocol(src)) {
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    const upstream = await fetch(src, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.redirect(fallbackUrl);
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.redirect(fallbackUrl);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=1800, stale-while-revalidate=86400',
      },
    });
  } catch {
    return NextResponse.redirect(fallbackUrl);
  }
}
