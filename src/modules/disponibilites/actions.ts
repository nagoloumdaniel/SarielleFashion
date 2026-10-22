'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { z } from 'zod';
import { requireAdmin } from '@/modules/auth/guards';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { deviceTimeToUtc, utcToDeviceParts } from '@/lib/dates';
import { logAudit } from '@/modules/stats/audit';
import {
  blockedPeriodSchema,
  idSchema,
  settingsSchema,
  specificRuleSchema,
  weeklyRuleSchema,
} from './schemas';

/* ============================================================
 * Actions de gestion des disponibilités (P6.10)
 * Toute modification qui touche des rendez-vous actifs exige
 * une confirmation explicite de Patricia.
 * ============================================================ */

/* `conflictCount` : nombre de rendez-vous actifs touchés ; l'interface demande alors une
   confirmation puis renvoie le formulaire avec `confirmConflicts`. */
export type AvailabilityActionState = {
  error?: string;
  success?: string;
  conflictCount?: number;
};

function parseForm<T extends z.ZodType>(
  schema: T,
  raw: unknown,
): { data: z.infer<T> } | { error: string } {
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Données invalides.' };
  }
  return { data: result.data };
}

function handleError(error: unknown): AvailabilityActionState {
  if (error instanceof AppError) return { error: error.message };
  console.error(error);
  return { error: 'Une erreur est survenue. Réessayez plus tard.' };
}

function revalidateAvailability() {
  revalidatePath('/dashboard/disponibilites');
  revalidatePath('/dashboard/calendrier');
  revalidatePath('/dashboard/reservations');
  revalidatePath('/reserver');
  revalidateTag('salon-settings');
}

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULED'] as const;

async function futureActiveAppointments() {
  const now = new Date();
  return db.appointment.findMany({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      startsAt: { gte: now, lt: new Date(now.getTime() + 365 * 24 * 3_600_000) },
    },
    select: {
      id: true,
      startsAt: true,
      durationMinutes: true,
      customer: { select: { name: true } },
      service: { select: { name: true } },
    },
  });
}

function conflictMessage(count: number): string {
  return `Cette modification affecte ${count} rendez-vous actif${count > 1 ? 's' : ''} déjà enregistré${count > 1 ? 's' : ''}.`;
}

function conflictState(count: number): AvailabilityActionState {
  return { error: conflictMessage(count), conflictCount: count };
}

export async function adminSaveWeeklyRule(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(weeklyRuleSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  const { weekday, start, end, active, timeZone, confirmConflicts } = parsed.data;

  try {
    const [appointments, specificRules] = await Promise.all([
      futureActiveAppointments(),
      db.availabilityRule.findMany({
        where: { kind: 'SPECIFIC', active: true, date: { not: null } },
        select: { date: true },
      }),
    ]);
    const overriddenDates = new Set(
      specificRules.map((rule) => rule.date).filter((date): date is string => Boolean(date)),
    );
    // Jour fermé : tous les rendez-vous de ce jour de semaine sont touchés.
    const conflicts = appointments.filter((appointment) => {
      const parts = utcToDeviceParts(appointment.startsAt, timeZone);
      if (parts.weekday !== weekday) return false;
      if (overriddenDates.has(parts.dateISO)) return false;
      if (!active) return true;
      return parts.minute < start || parts.minute + appointment.durationMinutes > end;
    });
    if (conflicts.length > 0 && !confirmConflicts) {
      return conflictState(conflicts.length);
    }

    await db.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({ where: { kind: 'WEEKLY', weekday } });
      if (active) {
        await tx.availabilityRule.create({
          data: { kind: 'WEEKLY', weekday, startMinute: start, endMinute: end, active: true },
        });
      }
    });
    await logAudit({
      userId: user.id,
      action: 'availability.weekly.update',
      entityType: 'AvailabilityRule',
      entityId: `weekday-${weekday}`,
      metadata: { weekday, start, end, active },
    });
    revalidateAvailability();
    return { success: active ? 'Horaires du jour enregistrés.' : 'Jour fermé.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminSaveSpecificRule(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(specificRuleSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  const { dateISO, start, end, active, timeZone, confirmConflicts } = parsed.data;

  try {
    // Jour fermé : une règle « 00:00 - 00:00 » active remplace l'horaire habituel sans créneau
    // (le moteur ignore les fenêtres vides). Rien n'était enregistré avant : le jour restait ouvert.
    const startMinute = active ? start : 0;
    const endMinute = active ? end : 0;
    const appointments = await futureActiveAppointments();
    const conflicts = appointments.filter((appointment) => {
      const parts = utcToDeviceParts(appointment.startsAt, timeZone);
      if (parts.dateISO !== dateISO) return false;
      if (!active) return true;
      return parts.minute < start || parts.minute + appointment.durationMinutes > end;
    });
    if (conflicts.length > 0 && !confirmConflicts) {
      return conflictState(conflicts.length);
    }

    await db.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({ where: { kind: 'SPECIFIC', date: dateISO } });
      await tx.availabilityRule.create({
        data: { kind: 'SPECIFIC', date: dateISO, startMinute, endMinute, active: true },
      });
    });
    await logAudit({
      userId: user.id,
      action: 'availability.specific.update',
      entityType: 'AvailabilityRule',
      entityId: dateISO,
      metadata: { dateISO, start, end, active },
    });
    revalidateAvailability();
    return { success: active ? 'Horaires spécifiques enregistrés.' : 'Jour fermé.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteSpecificRule(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(idSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  try {
    // Seules les exceptions de date sont supprimables ici (pas les horaires hebdomadaires).
    const removed = await db.availabilityRule.deleteMany({
      where: { id: parsed.data.id, kind: 'SPECIFIC' },
    });
    if (removed.count === 0) return { error: 'Exception introuvable.' };
    await logAudit({
      userId: user.id,
      action: 'availability.specific.delete',
      entityType: 'AvailabilityRule',
      entityId: parsed.data.id,
    });
    revalidateAvailability();
    return { success: 'Exception supprimée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminCreateBlockedPeriod(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(blockedPeriodSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  const { startsAtLocal, endsAtLocal, reason, timeZone, confirmConflicts } = parsed.data;

  const toUtc = (local: string): Date => {
    const [dateISO, time = '00:00'] = local.split('T');
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    if (!dateISO) throw new AppError('INVALID_DATE', 'Date invalide.', 400);
    return deviceTimeToUtc(dateISO, hours * 60 + minutes, timeZone);
  };

  try {
    const startsAt = toUtc(startsAtLocal);
    const endsAt = toUtc(endsAtLocal);
    if (endsAt.getTime() <= startsAt.getTime()) {
      return { error: 'La fin du blocage doit être après son début.' };
    }

    const conflicts = await db.appointment.findMany({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true, startsAt: true },
    });
    if (conflicts.length > 0 && !confirmConflicts) {
      return conflictState(conflicts.length);
    }

    const blocked = await db.blockedPeriod.create({
      data: {
        startsAt,
        endsAt,
        reason: reason || null,
        createdById: user.id,
      },
    });
    await logAudit({
      userId: user.id,
      action: 'availability.block.create',
      entityType: 'BlockedPeriod',
      entityId: blocked.id,
      metadata: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
    });
    revalidateAvailability();
    return { success: 'Indisponibilité enregistrée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteBlockedPeriod(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(idSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  try {
    const removed = await db.blockedPeriod.deleteMany({ where: { id: parsed.data.id } });
    if (removed.count === 0) return { error: 'Blocage introuvable.' };
    await logAudit({
      userId: user.id,
      action: 'availability.block.delete',
      entityType: 'BlockedPeriod',
      entityId: parsed.data.id,
    });
    revalidateAvailability();
    return { success: 'Blocage supprimé.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminSaveSettings(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(settingsSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  try {
    await db.salonSettings.upsert({
      where: { id: 1 },
      update: parsed.data,
      create: { id: 1, ...parsed.data },
    });
    await logAudit({
      userId: user.id,
      action: 'availability.settings.update',
      entityType: 'SalonSettings',
      entityId: '1',
      metadata: { ...parsed.data },
    });
    revalidateAvailability();
    return { success: 'Paramètres de réservation enregistrés.' };
  } catch (error) {
    return handleError(error);
  }
}
