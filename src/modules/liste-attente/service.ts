import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { buildNotifyExpiry, pickNextWaitingEntry } from './engine';

/* ============================================================
 * Liste d'attente (P8.8) : alerte sur créneau libéré, confirmation
 * client obligatoire (lien à durée limitée), re-vérification au
 * moment de la réservation réelle (réutilise createBooking, §5.8/§6.2).
 * ============================================================ */

export async function addToWaitlist(input: {
  serviceId: string;
  startsAt: Date;
  name: string;
  email: string;
  phone: string;
}): Promise<void> {
  const service = await db.service.findUnique({
    where: { id: input.serviceId },
    select: { id: true },
  });
  if (!service) throw new AppError('NOT_FOUND', 'Cette prestation n’est plus disponible.', 404);

  await db.waitlistEntry.create({
    data: {
      serviceId: input.serviceId,
      desiredStartsAt: input.startsAt,
      customerName: input.name,
      customerEmail: input.email,
      customerPhone: input.phone,
    },
  });
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Appelée dans la même transaction qu'une annulation : notifie la
 * première cliente en attente pour ce créneau exact, si elle existe.
 */
export async function notifyWaitlistForFreedSlot(
  tx: Prisma.TransactionClient,
  serviceId: string,
  startsAt: Date,
  serviceName: string,
): Promise<void> {
  const now = new Date();
  const waiting = await tx.waitlistEntry.findMany({
    where: { serviceId, desiredStartsAt: startsAt, status: 'WAITING' },
    orderBy: { createdAt: 'asc' },
  });
  const next = pickNextWaitingEntry(
    waiting.map((w) => ({
      id: w.id,
      serviceId: w.serviceId,
      desiredStartsAt: w.desiredStartsAt,
      status: w.status,
      createdAt: w.createdAt,
    })),
    serviceId,
    startsAt,
  );
  if (!next) return;

  const notifyToken = randomBytes(32).toString('hex');
  const notifyTokenExpiresAt = buildNotifyExpiry(now);
  await tx.waitlistEntry.update({
    where: { id: next.id },
    data: { status: 'NOTIFIED', notifyToken, notifyTokenExpiresAt, notifiedAt: now },
  });

  const appUrl = appBaseUrl();
  const entry = waiting.find((w) => w.id === next.id)!;
  await tx.notification.createMany({
    data: [
      {
        idempotencyKey: `waitlist:${next.id}:notified:${notifyToken.slice(0, 8)}`,
        recipient: entry.customerEmail,
        templateKey: 'waitlist_slot_available',
        payload: {
          kind: 'waitlist',
          customerName: entry.customerName,
          serviceName,
          startsAt: startsAt.toISOString(),
          confirmUrl: `${appUrl}/liste-attente/${notifyToken}`,
          expiresAt: notifyTokenExpiresAt.toISOString(),
        } as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });
}

/**
 * Cron (P8.8) : expire les notifications non confirmées à temps et
 * relance la cliente suivante pour le même créneau.
 */
export async function expireStaleWaitlistNotifications(): Promise<number> {
  const now = new Date();
  const stale = await db.waitlistEntry.findMany({
    where: { status: 'NOTIFIED', notifyTokenExpiresAt: { lt: now } },
    include: { service: { select: { name: true } } },
  });
  for (const entry of stale) {
    await db.$transaction(async (tx) => {
      await tx.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'EXPIRED' } });
      await notifyWaitlistForFreedSlot(
        tx,
        entry.serviceId,
        entry.desiredStartsAt,
        entry.service.name,
      );
    });
  }
  return stale.length;
}
