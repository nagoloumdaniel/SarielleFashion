import type { NotificationStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';

/* ============================================================
 * P7.5 / P7.8 : lecture des notifications dashboard et des échecs.
 * ============================================================ */

export interface AdminNotificationView {
  id: string;
  templateKey: string;
  channel: 'EMAIL' | 'IN_APP';
  status: NotificationStatus;
  link: string | null;
  title: string;
  detail: string;
  readAt: Date | null;
  createdAt: Date;
  sentAt: Date | null;
  error: string | null;
  attempts: number;
  recipient: string;
}

function readablePayload(payload: unknown): { title: string; detail: string } {
  if (!payload || typeof payload !== 'object') {
    return { title: 'Notification', detail: '' };
  }
  const data = payload as Record<string, unknown>;
  const customer = typeof data.customerName === 'string' ? data.customerName : '';
  const requester = typeof data.requesterName === 'string' ? data.requesterName : '';
  const requestDescription = typeof data.description === 'string' ? data.description : '';
  const service = typeof data.serviceName === 'string' ? data.serviceName : '';
  const subject = typeof data.subject === 'string' ? data.subject : '';
  const reason = typeof data.reason === 'string' ? data.reason : '';
  if (data.kind === 'assessment') {
    return {
      title: 'Évaluation capillaire',
      detail: [customer, service].filter(Boolean).join(' · '),
    };
  }
  if (requester)
    return {
      title: 'Demande personnalisée',
      detail: [requester, requestDescription].filter(Boolean).join(' · '),
    };
  if (subject) return { title: subject, detail: customer };
  if (customer) {
    return {
      title: service || 'Rendez-vous',
      detail: [customer, reason].filter(Boolean).join(' · '),
    };
  }
  return { title: 'Notification', detail: '' };
}

function mapNotification(row: Prisma.NotificationGetPayload<object>): AdminNotificationView {
  const readable = readablePayload(row.payload);
  return {
    id: row.id,
    templateKey: row.templateKey,
    channel: row.channel,
    status: row.status,
    link: row.link,
    title: readable.title,
    detail: readable.detail,
    readAt: row.readAt,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
    error: row.error,
    attempts: row.attempts,
    recipient: row.recipient,
  };
}

export async function countUnreadNotifications(): Promise<number> {
  return db.notification.count({ where: { channel: 'IN_APP', readAt: null } });
}

export async function listAdminNotifications(options?: {
  filter?: 'all' | 'unread' | 'failed';
  page?: number;
}): Promise<{
  items: AdminNotificationView[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = 20;
  const filter = options?.filter ?? 'all';
  const where: Prisma.NotificationWhereInput =
    filter === 'unread'
      ? { channel: 'IN_APP', readAt: null }
      : filter === 'failed'
        ? { channel: 'EMAIL', status: 'FAILED' }
        : { channel: 'IN_APP' };

  const [total, rows] = await Promise.all([
    db.notification.count({ where }),
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapNotification),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listFailedEmails(limit = 20): Promise<AdminNotificationView[]> {
  const rows = await db.notification.findMany({
    where: { channel: 'EMAIL', status: 'FAILED' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(mapNotification);
}

export async function notificationDeliveryStats(): Promise<{
  pending: number;
  sent: number;
  failed: number;
}> {
  const [pending, sent, failed] = await Promise.all([
    db.notification.count({
      where: { channel: 'EMAIL', status: { in: ['PENDING', 'PROCESSING'] } },
    }),
    db.notification.count({ where: { channel: 'EMAIL', status: 'SENT' } }),
    db.notification.count({ where: { channel: 'EMAIL', status: 'FAILED' } }),
  ]);
  return { pending, sent, failed };
}
