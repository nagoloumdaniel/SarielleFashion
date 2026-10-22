import type { Metadata } from 'next';
import { GalleryGrid } from '@/components/galerie/GalleryGrid';
import { EmptyState } from '@/components/shared/EmptyState';
import { Title } from '@/components/ui/Title';
import { pageMetadata } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';
import { listPublishedGalleryPhotos } from '@/modules/galerie/queries';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({
    locale,
    path: '/galerie',
    title: messages.gallery.meta.title,
    description: messages.gallery.meta.description,
  });
}

// URLs signées valables 1 h : la page est régénérée bien avant leur expiration.
export const revalidate = 300;

export default async function GaleriePage() {
  const { t } = await getI18n();
  const photos = await listPublishedGalleryPhotos().catch(() => []);

  return (
    <main className="page-main space-y-8">
      <header className="max-w-3xl space-y-3">
        <Title as="h1" size="display">
          {t('gallery.title')}
        </Title>
        <p className="max-w-prose text-base leading-relaxed text-muted md:text-lg">
          {t('gallery.intro')}
        </p>
      </header>
      {photos.length === 0 ? (
        <EmptyState
          title={t('gallery.empty.title')}
          message={t('gallery.empty.message')}
          actionLabel={t('gallery.empty.action')}
          actionHref="/coiffures"
        />
      ) : (
        <GalleryGrid photos={photos} />
      )}
    </main>
  );
}
