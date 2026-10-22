'use server';

import { flushEmailsSoon } from '@/modules/notifications/flush';
import { revalidatePath } from 'next/cache';
import type { CustomRequestStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { AppError, parseInput } from '@/lib/errors';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import { deviceTimeToUtc } from '@/lib/dates';
import { requireAdmin } from '@/modules/auth/guards';
import { deletePrivateImages, storePrivateImages } from '@/modules/fichiers/private-images';
import { adminNotificationRecipient } from '@/modules/notifications/service';
import { logAudit } from '@/modules/stats/audit';
import { getLocale } from '@/i18n/server';
import { isLocale, type Locale } from '@/i18n/config';
import {
  customRequestDecisionSchema,
  customRequestSchema,
  type CustomRequestInput,
} from './schemas';

export type CustomRequestSubmitState = { success?: string; error?: string; requestId?: string };
export type CustomRequestDecisionState = { success?: string; error?: string };

function handleError(error: unknown): { error: string } {
  if (error instanceof AppError) return { error: error.message };
  console.error(error);
  return { error: 'Une erreur est survenue. Réessayez.' };
}

function parseDesiredDate(dateISO: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;
  return new Date(`${dateISO}T12:00:00.000Z`);
}

function customPayload(
  request: {
    id: string;
    requesterName: string;
    requesterEmail: string;
    description: string;
    desiredDate: Date | null;
  },
  extra?: Partial<{
    adminReply: string | null;
    estimatedPriceCents: number | null;
    proposedServiceName: string | null;
    proposedSlot: string | null;
    locale: Locale;
  }>,
): Prisma.InputJsonValue {
  return {
    kind: 'custom',
    requestId: request.id,
    requesterName: request.requesterName,
    requesterEmail: request.requesterEmail,
    description: request.description,
    desiredDate: request.desiredDate?.toISOString() ?? null,
    adminLink: `/dashboard/demandes/${request.id}`,
    ...extra,
  } as Prisma.InputJsonValue;
}

export async function submitCustomRequest(
  _state: CustomRequestSubmitState,
  formData: FormData,
): Promise<CustomRequestSubmitState> {
  const ip = await getClientIp();
  const locale = await getLocale();
  const limit = await rateLimit(`demandes:submit:${ip}`, { max: 4, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return { error: 'Trop de demandes envoyées. Réessayez dans un moment.' };
  }

  let input: CustomRequestInput;
  try {
    input = parseInput(customRequestSchema, Object.fromEntries(formData));
  } catch {
    return { error: 'Vérifiez les champs du formulaire.' };
  }
  if (input.website.trim()) return { success: 'Votre demande a bien été envoyée.' };
  if (!input.consent) return { error: 'Votre accord est nécessaire pour traiter la demande.' };

  const photos = formData
    .getAll('photos')
    .filter((value): value is File => value instanceof File && value.size > 0);

  let photoKeys: string[] = [];
  try {
    photoKeys = await storePrivateImages(photos, 'demandes');
  } catch (error) {
    return handleError(error);
  }

  try {
    const adminEmail = adminNotificationRecipient();
    const desiredDate = input.desiredDate ? parseDesiredDate(input.desiredDate) : null;
    const hairInfo = {
      length: input.hairLength,
      type: input.hairType,
      currentStyle: input.currentStyle || null,
      comment: input.comment || null,
    };

    const request = await db.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email: input.email.toLowerCase() },
        update: { name: input.name, phone: input.phone || '' },
        create: {
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone || '',
        },
      });
      const created = await tx.customRequest.create({
        data: {
          customerId: customer.id,
          requesterName: input.name,
          requesterEmail: customer.email,
          requesterPhone: input.phone || null,
          description: input.description,
          photoKeys,
          hairInfo,
          desiredDate,
          status: 'NEW',
          locale,
        },
      });
      await tx.notification.createMany({
        data: [
          {
            idempotencyKey: `custom:${created.id}:admin:email`,
            recipient: adminEmail,
            templateKey: 'admin_custom_request',
            payload: customPayload(created),
          },
          {
            idempotencyKey: `custom:${created.id}:admin:inapp`,
            recipient: adminEmail,
            channel: 'IN_APP',
            templateKey: 'admin_custom_request',
            link: `/dashboard/demandes/${created.id}`,
            payload: customPayload(created),
          },
          {
            idempotencyKey: `custom:${created.id}:client:received`,
            recipient: customer.email,
            templateKey: 'custom_request_received',
            payload: customPayload(created, { locale }),
          },
        ],
        skipDuplicates: true,
      });
      return created;
    });

    revalidatePath('/dashboard/demandes');
    revalidatePath('/dashboard', 'layout');
    flushEmailsSoon();
    return {
      success: 'Votre demande a bien été envoyée. Sarielle vous répondra personnellement.',
      requestId: request.id,
    };
  } catch (error) {
    await deletePrivateImages(photoKeys).catch(() => undefined);
    return handleError(error);
  }
}

export async function decideCustomRequest(
  _state: CustomRequestDecisionState,
  formData: FormData,
): Promise<CustomRequestDecisionState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const parsedInput = customRequestDecisionSchema.safeParse(Object.fromEntries(formData));
    if (!parsedInput.success) {
      return { error: parsedInput.error.issues[0]?.message ?? 'Données invalides.' };
    }
    const input = parsedInput.data;
    const request = await db.customRequest.findUnique({ where: { id: input.requestId } });
    if (!request) return { error: 'Demande introuvable.' };
    if (request.status === 'CLOSED') {
      return { error: 'Cette demande est clôturée : aucune décision supplémentaire possible.' };
    }

    let serviceName: string | null = null;
    if (input.serviceId) {
      const service = await db.service.findFirst({
        where: { id: input.serviceId, status: 'PUBLISHED' },
        select: { name: true },
      });
      if (!service) return { error: 'Prestation proposée introuvable.' };
      serviceName = service.name;
    }

    let proposedSlot: Date | null = null;
    if (input.proposedSlotLocal) {
      const local = input.proposedSlotLocal;
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) {
        return { error: 'Créneau proposé invalide.' };
      }
      const [datePart, timePart] = local.split('T');
      const [hours, minutes] = (timePart ?? '00:00').split(':').map(Number);
      proposedSlot = deviceTimeToUtc(
        datePart ?? '',
        (hours ?? 0) * 60 + (minutes ?? 0),
        input.timeZone,
      );
      if (Number.isNaN(proposedSlot.getTime())) return { error: 'Créneau proposé invalide.' };
      if (proposedSlot.getTime() < Date.now()) {
        return { error: 'Le créneau proposé doit être dans le futur.' };
      }
    }

    // Une simple prise en charge n'écrase pas la dernière réponse envoyée à la cliente.
    const message = input.message || null;
    const status = input.action as CustomRequestStatus;
    await db.$transaction(async (tx) => {
      const decision = await tx.customRequestDecision.create({
        data: {
          customRequestId: request.id,
          userId: user.id,
          action: input.action,
          message,
          priceCents: input.estimatedPriceEur,
          proposedServiceName: serviceName,
          proposedSlot,
        },
      });
      await tx.customRequest.update({
        where: { id: request.id },
        data: {
          status,
          ...(message ? { adminReply: message } : {}),
          ...(input.action !== 'IN_REVIEW'
            ? {
                estimatedPriceCents: input.estimatedPriceEur,
                proposedServiceId: input.serviceId || null,
                proposedSlot,
              }
            : {}),
          decidedAt: new Date(),
        },
      });
      if (input.action !== 'IN_REVIEW') {
        await tx.notification.createMany({
          data: [
            {
              idempotencyKey: `custom:${request.id}:decision:${decision.id}:client`,
              recipient: request.requesterEmail,
              templateKey: 'custom_request_decision',
              payload: customPayload(request, {
                adminReply: message,
                estimatedPriceCents: input.estimatedPriceEur,
                proposedServiceName: serviceName,
                proposedSlot: proposedSlot?.toISOString() ?? null,
                // Langue de la cliente (enregistrée à sa demande), pas celle de l'admin.
                locale: isLocale(request.locale) ? request.locale : 'fr',
              }),
            },
          ],
          skipDuplicates: true,
        });
      }
    });

    await logAudit({
      userId: user.id,
      action: `custom_request.decision.${input.action.toLowerCase()}`,
      entityType: 'CustomRequest',
      entityId: request.id,
      metadata: { status },
    }).catch(() => undefined);
    revalidatePath('/dashboard/demandes');
    revalidatePath(`/dashboard/demandes/${request.id}`);
    revalidatePath('/dashboard', 'layout');
    // Le courriel de décision part tout de suite (sinon il attend le prochain cron).
    flushEmailsSoon();
    return {
      success:
        input.action === 'IN_REVIEW'
          ? 'Demande prise en charge.'
          : 'Décision enregistrée. La cliente est prévenue par e-mail.',
    };
  } catch (error) {
    return handleError(error);
  }
}
