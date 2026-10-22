'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { requireAdmin } from '@/modules/auth/guards';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logAudit } from '@/modules/stats/audit';
import { promotionIdSchema, promotionSchema } from './schemas';

export type PromotionActionState = { error?: string; success?: string };

function handleError(error: unknown): PromotionActionState {
  if (error instanceof AppError) return { error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return { error: 'Promotion introuvable.' };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return { error: 'Ce code promo existe déjà. Choisissez-en un autre.' };
  }
  console.error(error);
  return { error: 'Une erreur est survenue. Réessayez plus tard.' };
}

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

function revalidate() {
  revalidatePath('/dashboard/promotions');
  revalidatePath('/coiffures');
}

/* Lit et valide le formulaire création / édition (dates en jours civils Dakar = UTC). */
async function readPromotionForm(formData: FormData) {
  const parsed = parseForm(promotionSchema, {
    name: String(formData.get('name') ?? ''),
    code: String(formData.get('code') ?? ''),
    kind: String(formData.get('kind') ?? ''),
    value: String(formData.get('value') ?? ''),
    startsAt: String(formData.get('startsAt') ?? ''),
    endsAt: String(formData.get('endsAt') ?? ''),
    serviceIds: formData.getAll('serviceIds').map(String),
  });
  if ('error' in parsed) return { error: parsed.error };
  const input = parsed.data;

  // La promotion couvre les journées entières, jour de fin inclus.
  const startsAt = new Date(`${input.startsAt}T00:00:00.000Z`);
  const endsAt = new Date(`${input.endsAt}T23:59:59.999Z`);
  if (endsAt.getTime() <= startsAt.getTime()) {
    return { error: 'La date de fin doit être après la date de début.' };
  }
  const serviceIds = [...new Set(input.serviceIds)];
  const found = await db.service.count({ where: { id: { in: serviceIds } } });
  if (found !== serviceIds.length) return { error: 'Une prestation sélectionnée est introuvable.' };

  // Pourcentage : entier 1-100 ; montant fixe : FCFA → 1/100 FCFA (unité interne).
  const value = input.kind === 'PERCENT' ? input.value : input.value * 100;
  return {
    data: {
      name: input.name,
      code: input.code,
      kind: input.kind,
      value,
      startsAt,
      endsAt,
      serviceIds,
    },
  };
}

export async function adminCreatePromotion(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const read = await readPromotionForm(formData);
  if ('error' in read) return { error: read.error };
  const { serviceIds, ...fields } = read.data;

  try {
    const promotion = await db.promotion.create({
      data: { ...fields, services: { create: serviceIds.map((serviceId) => ({ serviceId })) } },
    });
    await logAudit({
      userId: user.id,
      action: 'promotion.create',
      entityType: 'Promotion',
      entityId: promotion.id,
      metadata: { name: promotion.name },
    });
    revalidate();
    return { success: 'Promotion créée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminUpdatePromotion(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = parseForm(promotionIdSchema, { id: String(formData.get('id') ?? '') });
  if ('error' in id) return { error: id.error };
  const read = await readPromotionForm(formData);
  if ('error' in read) return { error: read.error };
  const { serviceIds, ...fields } = read.data;

  try {
    // Remplace les prestations liées en une seule transaction (pas d'état intermédiaire).
    await db.$transaction([
      db.promotionService.deleteMany({ where: { promotionId: id.data.id } }),
      db.promotion.update({
        where: { id: id.data.id },
        data: { ...fields, services: { create: serviceIds.map((serviceId) => ({ serviceId })) } },
      }),
    ]);
    await logAudit({
      userId: user.id,
      action: 'promotion.update',
      entityType: 'Promotion',
      entityId: id.data.id,
      metadata: { name: fields.name },
    });
    revalidate();
    return { success: 'Promotion mise à jour.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminSetPromotionActive(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = parseForm(promotionIdSchema, { id: formData.get('id') });
  if ('error' in parsed) return { error: parsed.error };
  const active = formData.get('active') === 'true';

  try {
    await db.promotion.update({ where: { id: parsed.data.id }, data: { active } });
    await logAudit({
      userId: user.id,
      action: 'promotion.toggle',
      entityType: 'Promotion',
      entityId: parsed.data.id,
      metadata: { active },
    });
    revalidate();
    return { success: active ? 'Promotion activée.' : 'Promotion désactivée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeletePromotion(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = parseForm(promotionIdSchema, { id: formData.get('id') });
  if ('error' in parsed) return { error: parsed.error };

  try {
    await db.promotion.delete({ where: { id: parsed.data.id } });
    await logAudit({
      userId: user.id,
      action: 'promotion.delete',
      entityType: 'Promotion',
      entityId: parsed.data.id,
    });
    revalidate();
    return { success: 'Promotion supprimée.' };
  } catch (error) {
    return handleError(error);
  }
}
