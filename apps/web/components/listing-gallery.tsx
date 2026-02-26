'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PublicListingMedia } from '../lib/listings';

interface ListingGalleryProps {
  title: string;
  media: PublicListingMedia[];
}

export function ListingGallery({ title, media }: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMedia = media[activeIndex] ?? media[0];

  if (!activeMedia) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-muted)]">
        Nessuna foto disponibile
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
        <Image
          alt={activeMedia.id}
          className="h-[320px] w-full object-cover sm:h-[420px]"
          height={activeMedia.height ?? 900}
          priority
          sizes="(max-width: 768px) 100vw, 800px"
          src={activeMedia.objectUrl}
          width={activeMedia.width ?? 1400}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {media.map((item, index) => (
          <button
            aria-label={`Apri immagine ${index + 1} di ${title}`}
            className={[
              'overflow-hidden rounded-xl border transition-all',
              index === activeIndex
                ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                : 'border-[var(--color-border)]',
            ].join(' ')}
            key={item.id}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <Image
              alt={item.id}
              className="h-16 w-full object-cover"
              height={item.height ?? 180}
              sizes="(max-width: 768px) 20vw, 120px"
              src={item.objectUrl}
              width={item.width ?? 240}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
