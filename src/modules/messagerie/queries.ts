import type { ConversationSource, ConversationStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';

/* ============================================================
 * P7.6 : boîte de réception du dashboard.
 * Les notes internes sont conservées ici et ne sortent jamais
 * du dashboard (aucun endpoint public de conversation).
 * ============================================================ */

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  NEW: 'Nouveau',
  IN_PROGRESS: 'En cours',
  WAITING_RESPONSE: 'Attente réponse',
  TREATED: 'Traité',
  ARCHIVED: 'Archivé',
};

export const CONVERSATION_STATUS_TONES: Record<
  ConversationStatus,
  'accent' | 'success' | 'alert' | 'neutral'
> = {
  NEW: 'accent',
  IN_PROGRESS: 'neutral',
  WAITING_RESPONSE: 'alert',
  TREATED: 'success',
  ARCHIVED: 'neutral',
};

export const CONVERSATION_STATUSES: ConversationStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'WAITING_RESPONSE',
  'TREATED',
  'ARCHIVED',
];

export const CONVERSATION_SOURCE_LABELS: Record<ConversationSource, string> = {
  CONTACT: 'Contact',
  APPOINTMENT: 'Rendez-vous',
  COMPATIBILITY: 'Compatibilité',
  CUSTOM: 'Personnalisé',
};

export interface ConversationListItem {
  id: string;
  subject: string;
  status: ConversationStatus;
  source: ConversationSource;
  lastMessageAt: Date;
  customerName: string;
  customerEmail: string | null;
  lastMessage: string;
  unreadCount: number;
}

export interface ConversationMessage {
  id: string;
  author: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  content: string;
  isInternal: boolean;
  sentAt: Date;
  readAt: Date | null;
}

export interface ConversationDetail extends ConversationListItem {
  customerId: string | null;
  customerPhone: string | null;
  messages: ConversationMessage[];
}

const LIST_SELECT = {
  id: true,
  subject: true,
  status: true,
  source: true,
  lastMessageAt: true,
  customer: { select: { name: true, email: true } },
  // Aperçu = dernier message visible de la cliente / de Sarielle (jamais une note interne).
  messages: {
    where: { isInternal: false },
    orderBy: { sentAt: 'desc' },
    take: 1,
    select: { content: true },
  },
  // Non lus : compteur filtré calculé dans la même requête (évite une 2e requête séquentielle).
  _count: {
    select: { messages: { where: { author: 'CUSTOMER', isInternal: false, readAt: null } } },
  },
} satisfies Prisma.ConversationSelect;

type ListRow = Prisma.ConversationGetPayload<{ select: typeof LIST_SELECT }>;

export async function listConversations(options?: {
  status?: ConversationStatus;
  page?: number;
}): Promise<{
  items: ConversationListItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = 20;
  const where: Prisma.ConversationWhereInput = options?.status ? { status: options.status } : {};
  const [total, rows] = await Promise.all([
    db.conversation.count({ where }),
    db.conversation.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map((row: ListRow) => ({
      id: row.id,
      subject: row.subject,
      status: row.status,
      source: row.source,
      lastMessageAt: row.lastMessageAt,
      customerName: row.customer?.name ?? 'Contact sans fiche',
      customerEmail: row.customer?.email ?? null,
      lastMessage: row.messages[0]?.content ?? '',
      unreadCount: row._count.messages,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getConversationAdmin(id: string): Promise<ConversationDetail | null> {
  const row = await db.conversation.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      messages: { orderBy: { sentAt: 'asc' } },
    },
  });
  if (!row) return null;
  const unreadCount = row.messages.filter(
    (message) => message.author === 'CUSTOMER' && !message.isInternal && !message.readAt,
  ).length;
  return {
    id: row.id,
    subject: row.subject,
    status: row.status,
    source: row.source,
    lastMessageAt: row.lastMessageAt,
    customerName: row.customer?.name ?? 'Contact sans fiche',
    customerEmail: row.customer?.email ?? null,
    customerId: row.customer?.id ?? null,
    customerPhone: row.customer?.phone ?? null,
    unreadCount,
    lastMessage: row.messages.findLast((message) => !message.isInternal)?.content ?? '',
    messages: row.messages.map((message) => ({
      id: message.id,
      author: message.author,
      content: message.content,
      isInternal: message.isInternal,
      sentAt: message.sentAt,
      readAt: message.readAt,
    })),
  };
}

export async function countConversationsByStatus(): Promise<Record<ConversationStatus, number>> {
  const rows = await db.conversation.groupBy({ by: ['status'], _count: { _all: true } });
  const counts = Object.fromEntries(CONVERSATION_STATUSES.map((status) => [status, 0])) as Record<
    ConversationStatus,
    number
  >;
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

export async function countUnreadCustomerMessages(): Promise<number> {
  return db.message.count({
    where: { author: 'CUSTOMER', isInternal: false, readAt: null },
  });
}
