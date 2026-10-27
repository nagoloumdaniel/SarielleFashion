import { getCachedSalonSettings } from '@/lib/public-cache';
import { formatOpeningHours } from '@/modules/parametres/hours';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';

const WEEKDAYS_DE: Record<string, string> = {
  Lundi: 'Montag',
  Mardi: 'Dienstag',
  Mercredi: 'Mittwoch',
  Jeudi: 'Donnerstag',
  Vendredi: 'Freitag',
  Samedi: 'Samstag',
  Dimanche: 'Sonntag',
};

/**
 * Lignes d'horaires dans la langue demandée.
 * fr : « Lundi - Dimanche : 5h - 22h » ; de : « Montag - Sonntag: 5 - 22 Uhr » (« 17h30 » devient « 17:30 »).
 */
export function localizeOpeningHours(lines: string[], locale: Locale): string[] {
  if (locale === DEFAULT_LOCALE) return lines;
  return lines.map((line) => {
    const [days = '', range = ''] = line.split(' : ');
    const translatedDays = days.replace(/[A-Za-zéû]+/g, (name) => WEEKDAYS_DE[name] ?? name);
    const translatedRange = range.replace(
      /(\d+)h(\d{2})?/g,
      (_, h: string, m: string | undefined) => (m ? `${h}:${m}` : h),
    );
    return `${translatedDays}: ${translatedRange} Uhr`;
  });
}

/** Lignes d'horaires publiques (« Lundi - Dimanche : 5h - 22h »), valeurs par défaut si les paramètres sont illisibles. */
export async function getPublicHoursLines(locale: Locale = DEFAULT_LOCALE): Promise<string[]> {
  try {
    const settings = await getCachedSalonSettings();
    return localizeOpeningHours(formatOpeningHours(settings.openingHours), locale);
  } catch (error) {
    console.error('[horaires] paramètres illisibles, horaires par défaut', error);
    return localizeOpeningHours(formatOpeningHours(null), locale);
  }
}
