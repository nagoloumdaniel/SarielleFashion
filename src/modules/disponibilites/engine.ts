import { deviceTimeToUtc } from '@/lib/dates';

/* ============================================================
 * Moteur de disponibilités (P6.1)
 * Fonction pure : reçoit les règles, les blocages et les rendez-vous
 * déjà chargés, et renvoie les créneaux réellement réservables.
 * Aucune I/O, aucun accès base.
 * ============================================================ */

export interface AvailabilityRuleInput {
  kind: 'WEEKLY' | 'SPECIFIC';
  weekday: number | null; // 0 = lundi, 6 = dimanche
  date: string | null; // YYYY-MM-DD pour SPECIFIC
  startMinute: number;
  endMinute: number;
  active: boolean;
}

export interface TimeInterval {
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilitySettings {
  bufferMinutes: number;
  slotIntervalMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
}

export interface AvailableSlot {
  /** Heure locale de l'appareil, minutes depuis minuit. */
  startMinute: number;
  endMinute: number;
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilityInput {
  dateISO: string;
  timeZone: string;
  durationMinutes: number;
  rules: AvailabilityRuleInput[];
  blockedPeriods: TimeInterval[];
  busy: TimeInterval[];
  settings: AvailabilitySettings;
  now: Date;
}

const MS_PER_MINUTE = 60_000;

/** Jour de la semaine d'une date locale : 0 = lundi, 6 = dimanche. */
export function weekdayOfDate(dateISO: string): number {
  const [year, month, day] = dateISO.split('-').map(Number);
  if (!year || !month || !day) return -1;
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (jsDay + 6) % 7;
}

export function isValidDateISO(dateISO: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  const [year, month, day] = dateISO.split('-').map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

interface Window {
  startMinute: number;
  endMinute: number;
}

function mergeWindows(windows: Window[]): Window[] {
  const sorted = windows
    .filter((window) => window.endMinute > window.startMinute)
    .sort((a, b) => a.startMinute - b.startMinute);
  const merged: Window[] = [];
  for (const window of sorted) {
    const last = merged[merged.length - 1];
    if (last && window.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, window.endMinute);
    } else {
      merged.push({ ...window });
    }
  }
  return merged;
}

/** Fenêtres d'ouverture applicables à une date : une date spécifique remplace le rythme hebdomadaire. */
export function windowsForDate(rules: AvailabilityRuleInput[], dateISO: string): Window[] {
  const active = rules.filter((rule) => rule.active);
  const specific = active.filter((rule) => rule.kind === 'SPECIFIC' && rule.date === dateISO);
  if (specific.length > 0) {
    return mergeWindows(
      specific.map((rule) => ({
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
      })),
    );
  }
  const weekday = weekdayOfDate(dateISO);
  return mergeWindows(
    active
      .filter((rule) => rule.kind === 'WEEKLY' && rule.weekday === weekday)
      .map((rule) => ({
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
      })),
  );
}

export function computeAvailableSlots(input: AvailabilityInput): AvailableSlot[] {
  const { dateISO, timeZone, durationMinutes, rules, blockedPeriods, busy, settings, now } = input;

  if (!isValidDateISO(dateISO) || durationMinutes <= 0) return [];

  const [year, month, day] = dateISO.split('-').map(Number);
  const dayStart = deviceTimeToUtc(dateISO, 0, timeZone);

  // Horizon de réservation et délai minimum de prévenance.
  const earliestStart = now.getTime() + Math.max(0, settings.minLeadTimeMinutes) * MS_PER_MINUTE;
  const latestStart =
    now.getTime() + Math.max(1, settings.maxAdvanceDays) * 24 * 60 * MS_PER_MINUTE;
  if (dayStart.getTime() >= latestStart) return [];

  const interval = Math.max(5, settings.slotIntervalMinutes);
  const buffer = Math.max(0, settings.bufferMinutes);
  const windows = windowsForDate(rules, dateISO);
  const slots: AvailableSlot[] = [];
  const seen = new Set<number>();

  for (const window of windows) {
    for (
      let startMinute = window.startMinute;
      startMinute + durationMinutes <= window.endMinute;
      startMinute += interval
    ) {
      const startsAt = deviceTimeToUtc(
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        startMinute,
        timeZone,
      );
      const endsAt = new Date(startsAt.getTime() + durationMinutes * MS_PER_MINUTE);

      if (startsAt.getTime() < earliestStart) continue;
      if (startsAt.getTime() > latestStart) continue;
      if (seen.has(startsAt.getTime())) continue;

      const blocked = blockedPeriods.some((period) =>
        overlaps(startsAt, endsAt, period.startsAt, period.endsAt),
      );
      if (blocked) continue;

      const collides = busy.some((appointment) => {
        const busyStart = appointment.startsAt.getTime();
        const busyEnd = appointment.endsAt.getTime();
        return (
          startsAt.getTime() < busyEnd + buffer * MS_PER_MINUTE &&
          endsAt.getTime() + buffer * MS_PER_MINUTE > busyStart
        );
      });
      if (collides) continue;

      // Un blocage qui commence juste après le créneau doit aussi respecter la marge.
      const blockedNearby = blockedPeriods.some((period) => {
        return (
          startsAt.getTime() < period.endsAt.getTime() + buffer * MS_PER_MINUTE &&
          endsAt.getTime() + buffer * MS_PER_MINUTE > period.startsAt.getTime()
        );
      });
      if (blockedNearby && buffer > 0) continue;

      seen.add(startsAt.getTime());
      slots.push({
        startMinute,
        endMinute: startMinute + durationMinutes,
        startsAt,
        endsAt,
      });
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Vérifie qu'un créneau précis est encore disponible (re-contrôle final). */
export function isSlotAvailable(input: AvailabilityInput, startsAt: Date): AvailableSlot | null {
  return (
    computeAvailableSlots(input).find((slot) => slot.startsAt.getTime() === startsAt.getTime()) ??
    null
  );
}
