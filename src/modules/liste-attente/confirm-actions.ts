'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import { createBooking } from '@/modules/reservations/service';
import { bookingReference } from '@/modules/reservations/schemas';

export type ConfirmWaitlistState = { error?: string; success?: string; reference?: string };

export async function confirmWaitlistBookingAction(
  _prev: ConfirmWaitlistState,
  formData: FormData,
): Promise<ConfirmWaitlistState> {
  const serviceSlug = String(formData.get('serviceSlug') ?? '').trim();
  const startsAtISO = String(formData.get('startsAtISO') ?? '').trim();
  const dateISO = String(formData.get('dateISO') ?? '').trim();
  const timeZone = String(formData.get('timeZone') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const waitlistToken = String(formData.get('waitlistToken') ?? '').trim();

  if (!serviceSlug || !startsAtISO || !dateISO || !timeZone || !name || !email || !phone) {
    return { error: 'Informations manquantes.' };
  }
  if (
    !waitlistToken ||
    name.length > 120 ||
    phone.length > 40 ||
    !z.string().email().max(254).safeParse(email).success
  ) {
    return { error: 'Informations invalides.' };
  }

  // Endpoint public : limité par IP, et réservé aux inscrites prévenues (jeton NOTIFIED).
  const ip = await getClientIp();
  if (!(await rateLimit(`waitlist-confirm:${ip}`, { max: 10, windowMs: 15 * 60_000 })).allowed) {
    return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' };
  }
  const entry = await db.waitlistEntry.findFirst({
    where: { notifyToken: waitlistToken, status: 'NOTIFIED' },
    select: { id: true },
  });
  if (!entry) return { error: 'Ce lien n’est plus valide.' };

  try {
    const result = await createBooking({
      serviceSlug,
      dateISO,
      startsAt: new Date(startsAtISO),
      timeZone,
      name,
      email,
      phone,
      comment: '',
      answers: {},
      optionIds: [],
      waitlistToken,
    });
    return {
      success: 'Votre rendez-vous est confirmé.',
      reference: bookingReference(result.appointmentId),
    };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    console.error(error);
    return { error: 'Une erreur est survenue. Réessayez plus tard.' };
  }
}
