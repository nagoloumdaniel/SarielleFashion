import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ServiceCard } from '@/components/catalogue/ServiceCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { parseCatalogueQuery } from '@/lib/catalogue';
import { getCachedCategories, getCachedServices } from '@/lib/public-cache';
import { CatalogueFilters } from '../catalogue-filters';
import { Pagination } from '@/components/ui/Pagination';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Catalogue des coiffures',
  description:
    'Découvrez les prestations de Sarielle Fashion : coiffure, make-up, pose de lace et de cils. Prix, durées et réservation en ligne.',
  alternates: { canonical: '/coiffures' },
};

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
  const query = parseCatalogueQuery(await searchParams);
  const [categories, result] = await Promise.all([getCachedCategories(), getCachedServices(query)]);

  const { services, total, page, totalPages } = result;
  const search = query.search ?? '';
  const category = query.category ?? '';
  const hasFilters = search !== '' || category !== '';

  return (
    <main className="page-main space-y-8 md:space-y-10">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="transition hover:text-cacao">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <span aria-current="page" className="font-medium text-fg">
              Coiffures
            </span>
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl space-y-3">
        <Title as="h1" size="display">
          Coiffures et prestations
        </Title>
        <p className="max-w-prose text-base leading-relaxed text-muted md:text-lg">
          Prix et durée affichés avant la réservation. Sarielle vous reçoit sur rendez-vous à
          Clausthal-Zellerfeld.
        </p>
      </header>

      <CatalogueFilters
        categories={categories}
        initialSearch={search}
        initialCategory={category}
        total={total}
      />

      <section aria-labelledby="resultats-titre" className="space-y-6">
        <Title as="h2" id="resultats-titre">
          {hasFilters ? 'Résultats de votre recherche' : 'Toutes les coiffures'}
        </Title>

        {services.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Aucune coiffure ne correspond' : 'Le catalogue arrive bientôt'}
            message={
              hasFilters
                ? 'Essayez un autre mot-clé ou une autre catégorie.'
                : 'Les coiffures seront publiées très prochainement. Revenez bientôt.'
            }
            actionLabel={hasFilters ? 'Voir toutes les coiffures' : undefined}
            actionHref={hasFilters ? '/coiffures' : undefined}
          />
        ) : (
          <ul
            aria-label="Prestations du catalogue"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {services.map((service, index) => (
              <li key={service.id}>
                <ServiceCard service={service} priority={index < 3} />
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          hrefFor={(target) => pageHref(search, category, target)}
          label="Pagination du catalogue"
        />
      </section>
    </main>
  );
}
