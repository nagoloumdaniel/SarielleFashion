import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Pagination } from '@/components/ui/Pagination';
import { db } from '@/lib/db';
import { parsePage } from '@/lib/pagination';
import { requireAdmin } from '@/modules/auth/guards';
import { getImageSignedUrl, isStorageConfigured } from '@/modules/fichiers/storage';
import { listGalleryPhotosAdmin } from '@/modules/galerie/queries';
import { GalerieClient } from './galerie-client';

export const metadata: Metadata = { title: 'Galerie - Tableau de bord' };

export default async function GaleriePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/galerie');

  const { page: rawPage } = await searchParams;
  const [gallery, services] = await Promise.all([
    listGalleryPhotosAdmin(parsePage(rawPage)),
    db.service.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  // URLs signées calculées en parallèle ; une photo illisible n'empêche pas l'affichage des autres.
  const rows = await Promise.all(
    gallery.photos.map(async (photo) => ({
      id: photo.id,
      url: await getImageSignedUrl(photo.key, 3600).catch(() => null),
      alt: photo.alt,
      published: photo.published,
      serviceId: photo.service?.id ?? '',
      serviceName: photo.service?.name ?? null,
    })),
  );

  return (
    <>
      <GalerieClient
        photos={rows}
        services={services}
        storageReady={isStorageConfigured()}
        offset={gallery.offset}
        total={gallery.total}
      />
      <Pagination
        page={gallery.page}
        totalPages={gallery.totalPages}
        hrefFor={(next) => (next > 1 ? `/dashboard/galerie?page=${next}` : '/dashboard/galerie')}
        label="Pagination de la galerie"
      />
    </>
  );
}
