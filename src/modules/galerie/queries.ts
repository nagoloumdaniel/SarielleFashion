import { db } from '@/lib/db';
import { paginate } from '@/lib/pagination';
import { getImageSignedUrl } from '@/modules/fichiers/storage';

export async function listGalleryPhotosAdmin(requestedPage = 1, pageSize = 24) {
  const total = await db.galleryPhoto.count();
  const { page, totalPages, skip, take } = paginate(total, requestedPage, pageSize);
  const photos = await db.galleryPhoto.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    include: { service: { select: { id: true, name: true } } },
    skip,
    take,
  });
  return { photos, total, page, totalPages, offset: skip };
}

export interface PublicGalleryPhoto {
  id: string;
  src: string | null;
  alt: string;
  serviceName: string | null;
}

/** Photos publiées (P8.11) : URL signée calculée à chaque lecture (bucket privé). */
export async function listPublishedGalleryPhotos(): Promise<PublicGalleryPhoto[]> {
  const rows = await db.galleryPhoto.findMany({
    where: { published: true, consentConfirmed: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    include: { service: { select: { name: true } } },
  });
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      src: await getImageSignedUrl(row.key, 3600).catch(() => null),
      alt: row.alt || row.service?.name || 'Réalisation',
      serviceName: row.service?.name ?? null,
    })),
  );
}
