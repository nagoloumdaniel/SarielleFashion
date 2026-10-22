import type { Metadata } from 'next';
import { LOCALES, OG_LOCALE, absoluteUrl, localePath, type Locale } from './config';

/** Liens canonical + hreflang (fr, de, x-default = français) d'une page publique. */
export function languageAlternates(locale: Locale, path: string): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(l, path);
  languages['x-default'] = absoluteUrl('fr', path);
  return { canonical: absoluteUrl(locale, path), languages };
}

/** Image Open Graph/Twitter par langue (/opengraph-image en français, /de/opengraph-image en allemand). */
export function socialImages(locale: Locale, alt: string) {
  return [{ url: localePath(locale, '/opengraph-image'), width: 1200, height: 630, alt }];
}

/** Métadonnées localisées d'une page : titre/description uniques par langue + canonical/hreflang + OG/Twitter. */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  noindex = false,
  ogType = 'website',
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
  ogType?: 'website' | 'article';
}): Metadata {
  const url = localePath(locale, path);
  return {
    title,
    description,
    alternates: languageAlternates(locale, path),
    openGraph: {
      type: ogType,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      url,
      siteName: 'Sarielle Fashion',
      title,
      description,
      images: socialImages(locale, title),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: socialImages(locale, title),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
