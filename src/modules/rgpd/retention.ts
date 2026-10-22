import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSalonSettings } from '@/modules/disponibilites/queries';
import { deletePrivateImages } from '@/modules/fichiers/private-images';

/* ============================================================
 * P9.7 : purge automatique des photos privées.
 * Des photos orphelines ou expirées ne doivent jamais rester
 * indéfiniment sur le stockage objet.
 * ============================================================ */

export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - Math.max(0, days) * 24 * 60 * 60_000);
}

/** Même jour du mois, N mois plus tôt (UTC). */
function monthsBefore(now: Date, months: number): Date {
  const date = new Date(now.getTime());
  date.setUTCMonth(date.getUTCMonth() - Math.max(0, months));
  return date;
}

/* Durées de conservation (docs/rgpd.md) :
   - demandes d'avis restées sans réponse (jamais publiées) : 12 mois ;
   - notifications internes lues : 6 mois ;
   - e-mails définitivement en échec : 3 mois.
   Les avis publiés (soumis), les e-mails en attente/en cours et les notifications
   non lues ne sont JAMAIS purgés ici. */
export function retentionPolicyCutoffs(now: Date) {
  return {
    reviews: monthsBefore(now, 12),
    readNotifications: monthsBefore(now, 6),
    failedEmails: monthsBefore(now, 3),
  };
}

export function expiredReviewsWhere(cutoff: Date) {
  return {
    submittedAt: null,
    createdAt: { lt: cutoff },
  } satisfies Prisma.ReviewWhereInput;
}

export function expiredNotificationsWhere(cutoffs: { readBefore: Date; failedBefore: Date }) {
  return {
    OR: [
      { channel: 'IN_APP', readAt: { lt: cutoffs.readBefore } },
      {
        channel: 'EMAIL',
        status: 'FAILED',
        nextAttemptAt: null,
        createdAt: { lt: cutoffs.failedBefore },
      },
    ],
  } satisfies Prisma.NotificationWhereInput;
}

export interface RetentionSummary {
  assessmentsPurged: number;
  customRequestsPurged: number;
  photosDeleted: number;
  cancelTokensCleared: number;
  reviewsPurged: number;
  notificationsPurged: number;
  cutoff: string;
  photoRetentionDays: number;
}

export async function purgeExpiredPhotoData(options?: { now?: Date }): Promise<RetentionSummary> {
  const now = options?.now ?? new Date();
  const settings = await getSalonSettings();
  const cutoff = retentionCutoff(now, settings.photoRetentionDays);

  const [assessments, customRequests] = await Promise.all([
    db.hairAssessment.findMany({
      where: { photoKeys: { isEmpty: false }, createdAt: { lt: cutoff } },
      select: { id: true, photoKeys: true },
      take: 100,
    }),
    db.customRequest.findMany({
      where: { photoKeys: { isEmpty: false }, createdAt: { lt: cutoff } },
      select: { id: true, photoKeys: true },
      take: 100,
    }),
  ]);

  let assessmentsPurged = 0;
  let customRequestsPurged = 0;
  let photosDeleted = 0;

  for (const assessment of assessments) {
    // Les clés dont la suppression a échoué sont conservées pour une nouvelle tentative.
    const result = await deletePrivateImages(assessment.photoKeys);
    await db.hairAssessment.update({
      where: { id: assessment.id },
      data: { photoKeys: result.failed },
    });
    if (result.failed.length === 0) assessmentsPurged += 1;
    photosDeleted += result.deleted;
  }

  for (const request of customRequests) {
    const result = await deletePrivateImages(request.photoKeys);
    await db.customRequest.update({
      where: { id: request.id },
      data: { photoKeys: result.failed },
    });
    if (result.failed.length === 0) customRequestsPurged += 1;
    photosDeleted += result.deleted;
  }

  // Les liens d'annulation expirés ne doivent plus rester utilisables ni stockés.
  const cleared = await db.appointment.updateMany({
    where: { cancelTokenExpiresAt: { lt: now }, cancelToken: { not: null } },
    data: { cancelToken: null },
  });

  const cutoffs = retentionPolicyCutoffs(now);
  const reviewsPurged = await deleteBatch(
    db.review.findMany({
      where: expiredReviewsWhere(cutoffs.reviews),
      select: { id: true },
      take: 500,
    }),
    (ids) =>
      db.review.deleteMany({ where: { id: { in: ids }, ...expiredReviewsWhere(cutoffs.reviews) } }),
  );
  const notificationsWhere = expiredNotificationsWhere({
    readBefore: cutoffs.readNotifications,
    failedBefore: cutoffs.failedEmails,
  });
  const notificationsPurged = await deleteBatch(
    db.notification.findMany({ where: notificationsWhere, select: { id: true }, take: 500 }),
    (ids) => db.notification.deleteMany({ where: { id: { in: ids }, ...notificationsWhere } }),
  );

  return {
    assessmentsPurged,
    customRequestsPurged,
    photosDeleted,
    cancelTokensCleared: cleared.count,
    reviewsPurged,
    notificationsPurged,
    cutoff: cutoff.toISOString(),
    photoRetentionDays: settings.photoRetentionDays,
  };
}

/** Supprime un lot d'identifiants déjà filtrés ; le filtre est rejoué dans le DELETE. */
async function deleteBatch(
  rows: Promise<{ id: string }[]>,
  remove: (ids: string[]) => Promise<{ count: number }>,
): Promise<number> {
  const ids = (await rows).map((row) => row.id);
  if (ids.length === 0) return 0;
  return (await remove(ids)).count;
}
