import { Star } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import { listReviewsForAdmin } from '@/modules/avis/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { parsePage } from '@/lib/pagination';
import { AvisClient } from './avis-client';

export const metadata: Metadata = { title: 'Avis - Tableau de bord' };

export default async function AvisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/avis');

  const { page: rawPage } = await searchParams;
  const result = await listReviewsForAdmin(parsePage(rawPage));

  return (
    <div>
      <PageHeader
        icon={Star}
        title="Avis clients"
        description={
          result.total > 0
            ? `${result.total} avis publié${result.total > 1 ? 's' : ''}. Les avis apparaissent sur le site dès leur envoi : supprime ceux qui ne conviennent pas.`
            : 'Les avis apparaissent sur le site dès leur envoi.'
        }
      />

      {result.items.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Aucun avis"
          message="Les avis laissés depuis les fiches prestations ou par e-mail apparaîtront ici."
        />
      ) : (
        <AvisClient reviews={result.items} />
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(next) => (next > 1 ? `/dashboard/avis?page=${next}` : '/dashboard/avis')}
        label="Pagination des avis"
      />
    </div>
  );
}
