import { INTL_LOCALE, type Locale } from './config';
import { formatOpeningHours, readOpeningHours } from '@/modules/parametres/hours';

/* Horaires publics dans la langue de la page.
   fr : « Lundi - Dimanche : 5h - 22h » (inchangé). de : « Montag - Sonntag: 5:00 - 22:00 Uhr ». */
function weekdayName(locale: Locale, weekday: number): string {
  // 1er janvier 2024 = lundi
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, 1 + weekday)),
  );
}

function germanHour(value: string): string {
  const [h = '0', m = '00'] = value.split(':');
  return `${Number.parseInt(h, 10)}:${m.padStart(2, '0')}`;
}

export function formatOpeningHoursLocale(raw: unknown, locale: Locale): string[] {
  if (locale === 'fr') return formatOpeningHours(raw);
  const { days, open, close } = readOpeningHours(raw);
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const range = `${germanHour(open)} - ${germanHour(close)} Uhr`;
  const lines: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  const flush = () => {
    if (start === undefined || previous === undefined) return;
    const label =
      start === previous
        ? weekdayName(locale, start)
        : `${weekdayName(locale, start)} - ${weekdayName(locale, previous)}`;
    lines.push(`${label}: ${range}`);
  };
  for (const day of sorted.slice(1)) {
    if (previous !== undefined && day === previous + 1) {
      previous = day;
      continue;
    }
    flush();
    start = day;
    previous = day;
  }
  flush();
  return lines;
}
