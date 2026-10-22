import { CalendarCheck, ChevronRight, ImagePlus, Lock, PenLine, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { Link } from '@/i18n/link';
import { I18nScope } from '@/i18n/client';
import { getI18n } from '@/i18n/server';
import { pageMetadata } from '@/i18n/metadata';
import { CustomRequestForm } from './custom-request-form';
import { Title } from '@/components/ui/Title';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({ locale, path: '/demandes-personnalisees', ...messages.requests.meta });
}

const STEP_ICONS = [PenLine, ShieldCheck, CalendarCheck] as const;

export default async function CustomRequestPage() {
  const { t, messages } = await getI18n();
  return (
    <main className="page-main space-y-10">
      <nav aria-label={t('common.breadcrumb')} className="text-sm text-ink-soft">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="transition hover:text-cacao">
              {t('nav.home')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <span aria-current="page" className="font-medium text-fg">
              {t('requests.breadcrumb')}
            </span>
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl space-y-4">
        <Title as="h1" size="display">
          {t('requests.h1')}
        </Title>
        <p className="text-base leading-relaxed text-ink-soft md:text-lg">{t('requests.intro')}</p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <section className="order-2 lg:order-1" aria-labelledby="formulaire-demande">
          <Title as="h2" id="formulaire-demande">
            {t('requests.formTitle')}
          </Title>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <Lock aria-hidden="true" className="size-4 shrink-0 text-cacao" />
            {t('requests.noBooking')}
          </p>
          <div className="mt-5">
            <I18nScope messages={{ requests: messages.requests }}>
              <CustomRequestForm />
            </I18nScope>
          </div>
        </section>

        <aside
          aria-label={t('requests.asideAria')}
          className="order-1 space-y-5 rounded-[var(--radius-lg)] bg-gradient-soft p-6 sm:p-8 lg:order-2"
        >
          <h2 className="font-heading text-xl font-bold text-fg">{t('requests.asideTitle')}</h2>
          <ol className="space-y-5">
            {messages.requests.steps.map(({ title, text }, index) => {
              const Icon = STEP_ICONS[index] ?? PenLine;
              return (
                <li key={title} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-cacao shadow-soft">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-fg">{title}</p>
                    <p className="text-sm text-ink-soft">{text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="flex items-start gap-2 border-t border-line pt-4 text-sm text-ink-soft">
            <ImagePlus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cacao" />
            {t('requests.photoTip')}
          </p>
        </aside>
      </div>
    </main>
  );
}
