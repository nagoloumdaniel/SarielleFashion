import { Mail, Scissors } from 'lucide-react';
import type { Metadata } from 'next';
import { Accordion } from '@/components/ui/Accordion';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { formatEuro } from '@/i18n/format';
import { pageMetadata } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqJsonLd } from '@/lib/seo-jsonld';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({
    locale,
    path: '/faq',
    title: messages.faq.meta.title,
    description: messages.faq.meta.description,
  });
}

/* L'option à domicile n'apparaît que si Sarielle l'a activée (paramètres du dashboard). */
async function loadHomeServiceItem(
  locale: 'fr' | 'de',
  t: Awaited<ReturnType<typeof getI18n>>['t'],
) {
  try {
    const settings = await getCachedSalonSettings();
    if (!settings.homeServiceEnabled) return [];
    const sentence =
      settings.travelFeeCents > 0
        ? t('info.homeService.withFee', { fee: formatEuro(locale, settings.travelFeeCents) })
        : t('info.homeService.free');
    return [
      {
        id: 'domicile',
        title: t('faq.homeService.title'),
        content: `${sentence} ${t('faq.homeService.suffix')}`,
      },
    ];
  } catch (error) {
    console.error('[faq] paramètres illisibles, option à domicile masquée', error);
    return [];
  }
}

export default async function FaqPage() {
  const { t, locale, messages } = await getI18n();
  const { faq } = messages;
  const items = [
    ...faq.items,
    {
      id: 'paiement',
      title: faq.payment.title,
      content: `${messages.info.payment.sentence} ${faq.payment.suffix}`,
    },
    { id: 'annulation', title: faq.cancellation.title, content: faq.cancellation.content },
    { id: 'options', title: faq.options.title, content: faq.options.content },
    ...(await loadHomeServiceItem(locale, t)),
  ];
  return (
    <main className="page-main space-y-12">
      <JsonLd
        data={faqJsonLd(
          locale,
          items.map((item) => ({ question: item.title, answer: item.content })),
        )}
      />
      <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: faq.breadcrumb }]} />

      <header className="max-w-3xl">
        <Title as="h1" size="display" className="">
          {faq.title}
        </Title>
      </header>

      <section aria-labelledby="faq-titre">
        <h2 id="faq-titre" className="sr-only">
          {faq.listLabel}
        </h2>
        <Accordion items={items} />
      </section>

      <section className="mx-auto w-full max-w-3xl rounded-2xl bg-page p-8 text-center md:p-10">
        <Title as="h2" className="">
          {faq.other}
        </Title>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact" icon={Mail}>
            {faq.contact}
          </ButtonLink>
          <ButtonLink href="/coiffures" variant="secondary" icon={Scissors}>
            {faq.catalogue}
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
