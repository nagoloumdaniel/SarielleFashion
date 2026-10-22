import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { deletePrivateImages } from '@/modules/fichiers/private-images';
import { buildReviewTokenExpiry, isReviewTokenValid, isValidRating } from './engine';

/* ============================================================
 * Avis clients : demande envoyée après un rendez-vous terminé (lien à jeton,
 * avis « client vérifié »), ou avis libre depuis une fiche prestation.
 * Un avis soumis est publié immédiatement ; l'admin peut le supprimer.
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
      authorName: appointment.customerName,
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

/** Avis libre depuis la fiche d'une prestation : publié tout de suite. */
export async function createPublicReview(input: {
  serviceId: string;
  authorName: string;
  rating: number;
  comment: string;
  photoKeys: string[];
}): Promise<{ id: string; slug: string }> {
  if (!isValidRating(input.rating)) throw new AppError('VALIDATION', 'Note invalide.', 400);
  const service = await db.service.findFirst({
    where: { id: input.serviceId, status: 'PUBLISHED' },
    select: { id: true, slug: true },
  });
  if (!service) throw new AppError('NOT_FOUND', 'Cette prestation est introuvable.', 404);

  const review = await db.review.create({
    data: {
      serviceId: service.id,
      authorName: input.authorName,
      rating: input.rating,
      comment: input.comment || null,
      verified: false,
      submittedAt: new Date(),
      photos: { create: input.photoKeys.map((key, order) => ({ key, order })) },
    },
    select: { id: true },
  });
  return { id: review.id, slug: service.slug };
}

/** Avis via le lien reçu par e-mail : publié tout de suite, badge « client vérifié ». */
export async function submitTokenReview(input: {
  token: string;
  rating: number;
  comment: string;
  photoKeys: string[];
}): Promise<{ id: string; slug: string }> {
  if (!isValidRating(input.rating)) throw new AppError('VALIDATION', 'Note invalide.', 400);
  const review = await db.review.findUnique({
    where: { token: input.token },
    select: {
      id: true,
      tokenExpiresAt: true,
      submittedAt: true,
      service: { select: { slug: true } },
    },
  });
  if (!review) throw new AppError('NOT_FOUND', 'Ce lien d’avis est invalide.', 404);
  if (review.submittedAt) {
    throw new AppError('ALREADY_SUBMITTED', 'Tu as déjà donné ton avis. Merci !', 409);
  }
  if (!isReviewTokenValid(review.tokenExpiresAt, new Date())) {
    throw new AppError('TOKEN_EXPIRED', 'Ce lien d’avis a expiré.', 410);
  }

  // Réservation atomique : une seule soumission gagne si le formulaire est envoyé deux fois.
  const claimed = await db.review.updateMany({
    where: { id: review.id, submittedAt: null },
    data: {
      rating: input.rating,
      comment: input.comment || null,
      verified: true,
      submittedAt: new Date(),
    },
  });
  if (claimed.count === 0) {
    throw new AppError('ALREADY_SUBMITTED', 'Tu as déjà donné ton avis. Merci !', 409);
  }
  if (input.photoKeys.length > 0) {
    await db.reviewPhoto.createMany({
      data: input.photoKeys.map((key, order) => ({ reviewId: review.id, key, order })),
    });
  }
  return { id: review.id, slug: review.service.slug };
}

/** Supprime un avis publié (photos stockées comprises). Renvoie le slug de la prestation. */
export async function deleteReview(id: string): Promise<{ slug: string }> {
  const review = await db.review.findUnique({
    where: { id },
    select: {
      id: true,
      service: { select: { slug: true } },
      photos: { select: { key: true } },
    },
  });
  if (!review) throw new AppError('NOT_FOUND', 'Avis introuvable.', 404);
  await db.review.delete({ where: { id: review.id } });
  await deletePrivateImages(review.photos.map((photo) => photo.key)).catch(() => undefined);
  return { slug: review.service.slug };
}
