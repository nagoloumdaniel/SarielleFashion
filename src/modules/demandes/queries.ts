import type { CustomRequestStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { signedPrivatePhotos, type SignedPhoto } from '@/modules/fichiers/private-images';

/* ============================================================
 * P8.2 / P8.3 : file des demandes personnalisées et fiches clientes.
 * ============================================================ */

export const CUSTOM_REQUEST_STATUS_LABELS: Record<CustomRequestStatus, string> = {
  NEW: 'Nouvelle',
  IN_REVIEW: 'En cours',
  INFO_REQUESTED: 'Précisions demandées',
  QUOTED: 'Devis envoyé',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  CLOSED: 'Clôturée',
};

export const CUSTOM_REQUEST_STATUS_TONES: Record<
  CustomRequestStatus,
  'accent' | 'success' | 'alert' | 'neutral'
> = {
  NEW: 'accent',
  IN_REVIEW: 'neutral',
  INFO_REQUESTED: 'alert',
  QUOTED: 'accent',
  ACCEPTED: 'success',
  REFUSED: 'alert',
  CLOSED: 'neutral',
};

export const CUSTOM_REQUEST_STATUSES: CustomRequestStatus[] = [
  'NEW',
  'IN_REVIEW',
  'INFO_REQUESTED',
  'QUOTED',
  'ACCEPTED',
  'REFUSED',
  'CLOSED',
];

export interface CustomRequestListItem {
  id: string;
  requesterName: string;
  requesterEmail: string;
  desiredDate: Date | null;
  status: CustomRequestStatus;
  description: string;
  createdAt: Date;
}

export async function listCustomRequests(options?: {
  status?: CustomRequestStatus;
  page?: number;
}): Promise<{
  items: CustomRequestListItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = 20;
  const where: Prisma.CustomRequestWhereInput = options?.status ? { status: options.status } : {};
  const [total, rows] = await Promise.all([
    db.customRequest.count({ where }),
    db.customRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        requesterName: true,
        requesterEmail: true,
        desiredDate: true,
        status: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    items: rows,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function countCustomRequestsByStatus(): Promise<Record<CustomRequestStatus, number>> {
  const rows = await db.customRequest.groupBy({ by: ['status'], _count: { _all: true } });
  const counts = Object.fromEntries(CUSTOM_REQUEST_STATUSES.map((status) => [status, 0])) as Record<
    CustomRequestStatus,
    number
  >;
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

export interface CustomRequestDetail {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  description: string;
  hairInfo: Record<string, unknown> | null;
  desiredDate: Date | null;
  status: CustomRequestStatus;
  adminReply: string | null;
  estimatedPriceCents: number | null;
  proposedService: { id: string; name: string } | null;
  proposedSlot: Date | null;
  createdAt: Date;
  photos: SignedPhoto[];
  decisions: Array<{
    id: string;
    action: string;
    message: string | null;
    priceCents: number | null;
    proposedServiceName: string | null;
    proposedSlot: Date | null;
    createdAt: Date;
    userName: string | null;
  }>;
}

export async function getCustomRequestAdmin(id: string): Promise<CustomRequestDetail | null> {
  const row = await db.customRequest.findUnique({
    where: { id },
    include: {
      proposedService: { select: { id: true, name: true } },
      decisions: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    requesterPhone: row.requesterPhone,
    description: row.description,
    hairInfo:
      row.hairInfo && typeof row.hairInfo === 'object'
        ? (row.hairInfo as Record<string, unknown>)
        : null,
    desiredDate: row.desiredDate,
    status: row.status,
    adminReply: row.adminReply,
    estimatedPriceCents: row.estimatedPriceCents,
    proposedService: row.proposedService,
    proposedSlot: row.proposedSlot,
    createdAt: row.createdAt,
    photos: await signedPrivatePhotos(row.photoKeys),
    decisions: row.decisions.map((decision) => ({
      id: decision.id,
      action: decision.action,
      message: decision.message,
      priceCents: decision.priceCents,
      proposedServiceName: decision.proposedServiceName,
      proposedSlot: decision.proposedSlot,
      createdAt: decision.createdAt,
      userName: decision.user?.name ?? null,
    })),
  };
}

export async function listPublishedServiceOptions(): Promise<Array<{ id: string; name: string }>> {
  return db.service.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  });
}
