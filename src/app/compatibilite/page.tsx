import { categoryLabel } from '@/lib/catalogue';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/link';
import { I18nScope } from '@/i18n/client';
import { getI18n } from '@/i18n/server';
import { pageMetadata } from '@/i18n/metadata';
import {
  getCompatibilityServiceBySlug,
  listPublishedServicesForCompatibility,
  questionsForService,
} from '@/modules/compatibilite/queries';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { CompatibilityWizard } from './compatibility-wizard';
import { Title } from '@/components/ui/Title';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({ locale, path: '/compatibilite', ...messages.compat.meta });
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function CompatibilitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { locale, t, messages } = await getI18n();
  const slug = firstValue(params.service).trim();

  if (slug === '') {
    const services = await listPublishedServicesForCompatibility();
    return (
      <main className="page-main space-y-8">
        <Breadcrumb
          items={[{ label: t('nav.home'), href: '/' }, { label: t('compat.breadcrumb') }]}
        />

        <header className="max-w-3xl">
          <Title as="h1" size="display" className="">
            {t('compat.pickH1')}
          </Title>
        </header>

        {services.length === 0 ? (
          <EmptyState
            title={t('compat.empty.title')}
            message={t('compat.empty.message')}
            actionLabel={t('compat.empty.action')}
            actionHref="/coiffures"
          />
        ) : (
          <section aria-labelledby="choix-prestation" className="space-y-4">
            <Title as="h2" id="choix-prestation" className="">
              {t('compat.pickH2')}
            </Title>
            <ul className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <li key={service.id}>
                  <Link
                    href={`/compatibilite?service=${encodeURIComponent(service.slug)}`}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-card p-4 shadow-soft transition hover:border-cacao hover:bg-page"
                  >
                    <span>
                      <span className="block font-semibold text-fg">{service.name}</span>
                      <span className="text-sm text-muted">{categoryLabel(locale, service.categorySlug, service.categoryName)}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 text-cacao" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    );
  }

  const service = await getCompatibilityServiceBySlug(slug);
  if (!service) notFound();

  const questions = questionsForService(service);

  return (
    <main className="page-main space-y-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), href: '/' },
          { label: t('compat.breadcrumbCatalogue'), href: '/coiffures' },
          { label: service.name, href: `/coiffures/${service.slug}` },
          { label: t('compat.breadcrumb') },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{categoryLabel(locale, service.categorySlug, service.categoryName)}</Badge>
          <Badge tone="accent">{t('compat.badge')}</Badge>
        </div>
        <Title as="h1" size="display" className="">
          {t('compat.h1')}
        </Title>
        <p className="max-w-2xl text-muted">
          {t('compat.introBefore')} <strong>{service.name}</strong>. {t('compat.introAfter')}
        </p>
      </header>

      <I18nScope messages={{ compat: messages.compat }}>
        <CompatibilityWizard serviceSlug={service.slug} rule={service.rule} questions={questions} />
      </I18nScope>
    </main>
  );
}
