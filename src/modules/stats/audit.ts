import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

interface AuditParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, Prisma.InputJsonValue>;
}

/**
 * Journalisation d'audit (P1.10, §14.4) : chaque action importante est
 * tracée en base + en log serveur. Ne JAMAIS y mettre de données
 * sensibles (mots de passe, tokens, photos, texte libre de cliente).
 * Ne fait JAMAIS échouer l'appelant : les erreurs sont capturées ici.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  const { userId, action, entityType, entityId, metadata } = params;

  try {
    console.info(`[audit] ${action} ${entityType}${entityId ? `#${entityId}` : ''}`, {
      userId: userId ?? 'anonymous',
      ...metadata,
    });

    await db.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    // Journal indisponible : on signale sans propager (sans métadonnées, potentiellement sensibles).
    console.error(`[audit] échec d'écriture: ${action} ${entityType}`, error);
  }
}

/* ------------------------------------------------------------------ */
/* Historique lisible (P4.9)                                           */
/* ------------------------------------------------------------------ */

const CATALOGUE_ENTITY_TYPES = [
  'Category',
  'Service',
  'ServiceImage',
  'ServiceOption',
  'CompatibilityRule',
  'QuestionDefinition',
];

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
}

export const AUDIT_PAGE_SIZE = 50;

export async function listCatalogueAuditLogs(options?: {
  take?: number;
  skip?: number;
  entityId?: string;
}): Promise<AuditLogEntry[]> {
  const take = Math.min(Math.max(options?.take ?? AUDIT_PAGE_SIZE, 1), 200);
  const skip = Math.max(options?.skip ?? 0, 0);
  const rows = await db.auditLog.findMany({
    where: {
      entityType: { in: CATALOGUE_ENTITY_TYPES },
      ...(options?.entityId ? { entityId: options.entityId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    include: { user: { select: { name: true, email: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
  }));
}

export async function countCatalogueAuditLogs(entityId?: string): Promise<number> {
  return db.auditLog.count({
    where: {
      entityType: { in: CATALOGUE_ENTITY_TYPES },
      ...(entityId ? { entityId } : {}),
    },
  });
}

/** Historique d'une entité précise (évaluation, demande, réservation). */
export async function listAuditLogsForEntity(
  entityType: string,
  entityId: string,
  take = 50,
): Promise<AuditLogEntry[]> {
  const rows = await db.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(take, 1), 200),
    include: { user: { select: { name: true, email: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
  }));
}
