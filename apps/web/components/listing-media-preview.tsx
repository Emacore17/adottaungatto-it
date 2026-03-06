'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PublicListingMedia } from '../lib/listings';

interface ListingMediaPreviewProps {
  listingId: string;
  media: PublicListingMedia[];
  mediaCount: number;
  title: string;
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

const resolveCardImageUrl = (imageUrl: string, fallbackFileName: string) => {
  if (!imageUrl) {
    return `/mock-media/${fallbackFileName}`;
  }

  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  const params = new URLSearchParams({
    src: imageUrl,
    fallbackFile: fallbackFileName,
  });
  return `/api/listings/media-proxy?${params.toString()}`;
};

export function ListingMediaPreview({
  listingId,
  media,
  mediaCount,
  title,
}: ListingMediaPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const previewUrls = useMemo(() => {
    const placeholderFileName = resolvePlaceholderMediaFileName(listingId);
    const uniqueUrls = new Set<string>();
    const urls = media
      .map((item) => resolveCardImageUrl(item.objectUrl?.trim() ?? '', placeholderFileName))
      .filter((item) => {
        if (uniqueUrls.has(item)) {
          return false;
        }

        uniqueUrls.add(item);
        return true;
      });

    if (urls.length > 0) {
      return urls;
    }

    return [`/mock-media/${placeholderFileName}`];
  }, [listingId, media]);

  useEffect(() => {
    if (!isHovered || previewUrls.length < 2) {
      setActiveIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % previewUrls.length);
    }, 1400);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isHovered, previewUrls.length]);

  return (
    <div
      aria-label={title}
      className="relative h-full min-h-[176px] overflow-hidden rounded-t-[29px] bg-[var(--color-surface-muted)] [clip-path:inset(0_round_29px_29px_0_0)] md:rounded-l-[29px] md:rounded-t-none md:[clip-path:inset(0_round_29px_0_0_29px)]"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => {
        setIsHovered(false);
        setActiveIndex(0);
      }}
      role="img"
    >
      {previewUrls.map((imageUrl, index) => (
        <div
          className={`absolute inset-0 bg-cover bg-center transform-gpu transition-[opacity,transform,filter] duration-500 ease-out [backface-visibility:hidden] ${
            index === activeIndex ? 'opacity-100' : 'opacity-0'
          } ${isHovered ? 'scale-[1.04]' : 'scale-100'}`}
          key={imageUrl}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(24,19,21,0.02) 0%, rgba(24,19,21,0.18) 100%), url("${imageUrl}")`,
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

      {mediaCount > 1 ? (
        <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-white/20 bg-black/28 px-2.5 py-1 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md">
          {mediaCount} foto
        </span>
      ) : null}
    </div>
  );
}
