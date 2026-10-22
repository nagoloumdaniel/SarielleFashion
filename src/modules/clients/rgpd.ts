import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { deletePrivateImages } from '@/modules/fichiers/private-images';
import { logAudit } from '@/modules/stats/audit';

/* ============================================================
 * P9.6 : droits RGPD d'accès et d'effacement.
 * L'effacement anonymise la fiche et supprime les contenus privés.
 * Les rendez-vous sont conservés pour les obligations comptables,
 * sans données capillaires, commentaire, lien d'annulation ni identité.
 * ============================================================ */

export interface CustomerDataExport {
  exportedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
  } | null;
  appointments: Array<{
    id: string;
    startsAt: string;
    status: string;
    serviceName: string;
    priceCents: number | null;
    durationMinutes: number;
    hairInfo: Prisma.JsonValue | null;
    comments: string | null;
  }>;
  assessments: Array<{
    id: string;
    createdAt: string;
    status: string;
    serviceName: string;
    answers: Prisma.JsonValue;
    photoCount: number;
  }>;
  customRequests: Array<{
    id: string;
    createdAt: string;
    status: string;
    description: string;
    decisionMessage: string | null;
    estimatedPriceCents: number | null;
    photoCount: number;
  }>;
  conversations: Array<{
    id: string;
    subject: string;
    status: string;
    createdAt: string;
    messages: Array<{ author: string; content: string; sentAt: string }>;
  }>;
  waitlistEntries: Array<{
    id: string;
    serviceName: string;
    desiredStartsAt: string;
    status: string;
    createdAt: string;
  }>;
  reviews: Array<{
    id: string;
    status: string;
    rating: number | null;
    comment: string | null;
    submittedAt: string | null;
  }>;
}

/** Export lisible par la personne concernée. Les notes internes sont exclues. */
export async function collectCustomerData(id: string): Promise<CustomerDataExport | null> {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { startsAt: 'desc' },
        include: { service: { select: { name: true } } },
      },
      assessments: {
        orderBy: { createdAt: 'desc' },
        include: { service: { select: { name: true } } },
      },
      customRequests: { orderBy: { createdAt: 'desc' } },
      conversations: {
        orderBy: { lastMessageAt: 'desc' },
        include: {
          messages: {
            where: { isInternal: false },
            orderBy: { sentAt: 'asc' },
          },
        },
      },
      reviews: {
        select: { id: true, status: true, rating: true, comment: true, submittedAt: true },
      },
    },
  });
  if (!customer) return null;

  // Inscriptions en liste d'attente faites avec la même adresse e-mail.
  const waitlistEntries = await db.waitlistEntry.findMany({
    where: { customerEmail: { equals: customer.email, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    include: { service: { select: { name: true } } },
  });

  return {
    exportedAt: new Date().toISOString(),
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt.toISOString(),
    },
    appointments: customer.appointments.map((appointment) => ({
      id: appointment.id,
      startsAt: appointment.startsAt.toISOString(),
      status: appointment.status,
      serviceName: appointment.service.name,
      priceCents: appointment.priceCents,
      durationMinutes: appointment.durationMinutes,
      hairInfo: appointment.hairInfo,
      comments: appointment.comments,
    })),
    assessments: customer.assessments.map((assessment) => ({
      id: assessment.id,
      createdAt: assessment.createdAt.toISOString(),
      status: assessment.status,
      serviceName: assessment.service.name,
      answers: assessment.answers,
      photoCount: assessment.photoKeys.length,
    })),
    customRequests: customer.customRequests.map((request) => ({
      id: request.id,
      createdAt: request.createdAt.toISOString(),
      status: request.status,
      description: request.description,
      decisionMessage: request.adminReply,
      estimatedPriceCents: request.estimatedPriceCents,
      photoCount: request.photoKeys.length,
    })),
    conversations: customer.conversations.map((conversation) => ({
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      createdAt: conversation.createdAt.toISOString(),
      messages: conversation.messages.map((message) => ({
        author: message.author,
        content: message.content,
        sentAt: message.sentAt.toISOString(),
      })),
    })),
    waitlistEntries: waitlistEntries.map((entry) => ({
      id: entry.id,
      serviceName: entry.service.name,
      desiredStartsAt: entry.desiredStartsAt.toISOString(),
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
    })),
    reviews: customer.reviews.map((review) => ({
      id: review.id,
      status: review.status,
      rating: review.rating,
      comment: review.comment,
      submittedAt: review.submittedAt?.toISOString() ?? null,
    })),
  };
}

export interface AnonymizationSummary {
  customerId: string;
  conversationsDeleted: number;
  assessmentsDeleted: number;
  customRequestsDeleted: number;
  /** Photos réellement supprimées du stockage (après le commit de la base). */
  photosDeleted: number;
  /** Clés d'objets (identifiants aléatoires, sans donnée personnelle) dont la suppression a échoué. */
  photosFailed: string[];
}

export async function anonymizeCustomerData(
  id: string,
  actorId?: string,
): Promise<AnonymizationSummary | { alreadyAnonymized: true } | null> {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      appointments: { select: { id: true } },
      assessments: { select: { id: true, photoKeys: true } },
      customRequests: { select: { id: true, photoKeys: true } },
      conversations: { select: { id: true } },
      reviews: { select: { id: true } },
      _count: { select: { assessments: true, customRequests: true, conversations: true } },
    },
  });
  if (!customer) return null;
  if (customer.email.endsWith('@invalid.local')) return { alreadyAnonymized: true };

  const photoKeys = [
    ...customer.assessments.flatMap((assessment) => assessment.photoKeys),
    ...customer.customRequests.flatMap((request) => request.photoKeys),
  ];

  // Entités dont les métadonnées d'audit peuvent contenir du texte libre (motifs, noms, e-mails).
  const auditTargets: Array<{ entityType: string; ids: string[] }> = [
    { entityType: 'Customer', ids: [customer.id] },
    { entityType: 'Appointment', ids: customer.appointments.map((item) => item.id) },
    { entityType: 'HairAssessment', ids: customer.assessments.map((item) => item.id) },
    { entityType: 'CustomRequest', ids: customer.customRequests.map((item) => item.id) },
    { entityType: 'Conversation', ids: customer.conversations.map((item) => item.id) },
    { entityType: 'Review', ids: customer.reviews.map((item) => item.id) },
  ];

  const anonymizedEmail = `deleted-${customer.id}@invalid.local`;

  await db.$transaction(async (tx) => {
    await tx.conversation.deleteMany({ where: { customerId: customer.id } });
    await tx.hairAssessment.deleteMany({ where: { customerId: customer.id } });
    await tx.customRequest.deleteMany({ where: { customerId: customer.id } });
    // Avis (commentaire libre + jeton) : données personnelles, supprimés avec la fiche.
    await tx.review.deleteMany({ where: { customerId: customer.id } });
    // Notifications contenant l'e-mail / le nom de la cliente (file d'envoi et alertes dashboard).
    await tx.notification.deleteMany({
      where: {
        OR: [
          { recipient: customer.email },
          { payload: { path: ['customerEmail'], equals: customer.email } },
        ],
      },
    });
    // Inscriptions en liste d'attente (nom, e-mail, téléphone) rattachées à cette adresse.
    await tx.waitlistEntry.updateMany({
      where: { customerEmail: { equals: customer.email, mode: 'insensitive' } },
      data: {
        customerName: 'Cliente supprimée',
        customerEmail: anonymizedEmail,
        customerPhone: '',
        notifyToken: null,
        notifyTokenExpiresAt: null,
      },
    });
    await tx.appointment.updateMany({
      where: { customerId: customer.id },
      data: {
        cancelToken: null,
        cancelTokenExpiresAt: null,
        hairInfo: Prisma.DbNull,
        comments: null,
        cancelReason: null,
      },
    });
    await tx.customer.update({
      where: { id: customer.id },
      data: { name: 'Cliente supprimée', email: anonymizedEmail, phone: '' },
    });
    // Purge des métadonnées d'audit liées à la cliente (motif d'annulation, noms, e-mails...) :
    // la trace de l'action est conservée, son contenu libre non.
    for (const target of auditTargets) {
      if (target.ids.length === 0) continue;
      await tx.auditLog.updateMany({
        where: { entityType: target.entityType, entityId: { in: target.ids } },
        data: { metadata: Prisma.DbNull },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: actorId ?? null,
        action: 'customer.anonymize',
        entityType: 'Customer',
        entityId: customer.id,
        metadata: {
          conversationsDeleted: customer._count.conversations,
          assessmentsDeleted: customer._count.assessments,
          customRequestsDeleted: customer._count.customRequests,
          photosQueuedForDeletion: photoKeys.length,
        },
      },
    });
  });

  // Suppression S3 seulement APRÈS le commit : jamais d'objet supprimé pour une base non modifiée.
  // Les échecs ne sont pas avalés : comptés, journalisés (clés seules, sans PII) et renvoyés.
  const { deleted, failed } = await deletePrivateImages(photoKeys);
  if (failed.length > 0) {
    console.error(
      `[rgpd] ${failed.length} photo(s) non supprimée(s) du stockage pour la fiche ${customer.id}`,
      failed,
    );
    await logAudit({
      userId: actorId ?? null,
      action: 'customer.anonymize.photos_failed',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: { failedCount: failed.length, failedKeys: failed },
    });
  }

  return {
    customerId: customer.id,
    conversationsDeleted: customer._count.conversations,
    assessmentsDeleted: customer._count.assessments,
    customRequestsDeleted: customer._count.customRequests,
    photosDeleted: deleted,
    photosFailed: failed,
  };
}
