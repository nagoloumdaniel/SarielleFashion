import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t('errors.notFound.title'),
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main
      data-fullscreen
      className="bg-gradient-soft fixed inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto px-6 pb-6 pt-24 text-center"
    >
      <p
        aria-hidden="true"
        className="text-gradient-primary px-[0.15em] pb-[0.05em] font-heading text-[clamp(5rem,min(28vw,28svh),16rem)] font-black italic leading-none"
      >
        404
      </p>
      <Title as="h1" size="display" className="mt-2">
        {t('errors.notFound.title')}
      </Title>
      <p className="mt-4 max-w-md text-lg text-muted">{t('errors.notFound.message')}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/coiffures" className="sm:w-48">
          {t('errors.notFound.catalogue')}
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" className="sm:w-48">
          {t('errors.notFound.home')}
        </ButtonLink>
      </div>
    </main>
  );
}
