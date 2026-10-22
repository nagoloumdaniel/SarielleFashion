/* i18n - configuration pure (utilisable côté edge, serveur et client).
 * Français = langue par défaut, SANS préfixe d'URL. Allemand = préfixe /de.
 * Les routes ne sont PAS déplacées dans un dossier [locale] : le middleware réécrit
 * /de/... vers la même route interne et pose le locale (en-tête x-locale + cookie). */
export const LOCALES = ['fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export const LOCALE_HEADER = 'x-locale';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** Locale Intl à utiliser pour les dates, nombres et pluriels. */
export const INTL_LOCALE: Record<Locale, string> = { fr: 'fr-FR', de: 'de-DE' };
/** Attribut <html lang>. */
export const HTML_LANG: Record<Locale, string> = { fr: 'fr', de: 'de' };
/** og:locale (le salon est en Allemagne). */
export const OG_LOCALE: Record<Locale, string> = { fr: 'fr_DE', de: 'de_DE' };
/** Nom natif affiché dans le sélecteur de langue. */
export const LOCALE_LABEL: Record<Locale, { short: string; name: string }> = {
  fr: { short: 'FR', name: 'Français' },
  de: { short: 'DE', name: 'Deutsch' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Préfixes d'URL qui ne sont JAMAIS localisés (dashboard admin en français, API, auth, assets). */
export const UNLOCALIZED_PREFIXES = ['/dashboard', '/api', '/connexion', '/_next'] as const;

function splitSuffix(href: string): { path: string; suffix: string } {
  const i = href.search(/[?#]/);
  return i === -1 ? { path: href, suffix: '' } : { path: href.slice(0, i), suffix: href.slice(i) };
}

export function isUnlocalizedPath(path: string): boolean {
  return UNLOCALIZED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Retire le préfixe de langue d'un chemin : '/de/faq?x=1' -> { locale: 'de', path: '/faq?x=1' }. */
export function stripLocale(href: string): { locale: Locale; path: string } {
  const { path, suffix } = splitSuffix(href);
  for (const l of LOCALES) {
    if (l === DEFAULT_LOCALE) continue;
    if (path === `/${l}`) return { locale: l, path: `/${suffix}` };
    if (path.startsWith(`/${l}/`)) return { locale: l, path: `${path.slice(l.length + 1)}${suffix}` };
  }
  return { locale: DEFAULT_LOCALE, path: href };
}

/** Chemin interne ('/coiffures') -> URL publique de la langue ('/de/coiffures' ; français inchangé).
 *  Idempotent. Laisse intacts : URL absolues, mailto:, tel:, ancres, requêtes seules, routes non localisées. */
export function localePath(locale: Locale, href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const base = stripLocale(href).path;
  const { path, suffix } = splitSuffix(base);
  if (isUnlocalizedPath(path)) return base;
  if (locale === DEFAULT_LOCALE) return base;
  return `/${locale}${path === '/' ? '' : path}${suffix}`;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  ).replace(/\/$/, '');
}

/** URL absolue d'une page dans une langue. */
export function absoluteUrl(locale: Locale, path: string): string {
  return `${siteUrl()}${localePath(locale, path)}`;
}

/** Meilleure langue d'après l'en-tête Accept-Language (null si aucune langue gérée). */
export function preferredLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = Number(params.find((p) => p.trim().startsWith('q='))?.split('=')[1] ?? 1);
      return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const primary = tag.split('-')[0];
    if (isLocale(primary)) return primary;
  }
  return null;
}
