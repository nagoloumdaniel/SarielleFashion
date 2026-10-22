import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSalonSettings } from '@/modules/disponibilites/queries';
import { getEmailProvider, type EmailProvider } from './provider';
import { MAX_EMAIL_ATTEMPTS, retryDelayMinutes } from './retry';
import { emailContextFromSettings, type EmailContext } from '@/modules/parametres/policies';
import { renderNotification } from './templates';
import { absoluteUrl, isLocale } from '@/i18n/config';

/* ============================================================
 * P7.2 / P7.4 / P7.7 / P7.8 : file d'envoi, reprise et rappels.
 * L'envoi ne bloque jamais une écriture métier : les notifications
 * sont créées dans la transaction, puis traitées par ce worker.
 * ============================================================ */

export { MAX_EMAIL_ATTEMPTS, retryDelayMinutes } from './retry';

export function adminNotificationRecipient(fallback?: string | null): string {
  return (
    (fallback && fallback.trim()) || process.env.ADMIN_EMAIL?.trim() || 'sarielletalla@gmail.com'
  );
}

/* Signature et politiques lues une fois par passage ; en cas d'échec de lecture,
   l'envoi continue avec les valeurs par défaut (jamais bloquant). */
async function loadEmailContext(): Promise<EmailContext> {
  try {
    return emailContextFromSettings(await getSalonSettings());
  } catch (error) {
    console.error('[email] paramètres du salon illisibles, valeurs par défaut', error);
    return emailContextFromSettings({
      emailSignature: null,
      cancellationPolicy: null,
      bookingPolicy: null,
      minCancelNoticeMinutes: 30,
    });
  }
}

export interface DispatchSummary {
  processed: number;
  sent: number;
  failed: number;
}

export async function processPendingEmails(options?: {
  limit?: number;
  now?: Date;
  provider?: EmailProvider;
}): Promise<DispatchSummary> {
  const now = options?.now ?? new Date();
  const limit = Math.min(Math.max(options?.limit ?? 25, 0), 100);
  const provider = options?.provider ?? getEmailProvider();
  const summary: DispatchSummary = { processed: 0, sent: 0, failed: 0 };

  // Récupère les envois interrompus par un redémarrage du worker.
  await db.notification.updateMany({
    where: {
      channel: 'EMAIL',
      status: 'PROCESSING',
      lastAttemptAt: { lt: new Date(now.getTime() - 10 * 60_000) },
    },
    data: { status: 'FAILED', error: 'Envoi interrompu, nouvelle tentative automatique.' },
  });

  const due = await db.notification.findMany({
    where: {
      channel: 'EMAIL',
      attempts: { lt: MAX_EMAIL_ATTEMPTS },
      OR: [
        { status: 'PENDING', nextAttemptAt: { lte: now } },
        { status: 'PENDING', nextAttemptAt: null },
        { status: 'FAILED', nextAttemptAt: { lte: now } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const emailContext = due.length > 0 ? await loadEmailContext() : {};

  for (const notification of due) {
    const claimed = await db.notification.updateMany({
      where: {
        id: notification.id,
        status: { in: ['PENDING', 'FAILED'] },
        attempts: notification.attempts,
      },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        lastAttemptAt: now,
        error: null,
      },
    });
    if (claimed.count === 0) continue;

    summary.processed += 1;
    const rendered = renderNotification(
      notification.templateKey,
      notification.payload,
      emailContext,
    );
    if (!rendered) {
      summary.failed += 1;
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          attempts: MAX_EMAIL_ATTEMPTS,
          nextAttemptAt: null,
          error: `Modèle inconnu : ${notification.templateKey}`,
        },
      });
      continue;
    }

    try {
      const result = await provider.send({
        to: notification.recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: result.id,
          nextAttemptAt: null,
          error: null,
        },
      });
      summary.sent += 1;
    } catch (error) {
      summary.failed += 1;
      const attempts = notification.attempts + 1;
      const canRetry = attempts < MAX_EMAIL_ATTEMPTS;
      const message = error instanceof Error ? error.message : 'Erreur d’envoi inconnue';
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          error: message.slice(0, 500),
          nextAttemptAt: canRetry
            ? new Date(now.getTime() + retryDelayMinutes(attempts) * 60_000)
            : null,
        },
      });
      // Trace technique sans contenu ni destinataire complet.
      console.error(`[email] échec notification ${notification.id} : ${message.slice(0, 200)}`);
    }
  }

  return summary;
}

export async function retryNotification(id: string): Promise<boolean> {
  const result = await db.notification.updateMany({
    where: { id, channel: 'EMAIL', status: 'FAILED' },
    data: { status: 'PENDING', attempts: 0, nextAttemptAt: null, error: null },
  });
  return result.count > 0;
}

export interface ReminderSummary {
  queued: number;
  leadHours: number;
}

export async function queueDueReminders(options?: { now?: Date }): Promise<ReminderSummary> {
  const now = options?.now ?? new Date();
  const settings = await getSalonSettings();
  const leadHours = settings.reminderLeadHours;
  if (leadHours <= 0) return { queued: 0, leadHours };

  const end = new Date(now.getTime() + leadHours * 60 * 60_000);
  const appointments = await db.appointment.findMany({
    where: {
      status: { in: ['CONFIRMED', 'RESCHEDULED'] },
      startsAt: { gt: now, lte: end },
    },
    include: { customer: true, service: { select: { name: true } } },
    orderBy: { startsAt: 'asc' },
    take: 200,
  });

  if (appointments.length === 0) return { queued: 0, leadHours };

  const rows = appointments.map((appointment) => ({
    idempotencyKey: `appointment:${appointment.id}:reminder:client:${appointment.startsAt.toISOString()}`,
    recipient: appointment.customer.email,
    channel: 'EMAIL' as const,
    templateKey: 'booking_reminder',
    payload: {
      kind: 'appointment',
      locale: isLocale(appointment.locale) ? appointment.locale : 'fr',
      appointmentId: appointment.id,
      customerName: appointment.customer.name,
      customerEmail: appointment.customer.email,
      customerPhone: appointment.customer.phone,
      serviceName: appointment.service.name,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      status: appointment.status,
      homeService: appointment.homeService,
      homeAddress: appointment.homeService ? appointment.homeAddress : null,
      travelFeeCents: appointment.homeService ? (appointment.travelFeeCents ?? 0) : null,
      cancelUrl: appointment.cancelToken
        ? absoluteUrl(
            isLocale(appointment.locale) ? appointment.locale : 'fr',
            `/annulation/${appointment.cancelToken}`,
          )
        : null,
    } satisfies Prisma.InputJsonValue,
  }));

  const result = await db.notification.createMany({ data: rows, skipDuplicates: true });
  return { queued: result.count, leadHours };
}
