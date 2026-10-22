'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError, parseInput } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/modules/auth/guards';
import { logAudit } from '@/modules/stats/audit';
import { flushEmailsSoon } from './flush';
import { retryNotification } from './service';

function handleError(error: unknown): NotificationActionState {
  if (error instanceof AppError) return { error: error.message };
  console.error(error);
  return { error: 'Une erreur est survenue. Réessayez.' };
}

const idSchema = z.object({ id: z.string().trim().min(1).max(64) });

export type NotificationActionState = { success?: string; error?: string };
export async function markNotificationRead(
  _state: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const { id } = parseInput(idSchema, Object.fromEntries(formData));
    await db.notification.updateMany({
      where: { id, channel: 'IN_APP', readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath('/dashboard/notifications');
    revalidatePath('/dashboard', 'layout');
    return { success: 'Notification marquée comme lue.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function markNotificationUnread(
  _state: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const { id } = parseInput(idSchema, Object.fromEntries(formData));
    await db.notification.updateMany({
      where: { id, channel: 'IN_APP', readAt: { not: null } },
      data: { readAt: null },
    });
    revalidatePath('/dashboard/notifications');
    revalidatePath('/dashboard', 'layout');
    return { success: 'Notification marquée comme non lue.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function markAllNotificationsRead(): Promise<NotificationActionState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const result = await db.notification.updateMany({
      where: { channel: 'IN_APP', readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath('/dashboard/notifications');
    revalidatePath('/dashboard', 'layout');
    return { success: `${result.count} notification(s) marquée(s) comme lues.` };
  } catch (error) {
    return handleError(error);
  }
}

/* Supprime une alerte du dashboard (jamais un e-mail de la file d'envoi). */
export async function deleteNotification(id: string): Promise<NotificationActionState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const input = parseInput(idSchema, { id });
    const result = await db.notification.deleteMany({
      where: { id: input.id, channel: 'IN_APP' },
    });
    if (result.count === 0) return { error: 'Notification introuvable.' };
    revalidatePath('/dashboard/notifications');
    revalidatePath('/dashboard', 'layout');
    return { success: 'Notification supprimée.' };
  } catch (error) {
    return handleError(error);
  }
}

/* Vide les alertes déjà lues. */
export async function deleteReadNotifications(): Promise<NotificationActionState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const result = await db.notification.deleteMany({
      where: { channel: 'IN_APP', readAt: { not: null } },
    });
    revalidatePath('/dashboard/notifications');
    revalidatePath('/dashboard', 'layout');
    return { success: `${result.count} notification(s) lue(s) supprimée(s).` };
  } catch (error) {
    return handleError(error);
  }
}

/* Supprime uniquement les e-mails en échec (FAILED) ; jamais les envoyés, en attente ni les alertes. */
export async function deleteFailedEmails(): Promise<NotificationActionState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const limit = await rateLimit(`notifications:purge-failed:${user.id}`, {
      max: 10,
      windowMs: 10 * 60_000,
    });
    if (!limit.allowed) return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' };
    const result = await db.notification.deleteMany({
      where: { channel: 'EMAIL', status: 'FAILED' },
    });
    await logAudit({
      action: 'notification.purge_failed',
      entityType: 'Notification',
      userId: user.id,
      metadata: { count: result.count },
    });
    revalidatePath('/dashboard/notifications');
    revalidatePath('/dashboard', 'layout');
    return {
      success:
        result.count === 0
          ? 'Aucun échec d’envoi à supprimer.'
          : `${result.count} échec${result.count > 1 ? 's' : ''} d’envoi supprimé${result.count > 1 ? 's' : ''}.`,
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function retryFailedNotification(
  _state: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  try {
    const user = await requireAdmin();
    if (!user) return { error: 'Session expirée.' };
    const { id } = parseInput(idSchema, Object.fromEntries(formData));
    const retried = await retryNotification(id);
    if (!retried) return { error: 'Cette notification ne peut pas être relancée.' };
    await logAudit({
      action: 'notification.retry',
      entityType: 'Notification',
      entityId: id,
      userId: user.id,
    }).catch(() => undefined);
    flushEmailsSoon();
    revalidatePath('/dashboard/notifications');
    return { success: 'Envoi relancé.' };
  } catch (error) {
    return handleError(error);
  }
}

/* Wrappers pour les formulaires serveur, qui n'affichent pas d'état local. */
export async function markNotificationReadForm(formData: FormData): Promise<void> {
  await markNotificationRead({}, formData);
}

export async function markAllNotificationsReadForm(): Promise<void> {
  await markAllNotificationsRead();
}

export async function retryNotificationForm(formData: FormData): Promise<void> {
  await retryFailedNotification({}, formData);
}

export async function markNotificationUnreadForm(formData: FormData): Promise<void> {
  await markNotificationUnread({}, formData);
}

/* Ouvrir une notification = la marquer lue, puis aller sur la fiche liée. */
export async function openNotificationForm(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/notifications');
  const { id } = parseInput(idSchema, Object.fromEntries(formData));
  const notification = await db.notification.findUnique({
    where: { id },
    select: { link: true },
  });
  await db.notification.updateMany({
    where: { id, channel: 'IN_APP', readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath('/dashboard', 'layout');
  const link = notification?.link;
  redirect(
    link && link.startsWith('/') && !link.startsWith('//') && !link.includes('\\')
      ? link
      : '/dashboard/notifications',
  );
}
