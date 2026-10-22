'use server';

import { AppError } from '@/lib/errors';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import { getLocale } from '@/i18n/server';
import { addToWaitlist } from './service';
import { waitlistEntrySchema } from './schemas';

export type WaitlistActionState = { error?: string; success?: string };

export async function joinWaitlistAction(
  _prev: WaitlistActionState,
  formData: FormData,
): Promise<WaitlistActionState> {
  const parsed = waitlistEntrySchema.safeParse({
    serviceId: formData.get('serviceId'),
    startsAtISO: formData.get('startsAtISO'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    website: formData.get('website'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }
  if (parsed.data.website) {
    // Honeypot : réponse neutre, aucune information sur la détection.
    return { success: 'Votre demande a bien été enregistrée.' };
  }

  const ip = await getClientIp();
  const limit = await rateLimit(`waitlist:${ip}`, { max: 5, windowMs: 3_600_000 });
  if (!limit.allowed) {
    return { error: 'Trop de demandes. Réessayez plus tard.' };
  }

  const startsAt = new Date(parsed.data.startsAtISO);
  if (Number.isNaN(startsAt.getTime())) return { error: 'Créneau invalide.' };

  try {
    await addToWaitlist({
      serviceId: parsed.data.serviceId,
      startsAt,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      locale: await getLocale(),
    });
    return {
      success:
        'Votre demande a bien été enregistrée. Vous serez prévenue par e-mail si ce créneau se libère.',
    };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    console.error(error);
    return { error: 'Une erreur est survenue. Réessayez plus tard.' };
  }
}
