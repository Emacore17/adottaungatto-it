'use client';

import { Cat } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { PublicListingMedia } from '../lib/listings';

interface ListingGalleryProps {
  listingId: string;
  title: string;
  media: PublicListingMedia[] | null | undefined;
}

const placeholderMediaFileNames = [
  'gattino-1.jpg',
  'gattino-2.webp',
  'gattino-3.png',
  'gattino-4.png',
  'gattino-5.jpeg',
  'gattino-6.jpg',
  'gattino-7.jpg',
  'gattino-8.jpg',
] as const;

const resolvePlaceholderMediaFileName = (listingId: string) => {
  let hash = 0;
  for (let index = 0; index < listingId.length; index += 1) {
    hash = (hash + listingId.charCodeAt(index) * (index + 1)) % 2_147_483_647;
  }

  return placeholderMediaFileNames[Math.abs(hash) % placeholderMediaFileNames.length];
};

const resolveImageUrl = (value: string, fallbackFileName: string) => {
  if (!value) {
    return `/mock-media/${fallbackFileName}`;
  }

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return value;
  }

  const params = new URLSearchParams({
    src: value,
    fallbackFile: fallbackFileName,
  });
  return `/api/listings/media-proxy?${params.toString()}`;
};

export function ListingGallery({ listingId, title, media }: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const galleryMedia = useMemo(() => {
    const fallbackFileName = resolvePlaceholderMediaFileName(listingId);
    const items = (media ?? [])
      .slice()
      .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }

        return left.position - right.position;
      })
      .map((item, index) => ({
        id: item.id,
        src: resolveImageUrl(item.objectUrl?.trim() ?? '', fallbackFileName),
        alt: `${title || 'Annuncio'} - foto ${index + 1}`,
      }));

    return items;
  }, [listingId, media, title]);

  useEffect(() => {
    if (activeIndex < galleryMedia.length) {
      return;
    }

    setActiveIndex(0);
  }, [activeIndex, galleryMedia.length]);

  if (galleryMedia.length === 0) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-muted)_62%,transparent)] p-6 text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
          <Cat aria-hidden="true" className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          Nessuna foto disponibile
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
        <Image
          alt={galleryMedia[activeIndex]?.alt ?? title}
          className="object-cover"
          fill
          priority
          sizes="(min-width: 1024px) 720px, 100vw"
          src={galleryMedia[activeIndex]?.src ?? galleryMedia[0].src}
          unoptimized
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {galleryMedia.map((item, index) => (
          <button
            aria-label={`Apri foto ${index + 1}`}
            className={`relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border-2 transition-[opacity,border-color] ${
              index === activeIndex
                ? 'border-[var(--color-primary)]'
                : 'border-transparent hover:opacity-80'
            }`}
            key={item.id}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <Image
              alt={item.alt}
              className="object-cover"
              fill
              sizes="80px"
              src={item.src}
              unoptimized
            />
          </button>
        ))}
      </div>
    </div>
  );
}
