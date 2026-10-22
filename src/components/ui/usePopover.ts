'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

/* Ouverture/fermeture d'un menu flottant : clic extérieur et Échap ferment. */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Capture + stop : Échap ferme le menu, pas la modale qui le contient.
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/* Événement minimal compatible avec les handlers existants (event.target.value). */
export function fakeChange<T extends HTMLElement>(name: string | undefined, value: string) {
  return { target: { name, value }, currentTarget: { name, value } } as unknown as ChangeEvent<T>;
}
