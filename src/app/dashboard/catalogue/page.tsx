import { ImageOff, Plus, Scissors } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import {
  getCatalogueStats,
  listAdminCategories,
  listAdminServices,
  type AdminService,
} from '@/lib/catalogue-admin';
import { adminServiceFiltersSchema } from '@/modules/catalogue/schemas';
import { formatDuration, formatPrice } from '@/lib/catalogue';
import { getImageSignedUrl } from '@/modules/fichiers/storage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Tabs } from '@/components/ui/Tabs';
import { parsePage } from '@/lib/pagination';
import { ServiceActionsRow } from './service-actions-row';
import { CategoriesTab } from './categories-tab';
import { ServiceFilters } from './service-filters';

export const metadata: Metadata = { title: 'Catalogue - Tableau de bord' };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
};

const STATUS_TONES: Record<string, 'accent' | 'success' | 'alert' | 'neutral'> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'alert',
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

/* Tuile de chiffre ; cliquable (filtre par statut) quand `href` est fourni. */
function StatTile({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className={`font-heading text-2xl font-bold leading-tight ${tone}`}>{value}</p>
    </>
  );
  const base =
    'block rounded-[var(--radius-lg)] border border-transparent bg-card px-4 py-3 shadow-soft';
  return href ? (
    <Link
      href={href}
      aria-label={`${label} : ${value}`}
      className={`${base} transition hover:border-cacao hover:shadow-lift`}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

/* Carte prestation : toute la carte mène à la fiche (lien étiré sur le nom) ;
   les actions rapides restent des boutons indépendants, au-dessus du lien. */
function ServiceCard({ service, thumbUrl }: { service: AdminService; thumbUrl: string | null }) {
  return (
    <li className="relative flex gap-3 rounded-[var(--radius-lg)] border border-transparent bg-card p-3 shadow-soft transition focus-within:border-cacao hover:border-cacao hover:shadow-lift">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-accent-soft sm:size-24">
        {thumbUrl ? (
          // URL signée à durée limitée : next/image mettrait chaque URL en cache d'optimisation.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted">
            {service.imageCount === 0 ? (
              <ImageOff aria-hidden="true" className="size-6" />
            ) : (
              <Scissors aria-hidden="true" className="size-6" />
            )}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/dashboard/catalogue/prestations/${service.id}`}
            className="stretched-link min-w-0 truncate font-semibold outline-none"
          >
            {service.name}
          </Link>
          <Badge tone={STATUS_TONES[service.status] ?? 'neutral'} className="shrink-0">
            {STATUS_LABELS[service.status] ?? service.status}
          </Badge>
        </div>
        <p className="truncate text-sm text-muted">{service.categoryName}</p>
        <p className="mt-1 text-sm">
          {formatPrice(service)} · {formatDuration(service.durationMinutes)}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="text-xs text-muted">
            {service.imageCount} photo{service.imageCount > 1 ? 's' : ''} · {service.optionCount}{' '}
            option{service.optionCount > 1 ? 's' : ''}
          </p>
          <div className="relative z-10">
            <ServiceActionsRow
              service={{ id: service.id, name: service.name, status: service.status }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/catalogue');

  const rawParams = await searchParams;
  const filtersResult = adminServiceFiltersSchema.safeParse({
    search: firstValue(rawParams.search),
    categoryId: firstValue(rawParams.category),
    status: firstValue(rawParams.status),
  });
  const filters = filtersResult.success
    ? filtersResult.data
    : { search: undefined, categoryId: undefined, status: undefined };

  const [categories, servicesPage, stats] = await Promise.all([
    listAdminCategories(),
    listAdminServices(filters, parsePage(rawParams.page)),
    getCatalogueStats(),
  ]);

  const services = servicesPage.items;

  // Signature locale (HMAC, sans appel réseau) des vignettes, en parallèle.
  const thumbs = await Promise.all(
    services.map((service) =>
      service.thumbKey ? getImageSignedUrl(service.thumbKey).catch(() => null) : null,
    ),
  );

  const search = filters.search ?? '';
  const category = filters.categoryId ?? '';
  const status = filters.status ?? '';
  const hasFilters = search !== '' || category !== '' || status !== '';

  const prestationsPanel = (
    <div className="rounded-[var(--radius-lg)] bg-card shadow-soft">
      <ServiceFilters
        search={search}
        category={category}
        status={status}
        categoryOptions={[
          { value: '', label: 'Toutes les catégories' },
          ...categories.map((item) => ({
            value: item.id,
            label: item.active ? item.name : `${item.name} (désactivée)`,
          })),
        ]}
        statusOptions={[
          { value: '', label: 'Tous les statuts' },
          { value: 'DRAFT', label: 'Brouillon' },
          { value: 'PUBLISHED', label: 'Publié' },
          { value: 'ARCHIVED', label: 'Archivé' },
        ]}
      />

      <div className="p-3 sm:p-4">
        <p className="mb-3 text-sm text-muted" aria-live="polite">
          {servicesPage.total} prestation{servicesPage.total > 1 ? 's' : ''}
          {hasFilters ? ' correspondent aux filtres' : ' au total'}
        </p>

        {services.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-line px-4 py-10 text-center">
            <Scissors aria-hidden="true" className="size-8 text-accent" />
            <div>
              <p className="font-semibold">
                {hasFilters ? 'Aucune prestation ne correspond' : 'Le catalogue est vide'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {hasFilters
                  ? 'Modifiez la recherche ou les filtres pour retrouver vos prestations.'
                  : 'Créez votre première prestation pour la voir apparaître sur le site public.'}
              </p>
            </div>
            {hasFilters ? null : (
              <ButtonLink href="/dashboard/catalogue/prestations/nouvelle" icon={Plus}>
                Créer une prestation
              </ButtonLink>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} thumbUrl={thumbs[index] ?? null} />
            ))}
          </ul>
        )}

        <Pagination
          page={servicesPage.page}
          totalPages={servicesPage.totalPages}
          hrefFor={(next) => {
            const query = new URLSearchParams();
            if (search) query.set('search', search);
            if (category) query.set('category', category);
            if (status) query.set('status', status);
            if (next > 1) query.set('page', String(next));
            const value = query.toString();
            return value ? `/dashboard/catalogue?${value}` : '/dashboard/catalogue';
          }}
          label="Pagination des prestations"
        />
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={Scissors}
        title="Catalogue"
        actions={
          <ButtonLink
            href="/dashboard/catalogue/prestations/nouvelle"
            icon={Plus}
            iconOnly="mobile"
          >
            Nouvelle prestation
          </ButtonLink>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Publiées"
          value={stats.published}
          tone="text-success"
          href="/dashboard/catalogue?status=PUBLISHED"
        />
        <StatTile
          label="Brouillons"
          value={stats.draft}
          tone="text-fg"
          href="/dashboard/catalogue?status=DRAFT"
        />
        <StatTile
          label="Archivées"
          value={stats.archived}
          tone="text-alert"
          href="/dashboard/catalogue?status=ARCHIVED"
        />
        <StatTile label="Catégories" value={stats.categories} tone="text-cacao" />
      </div>

      <Tabs
        tabs={[
          {
            id: 'prestations',
            label: `Prestations (${stats.total})`,
            content: prestationsPanel,
          },
          {
            id: 'categories',
            label: `Catégories (${stats.categories})`,
            content: (
              <div className="rounded-[var(--radius-lg)] bg-card shadow-soft">
                <CategoriesTab categories={categories} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
