import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Pagination } from '@/components/ui/Pagination';
import { db } from '@/lib/db';
import { parsePage } from '@/lib/pagination';
import { requireAdmin } from '@/modules/auth/guards';
import { listPromotions } from '@/modules/promotions/queries';
import { PromotionsClient, type PromotionRow } from './promotions-client';

export const metadata: Metadata = { title: 'Promotions - Tableau de bord' };

const day = (date: Date) => date.toISOString().slice(0, 10);

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/promotions');

  const { page: rawPage } = await searchParams;
  const [list, services] = await Promise.all([
    listPromotions(parsePage(rawPage)),
    db.service.findMany({
      select: { id: true, name: true, priceFromCents: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Données minimales et sérialisables pour le client ; la phase est calculée côté serveur.
  const now = Date.now();
  const rows: PromotionRow[] = list.items.map((promotion) => ({
    id: promotion.id,
    name: promotion.name,
    code: promotion.code,
    kind: promotion.kind,
    value: promotion.value,
    startsAt: day(promotion.startsAt),
    endsAt: day(promotion.endsAt),
    active: promotion.active,
    phase: !promotion.active
      ? 'off'
      : promotion.endsAt.getTime() < now
        ? 'ended'
        : promotion.startsAt.getTime() > now
          ? 'upcoming'
          : 'active',
    serviceIds: promotion.services.map((link) => link.service.id),
    serviceNames: promotion.services.map((link) => link.service.name),
  }));

  return (
    <>
      <PromotionsClient promotions={rows} services={services} />
      <Pagination
        page={list.page}
        totalPages={list.totalPages}
        hrefFor={(next) =>
          next > 1 ? `/dashboard/promotions?page=${next}` : '/dashboard/promotions'
        }
        label="Pagination des promotions"
      />
    </>
  );
}
