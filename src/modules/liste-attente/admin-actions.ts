'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { flushEmailsSoon } from '@/modules/notifications/flush';
import { requireAdmin } from '@/modules/auth/guards';
import { logAudit } from '@/modules/stats/audit';
import { notifyWaitlistForFreedSlot } from './service';

export type WaitlistAdminState = { error?: string; success?: string };

const entryIdSchema = z.object({ id: z.string().trim().min(1).max(64) });

/* Retire une cliente de la liste d'attente (statuts WAITING ou NOTIFIED).
   Si elle avait déjà été prévenue, le créneau est proposé à la suivante. */
export async function adminCancelWaitlistEntry(
  _prev: WaitlistAdminState,
  formData: FormData,
): Promise<WaitlistAdminState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  const parsed = entryIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Demande invalide.' };

  try {
    await db.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findUnique({
        where: { id: parsed.data.id },
        include: { service: { select: { name: true } } },
      });
      if (!entry) throw new AppError('NOT_FOUND', 'Demande introuvable.', 404);
      if (entry.status !== 'WAITING' && entry.status !== 'NOTIFIED') {
        throw new AppError('CONFLICT', 'Cette demande est déjà clôturée.', 409);
      }
      const updated = await tx.waitlistEntry.updateMany({
        where: { id: entry.id, status: entry.status },
        data: { status: 'CANCELLED', notifyToken: null, notifyTokenExpiresAt: null },
      });
      if (updated.count === 0) {
        throw new AppError(
          'CONFLICT',
          'Cette demande vient d’être modifiée. Rechargez la page.',
          409,
        );
      }
      if (entry.status === 'NOTIFIED') {
        await notifyWaitlistForFreedSlot(
          tx,
          entry.serviceId,
          entry.desiredStartsAt,
          entry.service.name,
        );
      }
    });
    await logAudit({
      userId: user.id,
      action: 'waitlist.cancel',
      entityType: 'WaitlistEntry',
      entityId: parsed.data.id,
    }).catch(() => undefined);
    flushEmailsSoon();
    revalidatePath('/dashboard/liste-attente');
    return { success: 'Demande retirée de la liste d’attente.' };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    console.error(error);
    return { error: 'Une erreur est survenue. Réessayez plus tard.' };
  }
}
