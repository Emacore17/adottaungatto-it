import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const mimeTypeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const fallbackSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Placeholder gatto">
  <defs>
    <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#f8efea" />
      <stop offset="100%" stop-color="#e7d1cc" />
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)" rx="48" />
  <circle cx="600" cy="380" r="180" fill="#8c5b6f" opacity="0.18" />
  <path d="M470 330 530 200l70 110M730 330 670 200l-70 110" fill="#8c5b6f" opacity="0.32" />
  <circle cx="540" cy="390" r="16" fill="#8c5b6f" />
  <circle cx="660" cy="390" r="16" fill="#8c5b6f" />
  <path d="M575 455c18 18 32 24 49 24s31-6 49-24" fill="none" opacity="0.8" stroke="#8c5b6f" stroke-linecap="round" stroke-width="18" />
  <path d="M520 455h-88M768 455h-88M520 500h-76M756 500h-76" fill="none" opacity="0.6" stroke="#8c5b6f" stroke-linecap="round" stroke-width="10" />
</svg>
`.trim();

const resolveMockMediaDirectory = (): string | null => {
  const candidates = [
    resolve(process.cwd(), 'da-eliminare'),
    resolve(process.cwd(), '..', '..', 'da-eliminare'),
    resolve(process.cwd(), '..', 'da-eliminare'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const isSafeFileName = (value: string) =>
  value.length > 0 && !value.includes('..') && !/[\\/]/.test(value);

const fallbackResponse = () =>
  new NextResponse(fallbackSvg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      fileName: string;
    }>;
  },
) {
  const { fileName } = await context.params;
  if (!isSafeFileName(fileName)) {
    return NextResponse.json(
      {
        message: 'Invalid file name.',
      },
      { status: 400 },
    );
  }

  const mediaDirectory = resolveMockMediaDirectory();
  if (!mediaDirectory) {
    return fallbackResponse();
  }

  const extension = extname(fileName).toLowerCase();
  const mimeType = mimeTypeByExtension[extension];
  if (!mimeType) {
    return NextResponse.json(
      {
        message: 'Unsupported media type.',
      },
      { status: 415 },
    );
  }

  const absolutePath = resolve(mediaDirectory, fileName);
  if (!existsSync(absolutePath)) {
    return fallbackResponse();
  }

  try {
    const payload = await readFile(absolutePath);
    return new NextResponse(payload, {
      status: 200,
      headers: {
        'content-type': mimeType,
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: 'Unable to read mock media asset.',
      },
      { status: 500 },
    );
  }
}
