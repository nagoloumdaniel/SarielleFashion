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
  src: string;
  alt: string;
  serviceName: string | null;
  /** Légende saisie par l'admin (vide si aucune). */
  caption: string;
}

/** Photos publiées : URL signée calculée à chaque lecture (bucket privé). Photos illisibles écartées. */
export async function listPublishedGalleryPhotos(limit?: number): Promise<PublicGalleryPhoto[]> {
  const rows = await db.galleryPhoto.findMany({
    where: { published: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    include: { service: { select: { name: true } } },
  });
  const photos = await Promise.all(
    rows.map(async (row) => {
      const src = await getImageSignedUrl(row.key, 3600).catch(() => null);
      if (!src) return null;
      return {
        id: row.id,
        src,
        alt: row.alt || row.service?.name || 'Réalisation',
        serviceName: row.service?.name ?? null,
        caption: row.alt,
      } satisfies PublicGalleryPhoto;
    }),
  );
  return photos.filter((photo): photo is PublicGalleryPhoto => photo !== null);
}
