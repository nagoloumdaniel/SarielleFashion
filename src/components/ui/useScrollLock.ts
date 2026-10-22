'use client';

import { useEffect } from 'react';

/* Verrouille le défilement de la page tant qu'une surcouche est ouverte.
   Compteur partagé : plusieurs surcouches empilées ne se libèrent qu'à la dernière fermeture. */
let locks = 0;
let previous: { overflow: string; paddingRight: string } | null = null;

function lock() {
  if (locks++ > 0) return;
  const { body, documentElement } = document;
  const scrollbar = window.innerWidth - documentElement.clientWidth;
  previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = 'hidden';
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
}

function unlock() {
  if (--locks > 0 || !previous) return;
  locks = 0;
  document.body.style.overflow = previous.overflow;
  document.body.style.paddingRight = previous.paddingRight;
  previous = null;
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
