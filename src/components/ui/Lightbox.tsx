'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from './useScrollLock';

export type LightboxImage = { src: string; alt: string; caption?: string | null };

/* Visionneuse plein écran accessible : dialogue modal, flèches gauche / droite, Échap,
   piège à focus, page verrouillée, retour du focus au déclencheur. `index` null = fermée. */
export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const open = index !== null && images.length > 0;
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const stateRef = useRef({ index, count: images.length, onClose, onIndexChange });
  useEffect(() => {
    stateRef.current = { index, count: images.length, onClose, onIndexChange };
  });
  const triggerRef = useRef<HTMLElement | null>(null);
  if (open && !triggerRef.current && typeof document !== 'undefined') {
    triggerRef.current = document.activeElement as HTMLElement | null;
  }

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const returnTo = triggerRef.current;
    const panel = panelRef.current;
    panel?.focus();
    const onKey = (event: KeyboardEvent) => {
      const { index: current, count, onClose: close, onIndexChange: change } = stateRef.current;
      if (current === null) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowRight' && count > 1) {
        event.preventDefault();
        change((current + 1) % count);
      } else if (event.key === 'ArrowLeft' && count > 1) {
        event.preventDefault();
        change((current - 1 + count) % count);
      } else if (event.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled])'));
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      triggerRef.current = null;
      returnTo?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  const current = images[Math.min(index, images.length - 1)]!;
  const position = Math.min(index, images.length - 1);
  const many = images.length > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col items-center justify-center gap-3 p-3 outline-none sm:p-8"
      >
        <h2 id={titleId} className="sr-only">
          Photo {position + 1} sur {images.length}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la visionneuse"
          className="absolute right-3 top-3 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:right-6 sm:top-6"
        >
          <X aria-hidden="true" className="size-6" />
        </button>

        <div className="relative min-h-0 w-full max-w-5xl flex-1">
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        {current.caption ? (
          <p className="max-w-2xl text-center text-sm text-white/90">{current.caption}</p>
        ) : null}
        {many ? (
          <p aria-hidden="true" className="text-xs font-medium text-white/70">
            {position + 1} / {images.length}
          </p>
        ) : null}

        {many ? (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((position - 1 + images.length) % images.length)}
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:left-6"
            >
              <ChevronLeft aria-hidden="true" className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((position + 1) % images.length)}
              aria-label="Photo suivante"
              className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:right-6"
            >
              <ChevronRight aria-hidden="true" className="size-6" />
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
