/**
 * Stratégie dates - P1.5 (heure de l'appareil).
 *
 * Règle : tout est STOCKÉ en UTC (Date Prisma). L'affichage et la
 * saisie utilisent uniquement l'heure locale de l'appareil connecté
 * (détectée via Intl côté navigateur). Aucun fuseau configurable,
 * aucune variable d'environnement, aucun fuseau salon en base.
 * Conversions pures via l'API Intl, testables isolément (TDD).
 */
import { INTL_LOCALE, type Locale } from '@/i18n/config';

export const WEEKDAY_FR = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

/**
 * Fuseau de l'appareil connecté.
 * - Côté navigateur : Intl.DateTimeFormat().resolvedOptions().timeZone
 * - Côté serveur : 'UTC' (le serveur ne connaît pas l'appareil,
 *   la mise en forme locale se fait côté client).
 */
export function getDeviceTimezone(): string {
  if (typeof window !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // fallback si le navigateur ne supporte pas Intl
    }
  }
  return 'UTC';
}

/** Offset UTC (ms) d'une zone à un instant donné, via Intl. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };

  // Heure "24" peut être retournée par certains moteurs pour minuit
  const hour = get('hour') % 24;
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  );
  return asUtc - date.getTime();
}

/**
 * Convertit une date locale de l'appareil (YYYY-MM-DD) + minutes depuis
 * minuit LOCAL en instant UTC.
 */
export function deviceTimeToUtc(
  dateISO: string,
  minute: number,
  timeZone: string = getDeviceTimezone(),
): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) {
    throw new Error(`Date locale invalide : "${dateISO}" (attendu YYYY-MM-DD)`);
  }
  // Candidat : on interprète les parties comme si c'était déjà UTC
  let utcMs = Date.UTC(y, m - 1, d, 0, minute, 0);
  // Correction par l'offset à cet instant (itération 2× suffit pour DST)
  for (let i = 0; i < 2; i++) {
    const offset = timeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = Date.UTC(y, m - 1, d, 0, minute, 0) - offset;
  }
  return new Date(utcMs);
}

export interface DeviceParts {
  /** Date locale de l'appareil au format YYYY-MM-DD */
  dateISO: string;
  /** Heure locale en minutes depuis minuit */
  minute: number;
  /** Jour de la semaine local : 0 = lundi … 6 = dimanche */
  weekday: number;
}

/** Décompose un instant UTC en parties locales de l'appareil. */
export function utcToDeviceParts(date: Date, timeZone: string = getDeviceTimezone()): DeviceParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).formatToParts(date);

  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));

  const WEEKDAY_EN_TO_INDEX: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  return {
    dateISO: `${year}-${month}-${day}`,
    minute: hour * 60 + minute,
    weekday: WEEKDAY_EN_TO_INDEX[get('weekday')] ?? 0,
  };
}

/** Formate des minutes locales en "HH:MM". */
export function formatHour(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Nom du jour de la semaine dans la langue de l'interface (index 0 = lundi … 6 = dimanche).
 * Version locale-aware de WEEKDAY_FR (conservé tel quel pour le dashboard).
 */
export function weekdayName(
  locale: Locale,
  index: number,
  width: 'long' | 'short' = 'long',
): string {
  // 2024-01-01 est un lundi : base stable, indépendante du fuseau (midi UTC).
  const date = new Date(Date.UTC(2024, 0, 1 + (((index % 7) + 7) % 7), 12));
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: width, timeZone: 'UTC' }).format(
    date,
  );
}
