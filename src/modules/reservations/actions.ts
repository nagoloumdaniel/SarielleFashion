'use server';

import { flushEmailsSoon } from '@/modules/notifications/flush';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { requireAdmin } from '@/modules/auth/guards';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import { AppError } from '@/lib/errors';
import { getLocale } from '@/i18n/server';
import { localePath } from '@/i18n/config';
import { deviceTimeToUtc } from '@/lib/dates';
import { weekdayOfDate } from '@/modules/disponibilites/engine';
import { assessmentAnswersSchema } from '@/modules/compatibilite/schemas';
import {
  adminCancelSchema,
  adminRescheduleSchema,
  adminRescheduleSlotsSchema,
  adminStatusSchema,
  bookingRequestSchema,
  bookingSlotsSchema,
  calendarQuerySchema,
  customerCancelSchema,
  promoCodeRequestSchema,
} from './schemas';
import {
  cancelAppointmentByAdmin,
  cancelAppointmentByCustomer as cancelByCustomerService,
  createBooking,
  getBookingSlots,
  getRescheduleSlots,
  previewAutomaticPromotion,
  previewPromoCode,
  type AutoPromotionPreview,
  rescheduleAppointment,
  updateAppointmentStatus,
} from './service';
import { getCalendarAppointments, type CalendarAppointment } from './queries';

/* ============================================================
 * Server actions réservations (P6.3 à P6.9)
 * Toute validation et re-vérification est refaite côté serveur.
 * ============================================================ */

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

function parseStringArray(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string').slice(0, 20);
  } catch {
    return [];
  }
}

function parseObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function handleError(error: unknown): { error: string } {
  if (error instanceof AppError) return { error: error.message };
  console.error(error);
  return { error: 'Une erreur est survenue. Réessayez plus tard.' };
}

function revalidateBookingPaths(appointmentId?: string) {
  flushEmailsSoon();
  revalidatePath('/reserver');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/calendrier');
  revalidatePath('/dashboard/reservations');
  if (appointmentId) revalidatePath(`/dashboard/reservations/${appointmentId}`);
}

export interface BookingSlotView {
  startsAt: string;
  endsAt: string;
  startMinute: number;
  endMinute: number;
}

export type BookingSlotsState = {
  error?: string;
  slots?: BookingSlotView[];
  durationMinutes?: number;
  priceCents?: number | null;
  timeZone?: string;
};

export async function loadBookingSlots(
  _prev: BookingSlotsState,
  formData: FormData,
): Promise<BookingSlotsState> {
  const ip = await getClientIp();
  const limit = await rateLimit(`booking:slots:${ip}`, { max: 60, windowMs: 60_000 });
  if (!limit.allowed) return { error: 'Trop de demandes. Réessayez dans une minute.' };

  const parsed = parseForm(bookingSlotsSchema, {
    serviceSlug: String(formData.get('serviceSlug') ?? ''),
    dateISO: String(formData.get('dateISO') ?? ''),
    timeZone: String(formData.get('timeZone') ?? ''),
  });
  if ('error' in parsed) return { error: parsed.error };

  try {
    const result = await getBookingSlots({
      serviceSlug: parsed.data.serviceSlug,
      optionIds: parseStringArray(formData.get('optionIds')),
      dateISO: parsed.data.dateISO,
      timeZone: parsed.data.timeZone,
    });
    return {
      slots: result.slots.map((slot) => ({
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
      })),
      durationMinutes: result.durationMinutes,
      priceCents: result.priceCents,
      timeZone: parsed.data.timeZone,
    };
  } catch (error) {
    return handleError(error);
  }
}

export interface BookingSuccess {
  appointmentId: string;
  reference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  priceCents: number | null;
  homeService: boolean;
  travelFeeCents: number | null;
  serviceName: string;
  cancelUrl: string;
}

export type BookingState = { error?: string; success?: BookingSuccess };

export async function submitBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const locale = await getLocale();
  const ip = await getClientIp();
  const limit = await rateLimit(`booking:submit:${ip}`, { max: 20, windowMs: 15 * 60_000 });
  if (!limit.allowed) {
    return { error: 'Trop de demandes de réservation. Réessayez dans quelques minutes.' };
  }
  if (String(formData.get('website') ?? '').trim() !== '') {
    return { error: 'Demande refusée.' };
  }

  const answers = parseObject(formData.get('answers'));
  if (!answers) return { error: 'Informations capillaires illisibles.' };
  const answersResult = assessmentAnswersSchema.safeParse(answers);
  if (!answersResult.success) return { error: 'Informations capillaires invalides.' };

  const startsAtRaw = String(formData.get('startsAt') ?? '');
  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) return { error: 'Créneau invalide.' };

  const parsed = parseForm(bookingRequestSchema, {
    serviceSlug: String(formData.get('serviceSlug') ?? ''),
    dateISO: String(formData.get('dateISO') ?? ''),
    startsAt: startsAtRaw,
    timeZone: String(formData.get('timeZone') ?? ''),
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    comment: String(formData.get('comment') ?? ''),
    consent: formData.get('consent'),
    promoCode: String(formData.get('promoCode') ?? ''),
    homeService: formData.get('homeService'),
    homeAddress: String(formData.get('homeAddress') ?? ''),
  });
  if ('error' in parsed) return { error: parsed.error };

  try {
    const booking = await createBooking({
      serviceSlug: parsed.data.serviceSlug,
      dateISO: parsed.data.dateISO,
      startsAt,
      timeZone: parsed.data.timeZone,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      comment: parsed.data.comment,
      answers: answersResult.data,
      optionIds: parseStringArray(formData.get('optionIds')),
      promoCode: parsed.data.promoCode,
      homeService: parsed.data.homeService,
      homeAddress: parsed.data.homeAddress,
      locale,
    });
    revalidateBookingPaths(booking.appointmentId);
    return {
      success: {
        appointmentId: booking.appointmentId,
        reference: booking.reference,
        status: booking.status,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        durationMinutes: booking.durationMinutes,
        priceCents: booking.priceCents,
        homeService: booking.homeService,
        travelFeeCents: booking.travelFeeCents,
        serviceName: booking.serviceName,
        cancelUrl: localePath(locale, `/annulation/${booking.cancelToken}`),
      },
    };
  } catch (error) {
    return handleError(error) as BookingState;
  }
}

export type PromoCodeState = {
  error?: string;
  applied?: {
    code: string;
    promotionName: string;
    codeApplied: boolean;
    basePriceCents: number;
    discountCents: number;
    finalPriceCents: number;
  };
};

/** Valide un code promo côté serveur (10 essais / 15 min / IP) et renvoie le prix remisé. */
export async function applyPromoCode(
  _prev: PromoCodeState,
  formData: FormData,
): Promise<PromoCodeState> {
  const ip = await getClientIp();
  const limit = await rateLimit(`booking:promo:${ip}`, { max: 10, windowMs: 15 * 60_000 });
  if (!limit.allowed) return { error: 'Trop d’essais. Réessayez dans quelques minutes.' };

  const parsed = parseForm(promoCodeRequestSchema, {
    serviceSlug: String(formData.get('serviceSlug') ?? ''),
    code: String(formData.get('code') ?? ''),
  });
  if ('error' in parsed) return { error: parsed.error };

  try {
    const applied = await previewPromoCode({
      serviceSlug: parsed.data.serviceSlug,
      optionIds: parseStringArray(formData.get('optionIds')),
      code: parsed.data.code,
    });
    return { applied };
  } catch (error) {
    // Message unique pour tout échec de code : aucune fuite sur les autres codes.
    if (error instanceof AppError && error.code === 'INVALID_PROMO') {
      return { error: error.message };
    }
    return handleError(error);
  }
}

/** Offre automatique applicable (aperçu du récapitulatif) : lecture seule, limitée par IP. */
export async function loadAutomaticPromotion(
  serviceSlug: string,
  optionIds: string[],
): Promise<AutoPromotionPreview | null> {
  const ip = await getClientIp();
  const limit = await rateLimit(`booking:autopromo:${ip}`, { max: 60, windowMs: 15 * 60_000 });
  if (!limit.allowed) return null;
  const parsed = parseForm(promoCodeRequestSchema.pick({ serviceSlug: true }), { serviceSlug });
  if ('error' in parsed) return null;
  const ids = optionIds.filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 40);
  try {
    return await previewAutomaticPromotion({
      serviceSlug: parsed.data.serviceSlug,
      optionIds: ids.slice(0, 20),
    });
  } catch {
    return null;
  }
}

export type CustomerCancelState = { error?: string; success?: string };

export async function cancelAppointmentByCustomer(
  _prev: CustomerCancelState,
  formData: FormData,
): Promise<CustomerCancelState> {
  const ip = await getClientIp();
  const limit = await rateLimit(`booking:cancel:${ip}`, { max: 10, windowMs: 10 * 60_000 });
  if (!limit.allowed) return { error: 'Trop de demandes. Réessayez dans quelques minutes.' };

  const parsed = parseForm(customerCancelSchema, {
    token: String(formData.get('token') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if ('error' in parsed) return { error: parsed.error };

  try {
    await cancelByCustomerService({
      token: parsed.data.token,
      reason: parsed.data.reason,
    });
    flushEmailsSoon();
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/calendrier');
    revalidatePath('/dashboard/reservations');
    revalidatePath(`/annulation/${parsed.data.token}`);
    return { success: 'Votre rendez-vous a bien été annulé. Le créneau est libéré.' };
  } catch (error) {
    return handleError(error);
  }
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export type AppointmentActionState = { error?: string; success?: string };

export async function adminTransitionAppointment(
  _prev: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(adminStatusSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  try {
    await updateAppointmentStatus({
      appointmentId: parsed.data.appointmentId,
      status: parsed.data.status,
      userId: user.id,
    });
    revalidateBookingPaths(parsed.data.appointmentId);
    return { success: 'Statut du rendez-vous mis à jour.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminCancelAppointment(
  _prev: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(adminCancelSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  try {
    await cancelAppointmentByAdmin({
      appointmentId: parsed.data.appointmentId,
      reason: parsed.data.reason,
      userId: user.id,
    });
    revalidateBookingPaths(parsed.data.appointmentId);
    return { success: 'Rendez-vous annulé. Le créneau est libéré.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminRescheduleAppointment(
  _prev: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const startsAtRaw = String(formData.get('startsAt') ?? '');
  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) return { error: 'Créneau invalide.' };

  const parsed = parseForm(adminRescheduleSchema, {
    appointmentId: String(formData.get('appointmentId') ?? ''),
    dateISO: String(formData.get('dateISO') ?? ''),
    startsAt: startsAtRaw,
    timeZone: String(formData.get('timeZone') ?? ''),
  });
  if ('error' in parsed) return { error: parsed.error };
  try {
    await rescheduleAppointment({
      appointmentId: parsed.data.appointmentId,
      dateISO: parsed.data.dateISO,
      startsAt,
      timeZone: parsed.data.timeZone,
      userId: user.id,
    });
    revalidateBookingPaths(parsed.data.appointmentId);
    return { success: 'Rendez-vous reprogrammé. L’ancien créneau est libéré.' };
  } catch (error) {
    return handleError(error);
  }
}

export type RescheduleSlotsState = {
  error?: string;
  slots?: BookingSlotView[];
  durationMinutes?: number;
};

export async function adminLoadRescheduleSlots(
  _prev: RescheduleSlotsState,
  formData: FormData,
): Promise<RescheduleSlotsState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(adminRescheduleSlotsSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  try {
    const slots = await getRescheduleSlots({
      appointmentId: parsed.data.appointmentId,
      dateISO: parsed.data.dateISO,
      timeZone: parsed.data.timeZone,
    });
    return {
      slots: slots.map((slot) => ({
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
      })),
      durationMinutes: slots[0]
        ? Math.round((slots[0].endsAt.getTime() - slots[0].startsAt.getTime()) / 60_000)
        : undefined,
    };
  } catch (error) {
    return handleError(error);
  }
}

export type CalendarState = {
  error?: string;
  view?: string;
  rangeStartISO?: string;
  rangeEndISO?: string;
  appointments?: Array<
    Omit<CalendarAppointment, 'startsAt' | 'endsAt'> & {
      startsAt: string;
      endsAt: string;
    }
  >;
};

export async function loadCalendarData(
  _prev: CalendarState,
  formData: FormData,
): Promise<CalendarState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = parseForm(calendarQuerySchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };
  const { view, timeZone } = parsed.data;
  const dateISO = parsed.data.dateISO ?? new Date().toISOString().slice(0, 10);

  try {
    const dayStart = deviceTimeToUtc(dateISO, 0, timeZone);
    let rangeStart = dayStart;
    let rangeEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
    if (view === 'week') {
      const weekday = weekdayOfDate(dateISO);
      rangeStart = new Date(dayStart.getTime() - weekday * 24 * 3_600_000);
      rangeEnd = new Date(rangeStart.getTime() + 7 * 24 * 3_600_000);
    } else if (view === 'month') {
      const [year, month] = dateISO.split('-').map(Number);
      const firstISO = `${year}-${String(month).padStart(2, '0')}-01`;
      const firstStart = deviceTimeToUtc(firstISO, 0, timeZone);
      const weekday = weekdayOfDate(firstISO);
      rangeStart = new Date(firstStart.getTime() - weekday * 24 * 3_600_000);
      rangeEnd = new Date(rangeStart.getTime() + 42 * 24 * 3_600_000);
    } else if (view === 'list') {
      rangeStart = new Date(Date.now() - 7 * 24 * 3_600_000);
      rangeEnd = new Date(Date.now() + 90 * 24 * 3_600_000);
    }

    const appointments = await getCalendarAppointments({
      from: rangeStart,
      to: rangeEnd,
    });
    return {
      view,
      rangeStartISO: rangeStart.toISOString(),
      rangeEndISO: rangeEnd.toISOString(),
      appointments: appointments.map((appointment) => ({
        ...appointment,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
      })),
    };
  } catch (error) {
    return handleError(error);
  }
}
