'use client';

import { useLayoutEffect } from 'react';

/* Le dashboard n'a qu'un seul thème (clair, palette de marque) : pas de bascule clair / sombre.
   Force data-theme="light" tant que l'admin est dans /dashboard, sans toucher au choix
   enregistré pour le site public, restauré en quittant. */
export function DashboardThemeLock() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = 'light';
    root.style.colorScheme = 'light';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = '#fff8f7';
    return () => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem('theme');
      } catch {
        stored = null;
      }
      const next =
        stored === 'dark' || stored === 'light'
          ? stored
          : window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
      root.dataset.theme = next;
      root.style.colorScheme = next;
      if (meta) meta.content = next === 'dark' ? '#151011' : '#fff8f7';
    };
  }, []);
  return null;
}
