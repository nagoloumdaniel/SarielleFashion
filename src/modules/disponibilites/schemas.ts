import { z } from 'zod';
import { dateISOSchema, timeZoneSchema } from '@/modules/reservations/schemas';

/* ============================================================
 * Validation des disponibilités (P6.10)
 * ============================================================ */

/** "09:30" -> 570 minutes. */
export const timeOfDaySchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (format HH:MM).')
  .transform((value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours ?? 0) * 60 + (minutes ?? 0);
  });

export const weeklyRuleSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    start: timeOfDaySchema,
    end: timeOfDaySchema,
    active: z.preprocess(
      (value) => value === 'on' || value === true || value === 'true',
      z.boolean().default(false),
    ),
    timeZone: timeZoneSchema,
    confirmConflicts: z.preprocess(
      (value) => value === 'on' || value === true || value === 'true',
      z.boolean().default(false),
    ),
  })
  .refine((data) => data.end > data.start, {
    message: 'L’heure de fin doit être après l’heure de début.',
    path: ['end'],
  });

export const specificRuleSchema = z
  .object({
    dateISO: dateISOSchema,
    start: timeOfDaySchema,
    end: timeOfDaySchema,
    active: z.preprocess(
      (value) => value === 'on' || value === true || value === 'true',
      z.boolean().default(false),
    ),
    timeZone: timeZoneSchema,
    confirmConflicts: z.preprocess(
      (value) => value === 'on' || value === true || value === 'true',
      z.boolean().default(false),
    ),
  })
  .refine((data) => data.end > data.start, {
    message: 'L’heure de fin doit être après l’heure de début.',
    path: ['end'],
  });

export const blockedPeriodSchema = z
  .object({
    startsAtLocal: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date et heure de début invalides.'),
    endsAtLocal: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date et heure de fin invalides.'),
    reason: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z.string().max(200, 'Le motif est limité à 200 caractères.').default(''),
    ),
    timeZone: timeZoneSchema,
    confirmConflicts: z.preprocess(
      (value) => value === 'on' || value === true || value === 'true',
      z.boolean().default(false),
    ),
  })
  .refine((data) => data.endsAtLocal > data.startsAtLocal, {
    message: 'La fin du blocage doit être après son début.',
    path: ['endsAtLocal'],
  });

export const settingsSchema = z.object({
  holdSlotMinutes: z.coerce.number().int().min(0).max(1440),
  minCancelNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  reminderLeadHours: z.coerce.number().int().min(0).max(720),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  minLeadTimeMinutes: z.coerce.number().int().min(0).max(10080),
  dataRetentionMonths: z.coerce.number().int().min(1).max(120),
  photoRetentionDays: z.coerce.number().int().min(7).max(3650),
  cancelReasonRequired: z.preprocess(
    (value) => value === 'on' || value === true || value === 'true',
    z.boolean().default(false),
  ),
});

export const idSchema = z.object({ id: z.string().trim().min(1) });
