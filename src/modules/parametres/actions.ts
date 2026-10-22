'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requireAdmin } from '@/modules/auth/guards';
import { logAudit } from '@/modules/stats/audit';
import { OPENING_MAX, OPENING_MIN } from './hours';
import { eurosToCents, homeServiceSettingsSchema } from './home-service';

export type SalonProfileState = {
  success?: string;
  error?: string;
  /** Message par champ (nom du champ du formulaire → message). */
  fieldErrors?: Record<string, string>;
};

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide.');

const openingHoursSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(0).max(6), // 0 = lundi … 6 = dimanche
      open: timeSchema,
      close: timeSchema,
    }),
  )
  .min(1, 'Choisissez au moins un jour de travail.')
  .max(7)
  .superRefine((days, ctx) => {
    if (new Set(days.map((d) => d.weekday)).size !== days.length) {
      ctx.addIssue({ code: 'custom', message: 'Un jour apparaît deux fois.' });
    }
    for (const day of days) {
      if (day.open < OPENING_MIN || day.close > OPENING_MAX || day.open >= day.close) {
        ctx.addIssue({
          code: 'custom',
          message: `Les horaires doivent être entre ${OPENING_MIN} et ${OPENING_MAX}, avec une fin après le début.`,
        });
        break;
      }
    }
  });

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis (2 caractères minimum).').max(120),
  contactEmail: z.string().trim().email('E-mail invalide.').max(200).or(z.literal('')),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^(\+?[0-9][0-9 ().-]{5,29})?$/, 'Numéro invalide (ex. +49 151 23456789).'),
  address: z.string().trim().max(300),
  emailSignature: z.string().trim().max(1000),
  cancellationPolicy: z.string().trim().max(3000),
  bookingPolicy: z.string().trim().max(3000),
  openingHours: z.string().trim().max(2000),
});

function handleError(error: unknown): SalonProfileState {
  if (error instanceof AppError) return { error: error.message };
  console.error(error);
  return { error: 'Enregistrement impossible. Réessayez.' };
}

export async function adminSaveSalonProfile(
  _state: SalonProfileState,
  formData: FormData,
): Promise<SalonProfileState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée. Reconnectez-vous.' };

    const text = (key: string) => String(formData.get(key) ?? '');
    const parsed = profileSchema.safeParse({
      name: text('name'),
      contactEmail: text('contactEmail'),
      phone: text('phone'),
      address: text('address'),
      emailSignature: text('emailSignature'),
      cancellationPolicy: text('cancellationPolicy'),
      bookingPolicy: text('bookingPolicy'),
      openingHours: text('openingHours'),
    });
    const homeParsed = homeServiceSettingsSchema.safeParse({
      homeServiceEnabled: formData.get('homeServiceEnabled'),
      travelFeeEur: text('travelFeeEur'),
    });
    if (!parsed.success || !homeParsed.success) {
      const fieldErrors: Record<string, string> = {};
      const issues = [
        ...(parsed.success ? [] : parsed.error.issues),
        ...(homeParsed.success ? [] : homeParsed.error.issues),
      ];
      for (const issue of issues) {
        const key = String(issue.path[0] ?? '');
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { error: 'Corrigez les champs signalés.', fieldErrors };
    }
    const input = parsed.data;
    const homeService = homeParsed.data;

    let openingHours: z.infer<typeof openingHoursSchema> | undefined;
    if (input.openingHours) {
      let raw: unknown;
      try {
        raw = JSON.parse(input.openingHours);
      } catch {
        return {
          error: 'Horaires illisibles.',
          fieldErrors: { openingHours: 'Horaires illisibles.' },
        };
      }
      const hours = openingHoursSchema.safeParse(raw);
      if (!hours.success) {
        const message = hours.error.issues[0]?.message ?? 'Horaires invalides.';
        return { error: message, fieldErrors: { openingHours: message } };
      }
      openingHours = hours.data.toSorted((a, b) => a.weekday - b.weekday);
    }

    const data = {
      name: input.name,
      contactEmail: input.contactEmail || null,
      phone: input.phone || null,
      address: input.address || null,
      openingHours,
      emailSignature: input.emailSignature || null,
      cancellationPolicy: input.cancellationPolicy || null,
      bookingPolicy: input.bookingPolicy || null,
      homeServiceEnabled: homeService.homeServiceEnabled,
      travelFeeCents: eurosToCents(homeService.travelFeeEur),
    };
    await db.salonSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    await logAudit({
      userId: user.id,
      action: 'settings.profile.update',
      entityType: 'SalonSettings',
      entityId: '1',
      metadata: {
        homeServiceEnabled: homeService.homeServiceEnabled,
        travelFeeEur: homeService.travelFeeEur,
      },
    }).catch(() => undefined);
    revalidateTag('salon-settings');
    revalidatePath('/dashboard/parametres');
    revalidatePath('/dashboard', 'layout');
    return { success: 'Paramètres enregistrés.' };
  } catch (error) {
    return handleError(error);
  }
}
