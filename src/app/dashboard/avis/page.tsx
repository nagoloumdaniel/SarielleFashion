import { Star } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import {
  MODERATION_FILTERS,
  countReviewsByStatus,
  listReviewsForModeration,
  type ModerationFilter,
} from '@/modules/avis/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterChips } from '@/components/ui/FilterChips';
import { Pagination } from '@/components/ui/Pagination';
import { parsePage } from '@/lib/pagination';
import { AvisClient } from './avis-client';

export const metadata: Metadata = { title: 'Avis - Tableau de bord' };

const LABELS: Record<ModerationFilter, string> = {
  SUBMITTED: 'En attente',
  APPROVED: 'Publiés',
  REJECTED: 'Rejetés',
};

const EMPTY: Record<ModerationFilter, string> = {
  SUBMITTED: 'Aucun avis en attente de modération.',
  APPROVED: 'Aucun avis publié pour le moment.',
  REJECTED: 'Aucun avis rejeté.',
};

export default async function AvisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/avis');

  const { status: rawStatus, page: rawPage } = await searchParams;
  const requested = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const status: ModerationFilter = MODERATION_FILTERS.includes(requested as ModerationFilter)
    ? (requested as ModerationFilter)
    : 'SUBMITTED';

  const [result, counts] = await Promise.all([
    listReviewsForModeration(status, parsePage(rawPage)),
    countReviewsByStatus(),
  ]);

  return (
    <div>
      <PageHeader
        icon={Star}
        title="Avis clients"
        description="Rien n’est visible sur le site avant approbation."
      />

      <FilterChips
        label="Filtrer par statut de modération"
        items={MODERATION_FILTERS.map((item) => ({
          href: item === 'SUBMITTED' ? '/dashboard/avis' : `/dashboard/avis?status=${item}`,
          label: LABELS[item],
          count: counts[item],
          active: status === item,
        }))}
      />

      {result.items.length === 0 ? (
        <EmptyState variant="compact" title="Aucun avis" message={EMPTY[status]} />
      ) : (
        <AvisClient
          reviews={result.items.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            status: review.status,
            submittedAt: review.submittedAt?.toISOString() ?? null,
            customer: review.customer,
            service: review.service,
          }))}
        />
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(next) => {
          const query = new URLSearchParams();
          if (status !== 'SUBMITTED') query.set('status', status);
          if (next > 1) query.set('page', String(next));
          const value = query.toString();
          return value ? `/dashboard/avis?${value}` : '/dashboard/avis';
        }}
        label="Pagination des avis"
      />
    </div>
  );
}
