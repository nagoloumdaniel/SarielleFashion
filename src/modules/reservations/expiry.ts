import { db } from '@/lib/db';

/* ============================================================
 * Libération automatique des créneaux en attente (P6.4)
 * Une demande PENDING non confirmée ne bloque pas indéfiniment.
 * ============================================================ */

export async function expirePendingHolds(now: Date = new Date()): Promise<number> {
  const expired = await db.appointment.findMany({
    where: {
      status: 'PENDING',
      holdExpiresAt: { not: null, lt: now },
    },
    select: { id: true, customerId: true, serviceId: true, startsAt: true },
  });
  if (expired.length === 0) return 0;

  await db.$transaction([
    db.appointment.updateMany({
      where: { id: { in: expired.map((appointment) => appointment.id) } },
      data: {
        status: 'CANCELLED_BY_ADMIN',
        cancelledAt: now,
        cancelReason: 'Délai de confirmation dépassé : le créneau a été libéré automatiquement.',
      },
    }),
    db.auditLog.createMany({
      data: expired.map((appointment) => ({
        userId: null,
        action: 'appointment.auto_expire',
        entityType: 'Appointment',
        entityId: appointment.id,
        metadata: {
          serviceId: appointment.serviceId,
          startsAt: appointment.startsAt.toISOString(),
        },
      })),
    }),
  ]);

  return expired.length;
}
