'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LOCALES, LOCALE_LABEL, localePath, type Locale } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { usePathname } from '@/i18n/link';

/* Sélecteur de langue FR | DE : liens réels (indexables, utilisables sans JavaScript),
   conserve la page courante et ses paramètres. Règle : DESIGN-RULES.md. */
function Switcher({
  className = '',
  tone = 'default',
}: {
  className?: string;
  tone?: 'default' | 'dark';
}) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target = (l: Locale) => localePath(l, `${pathname}${search ? `?${search}` : ''}`);
  return <SwitcherView locale={locale} t={t} target={target} className={className} tone={tone} />;
}

function SwitcherView({
  locale,
  t,
  target,
  className,
  tone,
}: {
  locale: Locale;
  t: ReturnType<typeof useI18n>['t'];
  target: (l: Locale) => string;
  className: string;
  tone: 'default' | 'dark';
}) {
  const shell =
    tone === 'dark'
      ? 'border-panel-fg/25 bg-panel-fg/10 text-panel-fg'
      : 'border-line bg-card text-fg';
  return (
    <nav aria-label={t('nav.language.label')} className={className}>
      <ul className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${shell}`}>
        {LOCALES.map((l) => {
          const active = l === locale;
          const { short, name } = LOCALE_LABEL[l];
          return (
            <li key={l}>
              <a
                href={target(l)}
                lang={l}
                hrefLang={l}
                aria-current={active ? 'true' : undefined}
                aria-label={`${short} - ${
                  active
                    ? t('nav.language.current', { name })
                    : t('nav.language.switchTo', { name })
                }`}
                title={name}
                className={`flex h-8 min-w-9 items-center justify-center rounded-full px-2.5 text-xs font-bold tracking-wide transition ${
                  active
                    ? tone === 'dark'
                      ? 'bg-panel-fg text-footer'
                      : 'bg-accent text-accent-fg'
                    : tone === 'dark'
                      ? 'hover:bg-panel-fg/20'
                      : 'hover:bg-accent-soft'
                }`}
              >
                {short}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* useSearchParams exige un Suspense : le repli affiche les mêmes liens sans paramètres. */
export function LanguageSwitcher(props: { className?: string; tone?: 'default' | 'dark' }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  return (
    <Suspense
      fallback={
        <SwitcherView
          locale={locale}
          t={t}
          target={(l) => localePath(l, pathname)}
          className={props.className ?? ''}
          tone={props.tone ?? 'default'}
        />
      }
    >
      <Switcher {...props} />
    </Suspense>
  );
}
