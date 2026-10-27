import { unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { withSignedImages } from './catalogue-images';
import { CATALOGUE_TAG } from './public-cache';

/** Nombre de coiffures affichées dans « Les plus réservées ». */
export const POPULAR_LIMIT = 3;

export type BookingStat = {
  serviceId: string;
  name: string;
  count: number;
  lastBookedAt: Date;
};

/**
 * Classement pur : nombre de réservations décroissant, puis réservation la plus
 * récente, puis nom. Écarte les coiffures sans réservation. Retourne les ids.
 */
export function rankPopularServices(stats: BookingStat[], limit = POPULAR_LIMIT): string[] {
  return stats
    .filter((s) => s.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.lastBookedAt.getTime() - a.lastBookedAt.getTime() ||
        a.name.localeCompare(b.name, 'fr'),
    )
    .slice(0, limit)
    .map((s) => s.serviceId);
}

const POPULAR_SERVICE_SELECT = {
  id: true,
  name: true,
  slug: true,
  priceFromCents: true,
  priceToCents: true,
  priceOnRequest: true,
  durationMinutes: true,
  category: { select: { name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
    take: 4,
    select: { key: true, alt: true },
  },
} satisfies Prisma.ServiceSelect;

export type PopularService = Prisma.ServiceGetPayload<{ select: typeof POPULAR_SERVICE_SELECT }>;

/**
 * Les coiffures publiées (catégorie active) les plus réservées, hors rendez-vous
 * annulés. 2 requêtes (groupBy + findMany par ids), pas de N+1. Vide si aucune
 * réservation ou en cas d'erreur : l'accueil ne casse jamais.
 */
export async function getPopularServices(): Promise<PopularService[]> {
  try {
    const groups = await db.appointment.groupBy({
      by: ['serviceId'],
      where: {
        status: { notIn: ['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'] },
        service: { status: 'PUBLISHED', category: { active: true } },
      },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    if (groups.length === 0) return [];

    const services = await db.service.findMany({
      where: { id: { in: groups.map((g) => g.serviceId) } },
      select: POPULAR_SERVICE_SELECT,
    });
    const byId = new Map(services.map((s) => [s.id, s]));

    const stats: BookingStat[] = groups.flatMap((g) => {
      const service = byId.get(g.serviceId);
      if (!service || !g._max.createdAt) return [];
      return [
        {
          serviceId: g.serviceId,
          name: service.name,
          count: g._count._all,
          lastBookedAt: g._max.createdAt,
        },
      ];
    });

    const ranked = rankPopularServices(stats).flatMap((id) => {
      const service = byId.get(id);
      return service ? [service] : [];
    });
    return await Promise.all(ranked.map(withSignedImages));
  } catch (error) {
    console.error('[popular-services]', error);
    return [];
  }
}

/* Cache : tag catalogue (changement de prestation) + revalidate 120 s. Les actions de
   réservation ne posent pas de tag : une nouvelle réservation / annulation apparaît
   au plus tard après 120 s (classement indicatif, délai acceptable). */
export const getCachedPopularServices = unstable_cache(
  () => getPopularServices(),
  ['public-popular-services'],
  { revalidate: 120, tags: [CATALOGUE_TAG] },
);
