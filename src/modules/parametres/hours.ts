/* Horaires de Sarielle : de 5 h à 22 h au plus, 0 = lundi … 6 = dimanche (comme les disponibilités). */
export const OPENING_MIN = '05:00';
export const OPENING_MAX = '22:00';

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

export type OpeningDay = { weekday: number; open: string; close: string };

/** Lit les horaires enregistrés (JSON libre en base) ; valeurs par défaut si illisibles. */
export function readOpeningHours(raw: unknown): { days: number[]; open: string; close: string } {
  const fallback = { days: [0, 1, 2, 3, 4, 5, 6], open: OPENING_MIN, close: OPENING_MAX };
  if (!Array.isArray(raw)) return fallback;
  const rows = raw.filter(
    (row): row is OpeningDay =>
      !!row &&
      typeof row === 'object' &&
      Number.isInteger((row as OpeningDay).weekday) &&
      (row as OpeningDay).weekday >= 0 &&
      (row as OpeningDay).weekday <= 6 &&
      typeof (row as OpeningDay).open === 'string' &&
      typeof (row as OpeningDay).close === 'string',
  );
  const first = rows[0];
  if (!first) return fallback;
  const open = first.open >= OPENING_MIN && first.open < OPENING_MAX ? first.open : OPENING_MIN;
  const close = first.close <= OPENING_MAX && first.close > open ? first.close : OPENING_MAX;
  return { days: rows.map((row) => row.weekday), open, close };
}

const WEEKDAY_NAMES = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

/** « 05:00 » → « 5h », « 17:30 » → « 17h30 ». */
export function formatHour(value: string): string {
  const [h = '0', m = '00'] = value.split(':');
  const hour = String(Number.parseInt(h, 10));
  return m === '00' ? `${hour}h` : `${hour}h${m}`;
}

/** Lignes d'affichage public des horaires : jours consécutifs regroupés (« Lundi - Dimanche : 5h - 22h »). */
export function formatOpeningHours(raw: unknown): string[] {
  const { days, open, close } = readOpeningHours(raw);
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const range = `${formatHour(open)} - ${formatHour(close)}`;
  const lines: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  const flush = () => {
    if (start === undefined || previous === undefined) return;
    const label =
      start === previous
        ? WEEKDAY_NAMES[start]
        : `${WEEKDAY_NAMES[start]} - ${WEEKDAY_NAMES[previous]}`;
    lines.push(`${label} : ${range}`);
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
