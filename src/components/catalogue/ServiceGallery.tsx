'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { IMAGE_BLUR_DATA_URL } from '@/lib/image-placeholder';

type GalleryImage = { key: string; src: string; alt: string };

const NAV_BUTTON = 'absolute top-1/2 -translate-y-1/2';

/**
 * Galerie de la fiche prestation : cadre au ratio fixe (pas de décalage de mise en page),
 * photo plein cadre, miniatures, boutons précédent/suivant, flèches clavier et balayage tactile.
 * Le composant ne reçoit que des URLs résolues côté serveur.
 */
export function ServiceGallery({
  images,
  serviceName,
}: {
  images: GalleryImage[];
  serviceName: string;
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) return null;

  const count = images.length;
  const active = images[index] ?? images[0]!;

  const goTo = (nextIndex: number) => setIndex((nextIndex + count) % count);

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-roledescription="carrousel"
        aria-label={`Galerie photos de ${serviceName}`}
        tabIndex={count > 1 ? 0 : undefined}
        onKeyDown={(event) => {
          if (count < 2) return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goTo(index - 1);
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            goTo(index + 1);
          }
        }}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          const end = event.changedTouches[0]?.clientX;
          if (count < 2 || start == null || end == null) return;
          const delta = end - start;
          if (Math.abs(delta) > 40) goTo(delta < 0 ? index + 1 : index - 1);
        }}
        className="relative aspect-square w-full sm:aspect-[4/5] touch-pan-y overflow-hidden rounded-[var(--radius-xl)] bg-line shadow-soft focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
      >
        <Image
          key={active.key}
          src={active.src}
          alt={active.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
          placeholder="blur"
          blurDataURL={IMAGE_BLUR_DATA_URL}
          quality={80}
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-ink/35 to-transparent"
        />

        {count > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconOnly
              icon={ChevronLeft}
              onClick={() => goTo(index - 1)}
              className={`${NAV_BUTTON} left-3`}
            >
              Photo précédente
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconOnly
              icon={ChevronRight}
              onClick={() => goTo(index + 1)}
              className={`${NAV_BUTTON} right-3`}
            >
              Photo suivante
            </Button>
            <p
              aria-live="polite"
              className="absolute bottom-3 right-3 rounded-full bg-ink/75 px-3 py-1 text-xs font-semibold tabular-nums text-panel-fg"
            >
              {index + 1} / {count}
            </p>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul aria-label="Miniatures de la galerie" className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((image, imageIndex) => {
            const activeThumb = imageIndex === index;
            return (
              <li key={image.key}>
                <button
                  type="button"
                  onClick={() => setIndex(imageIndex)}
                  aria-label={`Afficher la photo ${imageIndex + 1} sur ${count}`}
                  aria-current={activeThumb ? 'true' : undefined}
                  className={`relative block aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    activeThumb
                      ? 'border-accent'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 25vw, 12vw"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
