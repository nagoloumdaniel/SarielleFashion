import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getBookableServiceBySlug } from '@/modules/reservations/queries';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { BookingWizard } from './booking-wizard';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Réserver un rendez-vous',
  description:
    'Réservez votre rendez-vous chez Hairstyle by Patricia : choix de la prestation, vérification capillaire, options, créneau et confirmation. Paiement sur place.',
  alternates: { canonical: '/reserver' },
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function ReserverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slug = firstValue(params.service).trim();

  // Plus de liste ici : le choix de la prestation se fait dans le catalogue.
  if (slug === '') redirect('/coiffures');

  const service = await getBookableServiceBySlug(slug);
  if (!service) notFound();
  const settings = await getCachedSalonSettings();

  return (
    <main className="page-main space-y-8">
      <Breadcrumb
        items={[
          { label: 'Accueil', href: '/' },
          { label: 'Coiffures', href: '/coiffures' },
          { label: service.name, href: `/coiffures/${service.slug}` },
          { label: 'Réserver' },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{service.categoryName}</Badge>
          <Badge tone="accent">Paiement sur place</Badge>
        </div>
        <Title as="h1" size="display" className="">
          Réserver {service.name}
        </Title>
      </header>

      <BookingWizard
        service={service}
        settings={{
          minCancelNoticeHours: settings.minCancelNoticeHours,
          holdSlotMinutes: settings.holdSlotMinutes,
          maxAdvanceDays: settings.maxAdvanceDays,
          cancelReasonRequired: settings.cancelReasonRequired,
          homeServiceEnabled: settings.homeServiceEnabled,
          travelFeeCents: settings.travelFeeCents,
        }}
      />
    </main>
  );
}
