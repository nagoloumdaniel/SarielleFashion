import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { WaitlistForm } from './waitlist-form';
import { Title } from '@/components/ui/Title';
import { I18nScope } from '@/i18n/client';
import { getI18n } from '@/i18n/server';
import { pageMetadata } from '@/i18n/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return pageMetadata({
    locale,
    path: '/liste-attente',
    title: t('waitlist.meta.title'),
    description: t('waitlist.meta.description'),
    noindex: true,
  });
}

export default async function ListeAttentePage() {
  const { t, messages } = await getI18n();
  const services = await db.service.findMany({
    where: { status: 'PUBLISHED', category: { active: true } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="page-main">
      <Title as="h1" size="display" className="">
        {t('waitlist.title')}
      </Title>
      <p className="mt-2 text-muted">{t('waitlist.intro')}</p>
      <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-card p-8 shadow-soft">
        <I18nScope messages={{ waitlist: messages.waitlist }}>
          <WaitlistForm services={services} />
        </I18nScope>
      </div>
    </main>
  );
}
