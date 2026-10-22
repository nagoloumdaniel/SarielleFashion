import { INTL_LOCALE, type Locale } from './config';

/* Formats locaux via Intl (euro, dates, heures, durées). Aucun format écrit en dur. */

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function numberFormat(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `n:${locale}:${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(INTL_LOCALE[locale], options);
    cache.set(key, f);
  }
  return f as Intl.NumberFormat;
}

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `d:${locale}:${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(INTL_LOCALE[locale], options);
    cache.set(key, f);
  }
  return f as Intl.DateTimeFormat;
}

/** Montant en centimes -> « 45 € » / « 45,50 € » (entier sans décimales). */
export function formatEuro(locale: Locale, cents: number): string {
  const euros = cents / 100;
  return numberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions) {
  return numberFormat(locale, options ?? {}).format(value);
}

export function formatDate(
  locale: Locale,
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  return dateFormat(locale, options).format(new Date(date));
}

/** Durée en minutes -> « 1 h 30 » (fr) / « 1 Std. 30 Min. » (de). */
export function formatDuration(locale: Locale, minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hLabel = locale === 'de' ? 'Std.' : 'h';
  const mLabel = locale === 'de' ? 'Min.' : 'min';
  if (h === 0) return `${m} ${mLabel}`;
  if (m === 0) return `${h} ${hLabel}`;
  return locale === 'de' ? `${h} ${hLabel} ${m} ${mLabel}` : `${h} h ${String(m).padStart(2, '0')}`;
}
