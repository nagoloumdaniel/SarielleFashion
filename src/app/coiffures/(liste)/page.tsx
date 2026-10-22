import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import { Link } from '@/i18n/link';
import { I18nScope } from '@/i18n/client';
import { pageMetadata } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';
import { ServiceCard } from '@/components/catalogue/ServiceCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { categoryLabel, parseCatalogueQuery } from '@/lib/catalogue';
import { getServiceRatingSummaries } from '@/modules/avis/queries';
import { getCachedCategories, getCachedServices } from '@/lib/public-cache';
import { CatalogueFilters } from '../catalogue-filters';
import { Pagination } from '@/components/ui/Pagination';
import { Title } from '@/components/ui/Title';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({
    locale,
    path: '/coiffures',
    title: messages.catalogue.meta.title,
    description: messages.catalogue.meta.description,
  });
}

function pageHref(search: string, category: string, page: number): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/coiffures?${query}` : '/coiffures';
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, messages, t } = await getI18n();
  const query = parseCatalogueQuery(await searchParams);
  const [categories, result] = await Promise.all([getCachedCategories(), getCachedServices(query)]);

  const { services, total, page, totalPages } = result;
  const summaries = await getServiceRatingSummaries(services.map((service) => service.id));
  const search = query.search ?? '';
  const category = query.category ?? '';
  const hasFilters = search !== '' || category !== '';

  return (
    <I18nScope messages={{ catalogue: messages.catalogue }}>
      <main className="page-main space-y-8 md:space-y-10">
        <nav aria-label={t('common.breadcrumb')} className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition hover:text-cacao">
                {t('catalogue.breadcrumb.home')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <span aria-current="page" className="font-medium text-fg">
                {t('catalogue.breadcrumb.catalogue')}
              </span>
            </li>
          </ol>
        </nav>

        <header className="max-w-3xl space-y-3">
          <Title as="h1" size="display">
            {t('catalogue.list.title')}
          </Title>
          <p className="max-w-prose text-base leading-relaxed text-muted md:text-lg">
            {t('catalogue.list.intro')}
          </p>
        </header>

        <CatalogueFilters
          categories={categories.map((c) => ({
            ...c,
            name: categoryLabel(locale, c.slug, c.name),
          }))}
          initialSearch={search}
          initialCategory={category}
          total={total}
        />

        <section aria-labelledby="resultats-titre" className="space-y-6">
          <Title as="h2" id="resultats-titre">
            {hasFilters ? t('catalogue.list.resultsSearch') : t('catalogue.list.resultsAll')}
          </Title>

          {services.length === 0 ? (
            <EmptyState
              title={
                hasFilters ? t('catalogue.list.emptyFilteredTitle') : t('catalogue.list.emptyTitle')
              }
              message={
                hasFilters
                  ? t('catalogue.list.emptyFilteredMessage')
                  : t('catalogue.list.emptyMessage')
              }
              actionLabel={hasFilters ? t('catalogue.list.emptyFilteredAction') : undefined}
              actionHref={hasFilters ? '/coiffures' : undefined}
            />
          ) : (
            <ul
              aria-label={t('catalogue.list.listAria')}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {services.map((service, index) => (
                <li key={service.id}>
                  <ServiceCard
                    service={service}
                    priority={index < 3}
                    rating={summaries[service.id]}
                  />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(target) => pageHref(search, category, target)}
            label={t('catalogue.list.pagination')}
          />
        </section>
      </main>
    </I18nScope>
  );
}
