import type { Metadata } from 'next';
import { Mail, Scissors } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { Link } from '@/i18n/link';
import { pageMetadata } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({
    locale,
    path: '/mentions-legales',
    title: messages.legal.imprint.meta.title,
    description: messages.legal.imprint.meta.description,
  });
}

export default async function MentionsLegalesPage() {
  const { t } = await getI18n();
  return (
    <main className="page-main space-y-12">
      <Breadcrumb
        items={[{ label: t('nav.home'), href: '/' }, { label: t('legal.imprint.title') }]}
      />

      <header className="max-w-3xl">
        <Title as="h1" size="display" className="">
          {t('legal.imprint.title')}
        </Title>
      </header>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {t('legal.imprint.publisher.title')}
        </Title>
        <dl className="space-y-4 text-muted leading-relaxed">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-page p-6 rounded-xl border border-line">
              <dt className="font-medium text-fg mb-1">{t('legal.imprint.publisher.legalName')}</dt>
              <dd>Sarielle Fashion</dd>
            </div>
            <div className="bg-page p-6 rounded-xl border border-line">
              <dt className="font-medium text-fg mb-1">{t('legal.imprint.publisher.activity')}</dt>
              <dd>{t('legal.imprint.publisher.activityValue')}</dd>
            </div>
          </div>
          <div className="bg-page p-6 rounded-xl border border-line">
            <dt className="font-medium text-fg mb-1">{t('legal.imprint.publisher.contact')}</dt>
            <dd>
              {t('legal.imprint.publisher.address')}
              <br />
              {t('legal.imprint.publisher.email')}{' '}
              <a href="mailto:sarielletalla@gmail.com" className="text-cacao underline">
                sarielletalla@gmail.com
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {t('legal.imprint.hosting.title')}
        </Title>
        <div className="bg-page p-6 rounded-xl border border-line">
          <p className="text-muted leading-relaxed">{t('legal.imprint.hosting.text')}</p>
        </div>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {t('legal.imprint.publication.title')}
        </Title>
        <p className="text-muted leading-relaxed">{t('legal.imprint.publication.text')}</p>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {t('legal.imprint.data.title')}
        </Title>
        <p className="text-muted leading-relaxed">
          {t('legal.imprint.data.before')}{' '}
          <Link href="/confidentialite" className="text-cacao underline font-medium">
            {t('legal.imprint.data.link')}
          </Link>
          {t('legal.imprint.data.after')}{' '}
          <a href="mailto:sarielletalla@gmail.com" className="text-cacao underline">
            sarielletalla@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="max-w-3xl rounded-2xl border border-line bg-page p-8 text-center md:p-10">
        <Title as="h2" className="">
          {t('legal.imprint.question')}
        </Title>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact" icon={Mail}>
            {t('legal.actions.contact')}
          </ButtonLink>
          <ButtonLink href="/coiffures" variant="secondary" icon={Scissors}>
            {t('legal.actions.catalogue')}
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
