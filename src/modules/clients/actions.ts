'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/errors';
import { requireAdmin } from '@/modules/auth/guards';
import { logAudit } from '@/modules/stats/audit';
import { anonymizeCustomerData } from './rgpd';

export type CustomerRgpdState = { success?: string; error?: string };

const contactSchema = z.object({
  customerId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2, 'Nom requis.').max(100),
  email: z.string().trim().email('E-mail invalide.').max(200),
  phone: z
    .string()
    .trim()
    .max(30, 'Téléphone trop long.')
    .regex(/^[+\d\s().-]*$/, 'Téléphone invalide (chiffres, espaces et + uniquement).')
    .optional()
    .default(''),
});

/* Anonymisation irréversible : le mot ANONYMISER doit être saisi (revérifié côté serveur). */
const ANONYMIZE_PHRASE = 'ANONYMISER';
const anonymizeSchema = z.object({
  customerId: z.string().trim().min(1).max(64),
  confirmation: z.literal(ANONYMIZE_PHRASE, { message: 'Saisissez ANONYMISER pour confirmer.' }),
});

function handleError(error: unknown): CustomerRgpdState {
  if (error instanceof AppError) return { error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      return { error: 'Cette adresse e-mail est déjà utilisée par une autre fiche.' };
    if (error.code === 'P2025') return { error: 'Fiche cliente introuvable.' };
  }
  console.error(error);
  return { error: 'Enregistrement impossible. Réessayez.' };
}

export async function updateCustomerContactAction(
  _state: CustomerRgpdState,
  formData: FormData,
): Promise<CustomerRgpdState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const parsed = contactSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
    const input = parsed.data;
    await db.customer.update({
      where: { id: input.customerId },
      data: { name: input.name, email: input.email.toLowerCase(), phone: input.phone },
    });
    await logAudit({
      userId: user.id,
      action: 'customer.contact.update',
      entityType: 'Customer',
      entityId: input.customerId,
    }).catch(() => undefined);
    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${input.customerId}`);
    return { success: 'Coordonnées mises à jour.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function anonymizeCustomerAction(
  _state: CustomerRgpdState,
  formData: FormData,
): Promise<CustomerRgpdState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const parsed = anonymizeSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
    const input = parsed.data;
    const result = await anonymizeCustomerData(input.customerId, user.id);
    if (!result) return { error: 'Fiche cliente introuvable.' };
    if ('alreadyAnonymized' in result) return { error: 'Cette fiche est déjà anonymisée.' };
    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${input.customerId}`);
    revalidatePath('/dashboard', 'layout');
    const failedNote =
      result.photosFailed.length > 0
        ? ` Attention : ${result.photosFailed.length} photo(s) n’ont pas pu être supprimées du stockage (consignées dans l’historique).`
        : '';
    return {
      success: `Fiche anonymisée : ${result.conversationsDeleted} conversation(s), ${result.assessmentsDeleted} évaluation(s), ${result.customRequestsDeleted} demande(s) et ${result.photosDeleted} photo(s) supprimées.${failedNote}`,
    };
  } catch (error) {
    return handleError(error);
  }
}
