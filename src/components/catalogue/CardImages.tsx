'use client';

import Image from 'next/image';
import { useI18n } from '@/i18n/client';
import { useRouter } from '@/i18n/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IMAGE_BLUR_DATA_URL } from '@/lib/image-placeholder';
import { DOT_CLASS, dotWindow } from './dots';

type Img = { src: string; alt: string };

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
/* Photos de la carte (DESIGN-RULES.md).
   - Souris : fondu entre photos au survol/focus (aucun mouvement sans survol).
   - Tactile : balayage horizontal (scroll-snap) directement sur la carte ; le défilement
     vertical de la page et le toucher simple vers la fiche restent natifs.
   - Points : 3 maximum, fenêtre glissante. */
export function CardImages({
  images,
  href,
  priority = false,
}: {
  images: Img[];
  href: string;
  priority?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const count = images.length;
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  /* Fondu automatique : survol à la souris uniquement, jamais avec reduced-motion. */
  useEffect(() => {
    if (!active || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 1800);
    return () => window.clearInterval(id);
  }, [active, count]);

  /* Le survol est écouté sur la carte entière (le lien étiré recouvre la photo). */
  useEffect(() => {
    const card = root.current?.closest('article');
    if (!card) return;
    const fine = () => window.matchMedia(FINE_POINTER).matches;
    const start = () => {
      if (fine()) setActive(true);
    };
    const stop = () => {
      if (!fine()) return;
      setActive(false);
      setIndex(0);
    };
    card.addEventListener('pointerenter', start);
    card.addEventListener('pointerleave', stop);
    card.addEventListener('focusin', start);
    card.addEventListener('focusout', stop);
    return () => {
      card.removeEventListener('pointerenter', start);
      card.removeEventListener('pointerleave', stop);
      card.removeEventListener('focusin', start);
      card.removeEventListener('focusout', stop);
    };
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /* Tactile : l'index suit la position de défilement. */
  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = scroller.current;
      if (!el || el.clientWidth === 0) return;
      const next = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(Math.min(Math.max(next, 0), count - 1));
    });
  }, [count]);

  /* Un simple toucher sur la photo ouvre la fiche (un balayage ne déclenche pas de clic). */
  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      router.push(href);
    },
    [href, router],
  );

  const dots = count > 1 ? dotWindow(index, count) : null;

  return (
    <div ref={root} className="absolute inset-0">
      <div
        ref={scroller}
        onScroll={count > 1 ? onScroll : undefined}
        onClick={onClick}
        tabIndex={count > 1 ? 0 : undefined}
        role="group"
        aria-label={t('catalogue.card.photosGroup')}
        className="card-slides"
      >
        {images.map((image, i) => (
          <div key={image.src} className="card-slide" data-active={i === index}>
            <Image
              src={image.src}
              alt={i === index ? image.alt : ''}
              fill
              sizes="(max-width: 640px) 80vw, (max-width: 1024px) 46vw, 32vw"
              priority={priority && i === 0}
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
              quality={80}
              draggable={false}
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {dots ? (
        <div
          role="img"
          aria-label={t('catalogue.card.photoOf', { n: index + 1, count })}
          className="pointer-events-none absolute inset-x-0 bottom-[8.25rem] z-[2] flex justify-center gap-1.5"
        >
          {dots.sizes.map((size, slot) => (
            <span
              key={slot}
              className={`card-dot h-1.5 rounded-full bg-white ${DOT_CLASS[size]}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
