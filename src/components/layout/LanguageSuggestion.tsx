'use client';

import { Languages, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LOCALES, isLocale, localePath, type Locale } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { usePathname } from '@/i18n/link';
import { MESSAGES } from '@/i18n/messages';

/* Suggestion de langue DOUCE : jamais de redirection automatique. Si la langue du navigateur
   est gérée et différente de la page courante, un petit encart fermable propose l'autre version
   (texte dans la langue proposée). Choix mémorisé en localStorage (sans effet sur le SEO). */
const STORAGE_KEY = 'lang-suggestion-dismissed';

function browserLocale(): Locale | null {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const primary = tag.toLowerCase().split('-')[0];
    if (isLocale(primary)) return primary;
  }
  return null;
}

export function LanguageSuggestion() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const [suggested, setSuggested] = useState<Locale | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      dismissed = false;
    }
    const preferred = browserLocale();
    setSuggested(!dismissed && preferred && preferred !== locale ? preferred : null);
  }, [locale]);

  if (!suggested || !LOCALES.includes(suggested)) return null;
  const copy = MESSAGES[suggested].nav.language.suggest[suggested];

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Stockage indisponible : l'encart se fermera simplement pour cette page.
    }
    setSuggested(null);
  };

  return (
    <div
      role="region"
      aria-label={copy.text}
      lang={suggested}
      className="glass-strong fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-[var(--radius-lg)] border border-line px-4 py-3 text-sm shadow-soft"
    >
      <Languages aria-hidden="true" className="size-5 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-fg">
        {copy.text}{' '}
        <a
          href={localePath(suggested, pathname)}
          hrefLang={suggested}
          className="font-semibold text-accent underline underline-offset-2"
        >
          {copy.action}
        </a>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.dismiss}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-fg"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
