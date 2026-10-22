import { CalendarCheck, ChevronRight, Clock, MailCheck, MapPin, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

import { Link } from '@/i18n/link';
import { I18nScope } from '@/i18n/client';
import { getI18n } from '@/i18n/server';
import { pageMetadata } from '@/i18n/metadata';
import type { Locale } from '@/i18n/config';

import { ContactForm } from './ContactForm';
import { getPublicHoursLines } from '@/lib/public-hours';
import { SocialLinks } from '@/components/layout/SocialLinks';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({ locale, path: '/contact', ...messages.contact.meta });
}

const DAYS_DE: Record<string, string> = {
  Lundi: 'Montag',
  Mardi: 'Dienstag',
  Mercredi: 'Mittwoch',
  Jeudi: 'Donnerstag',
  Vendredi: 'Freitag',
  Samedi: 'Samstag',
  Dimanche: 'Sonntag',
};

/** Les lignes d'horaires sont produites en français : on les met en forme pour l'allemand. */
function localizeHours(locale: Locale, lines: string[]): string[] {
  if (locale === 'fr') return lines;
  return lines.map((line) =>
    line
      .replace(/Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche/g, (d) => DAYS_DE[d] ?? d)
      .replace(/(\d+)h(\d{2})?/g, (_, h: string, m?: string) => `${h}:${m ?? '00'}`)
      .replace(/(\d+:\d{2}) - (\d+:\d{2})/, '$1 - $2 Uhr'),
  );
}

export default async function ContactPage() {
  const { t, locale, messages } = await getI18n();
  const hoursLines = localizeHours(locale, await getPublicHoursLines());
  const INFOS = [
    { Icon: MailCheck, ...messages.contact.infos.reply },
    { Icon: MapPin, ...messages.contact.infos.appointment },
  ];
  return (
    <main className="page-main space-y-10">
      <nav aria-label={t('common.breadcrumb')} className="text-sm text-muted">
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
              {t('nav.contact')}
            </span>
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl space-y-4">
        <Title as="h1" size="display">
          {t('contact.h1')}
        </Title>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <section aria-label={t('contact.formAria')} className="order-2 lg:order-1">
          <I18nScope messages={{ contact: messages.contact }}>
            <ContactForm />
          </I18nScope>
        </section>

        <aside
          aria-label={t('contact.infoAria')}
          className="order-1 space-y-6 rounded-[var(--radius-lg)] bg-gradient-soft p-6 sm:p-8 lg:order-2"
        >
          <h2 className="font-heading text-xl font-bold text-fg">{t('contact.infoTitle')}</h2>
          <ul className="space-y-5">
            {INFOS.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-cacao shadow-soft">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-fg">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
            <li className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-cacao shadow-soft">
                <Clock aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-fg">{t('contact.hours')}</p>
                {hoursLines.map((line) => (
                  <p key={line} className="text-sm text-muted">
                    {line}
                  </p>
                ))}
                <p className="text-sm text-muted">{t('contact.hoursNote')}</p>
              </div>
            </li>
          </ul>

          <div className="border-t border-line pt-5">
            <div className="flex flex-col gap-2">
              <ButtonLink href="/coiffures" icon={CalendarCheck} className="w-full">
                {t('contact.book')}
              </ButtonLink>
              <ButtonLink
                href="/demandes-personnalisees"
                variant="secondary"
                icon={Sparkles}
                className="w-full"
              >
                {t('contact.custom')}
              </ButtonLink>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-muted">{t('contact.follow')}</p>
            <SocialLinks />
          </div>
        </aside>
      </div>
    </main>
  );
}
