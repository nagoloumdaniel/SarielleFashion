import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { paginate } from '@/lib/pagination';
import { findActivePromotion, type PromotionCandidate } from './pricing';

/* ============================================================
 * Lecture des promotions (P8.12)
 * ============================================================ */

export async function listPromotions(requestedPage = 1, pageSize = 12) {
  const total = await db.promotion.count();
  const { page, totalPages, skip, take } = paginate(total, requestedPage, pageSize);
  const items = await db.promotion.findMany({
    orderBy: { createdAt: 'desc' },
    include: { services: { include: { service: { select: { id: true, name: true } } } } },
    skip,
    take,
  });
  return { items, total, page, totalPages };
}

/**
 * Promotions actives (période en cours) sous forme de candidats pour le moteur de prix.
 * Fonctionne avec `db` ou avec un client de transaction. Triées de la plus récente à la plus ancienne.
 */
export async function fetchPromotionCandidates(
  client: Pick<Prisma.TransactionClient, 'promotion'>,
  now: Date,
): Promise<PromotionCandidate[]> {
  const rows = await client.promotion.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { createdAt: 'desc' },
    include: { services: { select: { serviceId: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    kind: row.kind,
    value: row.value,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    active: row.active,
    serviceIds: row.services.map((s) => s.serviceId),
  }));
}

/** Promotion automatique (sans code) active pour une prestation à l'instant présent, ou null. */
export async function getActivePromotionForService(
  serviceId: string,
  now: Date = new Date(),
): Promise<PromotionCandidate | null> {
  const candidates = await fetchPromotionCandidates(db, now);
  return findActivePromotion(candidates, serviceId, now);
}
