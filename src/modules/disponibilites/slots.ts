import { db } from '@/lib/db';
import { deviceTimeToUtc } from '@/lib/dates';
import { computeAvailableSlots, type AvailabilityRuleInput, type AvailableSlot } from './engine';
import { getSalonSettings, type SalonSettingsData } from './queries';
import { expirePendingHolds } from '@/modules/reservations/expiry';
import { ACTIVE_APPOINTMENT_STATUSES } from '@/modules/reservations/status';

/* ============================================================
 * Calcul des créneaux à partir de la base (P6.1, P6.2)
 * Les règles, blocages et rendez-vous sont rechargés à chaque calcul.
 * ============================================================ */

function mapRules(
  rows: Array<{
    kind: 'WEEKLY' | 'SPECIFIC';
    weekday: number | null;
    date: string | null;
    startMinute: number;
    endMinute: number;
    active: boolean;
  }>,
): AvailabilityRuleInput[] {
  return rows.map((row) => ({
    kind: row.kind,
    weekday: row.weekday,
    date: row.date,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    active: row.active,
  }));
}

export interface SlotQuery {
  dateISO: string;
  timeZone: string;
  durationMinutes: number;
  excludeAppointmentId?: string;
  now?: Date;
}

export async function getSlotsForDate(
  query: SlotQuery,
  options?: { settings?: SalonSettingsData },
): Promise<AvailableSlot[]> {
  const now = query.now ?? new Date();
  await expirePendingHolds(now);

  const settings = options?.settings ?? (await getSalonSettings());
  const dayStart = deviceTimeToUtc(query.dateISO, 0, query.timeZone);
  const rangeStart = new Date(dayStart.getTime() - 24 * 3_600_000);
  const rangeEnd = new Date(dayStart.getTime() + 48 * 3_600_000);

  const [rules, blockedPeriods, busy] = await Promise.all([
    db.availabilityRule.findMany({ where: { active: true } }),
    db.blockedPeriod.findMany({
      where: { startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
      select: { startsAt: true, endsAt: true },
    }),
    db.appointment.findMany({
      where: {
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
        ...(query.excludeAppointmentId ? { id: { not: query.excludeAppointmentId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return computeAvailableSlots({
    dateISO: query.dateISO,
    timeZone: query.timeZone,
    durationMinutes: query.durationMinutes,
    rules: mapRules(rules),
    blockedPeriods,
    busy,
    settings: {
      bufferMinutes: settings.bufferMinutes,
      slotIntervalMinutes: settings.slotIntervalMinutes,
      minLeadTimeMinutes: settings.minLeadTimeMinutes,
      maxAdvanceDays: settings.maxAdvanceDays,
    },
    now,
  });
}
