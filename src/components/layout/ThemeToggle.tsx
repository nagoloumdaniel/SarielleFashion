'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';

/* Sélecteur de thème clair / sombre.
   Le thème initial est appliqué dans <head> avant le premier rendu
   (préférence enregistrée, sinon préférence système). Ce bouton bascule,
   persiste le choix et met à jour la barre navigateur. */

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: Theme, persist = true): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Stockage indisponible (navigation privée stricte) : le thème reste actif pour la page.
    }
  }
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#151011' : '#fff8f7';
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useT();
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      let hasPreference = false;
      try {
        hasPreference = window.localStorage.getItem(STORAGE_KEY) !== null;
      } catch {
        hasPreference = false;
      }
      if (hasPreference) return;
      const next: Theme = media.matches ? 'dark' : 'light';
      applyTheme(next, false);
      setTheme(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  const label = theme === 'dark' ? t('common.theme.toLight') : t('common.theme.toDark');

  return (
    <button
      type="button"
      onClick={toggle}
      data-theme-toggle
      aria-label={label}
      aria-pressed={theme === 'dark'}
      title={label}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-card text-fg shadow-soft transition hover:border-cacao hover:bg-page ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="theme-icon-light size-[18px]"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="theme-icon-dark size-[18px]"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
      </svg>
    </button>
  );
}
