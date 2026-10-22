import { unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { paginate } from '@/lib/pagination';
import { getImageSignedUrl } from '@/modules/fichiers/storage';
import { publicAuthorName, type RatingSummary } from './engine';

export const REVIEWS_TAG = 'reviews';

/** Seuls les avis réellement soumis (note + date) sont publics. */
const PUBLISHED: Prisma.ReviewWhereInput = { submittedAt: { not: null }, rating: { not: null } };

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  verified: boolean;
  /** ISO. */
  submittedAt: string;
  serviceName: string;
  photos: Array<{ src: string; alt: string }>;
}

const PUBLIC_REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  authorName: true,
  verified: true,
  submittedAt: true,
  service: { select: { name: true } },
  photos: { orderBy: { order: 'asc' }, select: { key: true } },
} satisfies Prisma.ReviewSelect;

type PublicReviewRow = Prisma.ReviewGetPayload<{ select: typeof PUBLIC_REVIEW_SELECT }>;

async function toPublicReview(row: PublicReviewRow): Promise<PublicReview> {
  const author = publicAuthorName(row.authorName);
  const photos = await Promise.all(
    row.photos.map(async (photo, index) => ({
      src: await getImageSignedUrl(photo.key, 3600).catch(() => null),
      alt: `Photo ${index + 1} jointe à l’avis de ${author}`,
    })),
  );
  return {
    id: row.id,
    rating: row.rating ?? 0,
    comment: row.comment,
    authorName: author,
    verified: row.verified,
    submittedAt: (row.submittedAt ?? new Date(0)).toISOString(),
    serviceName: row.service.name,
    photos: photos.filter((photo): photo is { src: string; alt: string } => photo.src !== null),
  };
}

/** Avis d'une prestation, du plus récent au plus ancien (+ photos en URL signée). */
export async function listServiceReviews(
  serviceId: string,
  { offset = 0, limit = 6 }: { offset?: number; limit?: number } = {},
): Promise<{ items: PublicReview[]; hasMore: boolean }> {
  const rows = await db.review.findMany({
    where: { serviceId, ...PUBLISHED },
    orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
    skip: offset,
    take: limit + 1,
    select: PUBLIC_REVIEW_SELECT,
  });
  return {
    items: await Promise.all(rows.slice(0, limit).map(toPublicReview)),
    hasMore: rows.length > limit,
  };
}

/** Derniers avis commentés, toutes prestations confondues (landing). */
export async function listLatestReviews(limit = 3): Promise<PublicReview[]> {
  const rows = await db.review.findMany({
    where: { ...PUBLISHED, comment: { not: null } },
    orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: PUBLIC_REVIEW_SELECT,
  });
  return Promise.all(rows.map(toPublicReview));
}

async function loadServiceSummaries(serviceIds: string[]): Promise<Record<string, RatingSummary>> {
  if (serviceIds.length === 0) return {};
  const groups = await db.review.groupBy({
    by: ['serviceId'],
    where: { serviceId: { in: serviceIds }, ...PUBLISHED },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const result: Record<string, RatingSummary> = {};
  for (const group of groups) {
    const count = group._count._all;
    if (count === 0) continue;
    result[group.serviceId] = {
      count,
      average: Math.round((group._avg.rating ?? 0) * 10) / 10,
    };
  }
  return result;
}

/* Note moyenne + nombre d'avis par prestation (cartes, fiche). Cache court, invalidé par tag
   à chaque nouvel avis ou suppression. Une erreur ne casse jamais la page : aucune note. */
const cachedServiceSummaries = unstable_cache(
  (serviceIds: string[]) => loadServiceSummaries(serviceIds),
  ['public-review-summaries'],
  { revalidate: 60, tags: [REVIEWS_TAG] },
);

export async function getServiceRatingSummaries(
  serviceIds: string[],
): Promise<Record<string, RatingSummary>> {
  try {
    return await cachedServiceSummaries([...new Set(serviceIds)].sort());
  } catch (error) {
    console.error('[reviews] résumé des notes indisponible', error);
    return {};
  }
}

/* ---------- Dashboard ---------- */

export async function listReviewsForAdmin(requestedPage = 1, pageSize = 20) {
  const total = await db.review.count({ where: PUBLISHED });
  const { page, totalPages, skip, take } = paginate(total, requestedPage, pageSize);
  const rows = await db.review.findMany({
    where: PUBLISHED,
    orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
    skip,
    take,
    select: {
      id: true,
      rating: true,
      comment: true,
      authorName: true,
      verified: true,
      submittedAt: true,
      customer: { select: { id: true, name: true, email: true } },
      service: { select: { name: true, slug: true } },
      photos: { orderBy: { order: 'asc' }, select: { key: true } },
    },
  });
  const items = await Promise.all(
    rows.map(async (row) => {
      const urls = await Promise.all(
        row.photos.map((photo) => getImageSignedUrl(photo.key, 3600).catch(() => null)),
      );
      return {
        id: row.id,
        rating: row.rating ?? 0,
        comment: row.comment,
        authorName: row.authorName || row.customer?.name || 'Anonyme',
        customer: row.customer,
        verified: row.verified,
        submittedAt: (row.submittedAt ?? new Date(0)).toISOString(),
        service: row.service,
        photos: urls.filter((url): url is string => url !== null),
      };
    }),
  );
  return { items, total, page, totalPages };
}

export async function getReviewByToken(token: string) {
  return db.review.findUnique({
    where: { token },
    include: { service: { select: { name: true } } },
  });
}
