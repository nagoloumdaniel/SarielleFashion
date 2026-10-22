import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { buildReviewTokenExpiry, isReviewTokenValid, isValidRating } from './engine';

/* ============================================================
 * Avis clients (P8.10) : demande envoyée après un rendez-vous
 * terminé, soumission libre, affichage public uniquement après
 * modération explicite (§19).
 * ============================================================ */

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** Appelée dans la transaction qui marque un rendez-vous COMPLETED. */
export async function createReviewRequest(
  tx: Prisma.TransactionClient,
  appointment: {
    id: string;
    customerId: string;
    serviceId: string;
    endsAt: Date;
    customerEmail: string;
    customerName: string;
    serviceName: string;
  },
): Promise<void> {
  const existing = await tx.review.findUnique({ where: { appointmentId: appointment.id } });
  if (existing) return;

  const token = randomBytes(32).toString('hex');
  const tokenExpiresAt = buildReviewTokenExpiry(appointment.endsAt);
  await tx.review.create({
    data: {
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      serviceId: appointment.serviceId,
      token,
      tokenExpiresAt,
    },
  });

  await tx.notification.createMany({
    data: [
      {
        idempotencyKey: `review:${appointment.id}:request`,
        recipient: appointment.customerEmail,
        templateKey: 'review_request',
        payload: {
          kind: 'review',
          customerName: appointment.customerName,
          serviceName: appointment.serviceName,
          reviewUrl: `${appBaseUrl()}/avis/${token}`,
        } as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });
}

export async function submitReview(input: {
  token: string;
  rating: number;
  comment: string;
}): Promise<void> {
  if (!isValidRating(input.rating)) {
    throw new AppError('VALIDATION', 'Note invalide.', 400);
  }
  const review = await db.review.findUnique({ where: { token: input.token } });
  if (!review) throw new AppError('NOT_FOUND', 'Ce lien d’avis est invalide.', 404);
  if (!isReviewTokenValid(review.tokenExpiresAt, new Date())) {
    throw new AppError('TOKEN_EXPIRED', 'Ce lien d’avis a expiré.', 410);
  }
  if (review.status !== 'PENDING') {
    throw new AppError('ALREADY_SUBMITTED', 'Cet avis a déjà été envoyé.', 409);
  }

  await db.review.update({
    where: { id: review.id },
    data: {
      rating: input.rating,
      comment: input.comment || null,
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  });
}

const MODERABLE_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED'] as const;

/* Approuve / rejette un avis. Un avis déjà modéré peut être republié ou retiré (décision différente). */
export async function moderateReview(input: {
  id: string;
  decision: 'APPROVED' | 'REJECTED';
  moderatorId: string;
}): Promise<void> {
  const review = await db.review.findUnique({
    where: { id: input.id },
    select: { id: true, status: true },
  });
  if (!review) throw new AppError('NOT_FOUND', 'Avis introuvable.', 404);
  if (!(MODERABLE_STATUSES as readonly string[]).includes(review.status)) {
    throw new AppError('INVALID_STATE', 'Cet avis n’a pas encore été soumis.', 409);
  }
  if (review.status === input.decision) {
    throw new AppError('INVALID_STATE', 'Cet avis a déjà ce statut.', 409);
  }

  await db.review.update({
    where: { id: review.id },
    data: {
      status: input.decision,
      moderatedAt: new Date(),
      moderatedById: input.moderatorId,
    },
  });
}

/* Supprime un avis déjà soumis (jamais un avis en attente de réponse de la cliente). */
export async function deleteReview(id: string): Promise<void> {
  const review = await db.review.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!review) throw new AppError('NOT_FOUND', 'Avis introuvable.', 404);
  if (review.status === 'PENDING') {
    throw new AppError('INVALID_STATE', 'Cet avis n’a pas encore été rédigé par la cliente.', 409);
  }
  await db.review.delete({ where: { id: review.id } });
}
