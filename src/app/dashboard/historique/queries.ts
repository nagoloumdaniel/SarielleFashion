import { db } from '@/lib/db';

/* ============================================================
 * Journal d'audit du dashboard : filtres par domaine, pagination.
 * Aucune métadonnée n'est remontée (jamais de données sensibles à l'écran).
 * ============================================================ */

export const HISTORY_PAGE_SIZE = 20;

export const HISTORY_GROUPS = {
  catalogue: {
    label: 'Catalogue',
    types: [
      'Category',
      'Service',
      'ServiceImage',
      'ServiceOption',
      'CompatibilityRule',
      'QuestionDefinition',
    ],
  },
  reservations: {
    label: 'Réservations',
    types: ['Appointment', 'AvailabilityRule', 'BlockedPeriod'],
  },
  clientes: {
    label: 'Clientes et messages',
    types: ['Customer', 'Conversation', 'CustomRequest', 'HairAssessment', 'Review'],
  },
  autres: {
    label: 'Autres',
    types: ['Promotion', 'GalleryPhoto', 'SalonSettings', 'Notification'],
  },
} as const;

export type HistoryGroup = keyof typeof HISTORY_GROUPS;

export const HISTORY_GROUP_KEYS = Object.keys(HISTORY_GROUPS) as HistoryGroup[];

export interface HistoryEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: Date;
  userName: string | null;
}

export async function listHistory(options: {
  group?: HistoryGroup;
  entityId?: string;
  page: number;
}): Promise<{ items: HistoryEntry[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, options.page);
  const where = {
    ...(options.group ? { entityType: { in: [...HISTORY_GROUPS[options.group].types] } } : {}),
    ...(options.entityId ? { entityId: options.entityId } : {}),
  };
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      createdAt: row.createdAt,
      userName: row.user?.name ?? null,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)),
  };
}
