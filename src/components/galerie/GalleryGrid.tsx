'use client';

import { Maximize2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useI18n } from '@/i18n/client';
import { Lightbox } from '@/components/ui/Lightbox';
import { IMAGE_BLUR_DATA_URL } from '@/lib/image-placeholder';

export type GalleryGridPhoto = {
  id: string;
  src: string;
  alt: string;
  serviceName: string | null;
  caption: string;
};

/* Grille de réalisations : chaque photo est un bouton qui ouvre la visionneuse
   (clavier : Entrée, flèches, Échap). Pas de zoom au survol (DESIGN-RULES). */
export function GalleryGrid({
  photos,
  label,
  compact = false,
}: {
  photos: GalleryGridPhoto[];
  label?: string;
  /** Accueil : 3 colonnes dès `sm`, pas de légende sous la photo. */
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [opened, setOpened] = useState<number | null>(null);
  return (
    <>
      <ul
        aria-label={label ?? t('common.ui.gallery.gridLabel')}
        className={`grid gap-3 sm:gap-4 ${
          compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
        }`}
      >
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpened(index)}
              aria-label={t('common.ui.gallery.enlarge', { alt: photo.alt })}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)] bg-line text-left shadow-soft"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={
                  compact
                    ? '(min-width: 640px) 33vw, 50vw'
                    : '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw'
                }
                className="object-cover"
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_DATA_URL}
              />
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none max-sm:opacity-100"
              >
                <Maximize2 className="size-4" />
              </span>
              {!compact && photo.serviceName ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-sm font-semibold text-white">
                  {photo.serviceName}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <Lightbox
        images={photos.map((photo) => ({
          src: photo.src,
          alt: photo.alt,
          caption: [photo.caption, photo.serviceName].filter(Boolean).join(' - ') || null,
        }))}
        index={opened}
        onClose={() => setOpened(null)}
        onIndexChange={setOpened}
      />
    </>
  );
}
