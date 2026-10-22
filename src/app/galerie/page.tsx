import type { Metadata } from 'next';
import Image from 'next/image';
import { listPublishedGalleryPhotos } from '@/modules/galerie/queries';
import { IMAGE_BLUR_DATA_URL } from '@/lib/image-placeholder';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Galerie de réalisations - Hairstyle by Patricia',
  description: 'Un aperçu de réalisations de Patricia, partagées avec l’autorisation des clientes.',
};

export const revalidate = 300;

export default async function GaleriePage() {
  const photos = await listPublishedGalleryPhotos();

  return (
    <main className="page-main">
      <Title as="h1" size="display" className="">
        Galerie de réalisations
      </Title>
      {photos.length === 0 ? (
        <p className="mt-10 rounded-[var(--radius-md)] border border-dashed border-line p-10 text-center text-muted">
          La galerie sera bientôt disponible.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos
            .filter((photo) => photo.src)
            .map((photo) => (
              <figure
                key={photo.id}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-card shadow-soft"
              >
                <div className="relative aspect-square w-full">
                  <Image
                    src={photo.src!}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={IMAGE_BLUR_DATA_URL}
                  />
                </div>
                {photo.serviceName ? (
                  <figcaption className="p-3 text-sm font-medium text-fg">
                    {photo.serviceName}
                  </figcaption>
                ) : null}
              </figure>
            ))}
        </div>
      )}
    </main>
  );
}
