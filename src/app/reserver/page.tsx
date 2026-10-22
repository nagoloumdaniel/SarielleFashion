import { categoryLabel } from '@/lib/catalogue';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBookableServiceBySlug } from '@/modules/reservations/queries';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { BookingWizard } from './booking-wizard';
import { Title } from '@/components/ui/Title';
import { I18nScope } from '@/i18n/client';
import { getI18n, localeRedirect } from '@/i18n/server';
import { pageMetadata } from '@/i18n/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return pageMetadata({
    locale,
    path: '/reserver',
    title: t('booking.meta.title'),
    description: t('booking.meta.description'),
  });
}

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
  if (slug === '') await localeRedirect('/coiffures');

  const service = await getBookableServiceBySlug(slug);
  if (!service) notFound();
  const settings = await getCachedSalonSettings();
  const { locale, t, messages } = await getI18n();

  return (
    <main className="page-main space-y-8">
      <Breadcrumb
        items={[
          { label: t('booking.breadcrumb.home'), href: '/' },
          { label: t('booking.breadcrumb.catalogue'), href: '/coiffures' },
          { label: service.name, href: `/coiffures/${service.slug}` },
          { label: t('booking.breadcrumb.reserve') },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{categoryLabel(locale, service.categorySlug, service.categoryName)}</Badge>
          <Badge tone="accent">{t('booking.page.paymentBadge')}</Badge>
        </div>
        <Title as="h1" size="display" className="">
          {t('booking.page.title', { name: service.name })}
        </Title>
      </header>

      <I18nScope messages={{ booking: messages.booking, compat: messages.compat }}>
        <BookingWizard
          service={service}
          settings={{
            minCancelNoticeMinutes: settings.minCancelNoticeMinutes,
            holdSlotMinutes: settings.holdSlotMinutes,
            maxAdvanceDays: settings.maxAdvanceDays,
            cancelReasonRequired: settings.cancelReasonRequired,
            homeServiceEnabled: settings.homeServiceEnabled,
            travelFeeCents: settings.travelFeeCents,
          }}
        />
      </I18nScope>
    </main>
  );
}
