import { CalendarCheck, Check, HandCoins, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { formatOpeningHoursLocale } from '@/i18n/hours';
import { formatEuro } from '@/i18n/format';
import { pageMetadata } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { DEFAULT_SALON_SETTINGS, type SalonSettingsData } from '@/modules/disponibilites/queries';
import { resolveBookingPolicy, splitParagraphs } from '@/modules/parametres/policies';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({
    locale,
    path: '/infos-pratiques',
    title: messages.info.meta.title,
    description: messages.info.meta.description,
  });
}

const DEFAULT_CONTACT_EMAIL = 'sarielletalla@gmail.com';

async function loadSettings(): Promise<SalonSettingsData> {
  try {
    return await getCachedSalonSettings();
  } catch (error) {
    console.error('[infos-pratiques] paramètres illisibles, valeurs par défaut', error);
    return DEFAULT_SALON_SETTINGS;
  }
}

export default async function InfosPratiquesPage() {
  const { t, locale, messages } = await getI18n();
  const settings = await loadSettings();

  /* Délai d'annulation lisible : « 30 minutes », « 1 heure », « 1 h 30 » (fr) / « 1 Std. 30 Min. » (de). */
  const formatDelay = (minutes: number): string => {
    const total = Math.max(0, Math.round(minutes));
    if (total < 60) return t('info.delay.minutes', { count: total });
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    if (rest === 0) return t('info.delay.hours', { count: hours });
    return t('info.delay.hoursMinutes', { h: hours, m: String(rest).padStart(2, '0') });
  };

  const addressLines = (settings.address?.trim() || messages.info.contact.defaultAddress)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hoursLines = formatOpeningHoursLocale(settings.openingHours, locale);
  const customCancellation = settings.cancellationPolicy?.trim() ?? '';
  const delay =
    settings.minCancelNoticeMinutes > 0
      ? formatDelay(settings.minCancelNoticeMinutes)
      : t('info.cancellation.noDelay');
  const cancellationRules = customCancellation
    ? null
    : (['onTime', 'late', 'absence', 'bySarielle'] as const).map((key) => ({
        label: messages.info.cancellation[key].label,
        description: messages.info.cancellation[key].description.replace('{delay}', delay),
      }));
  // Texte saisi par Sarielle : conservé tel quel ; sinon texte par défaut dans la langue de la page.
  const bookingParagraphs = splitParagraphs(
    settings.bookingPolicy?.trim()
      ? resolveBookingPolicy(settings.bookingPolicy)
      : messages.info.booking.defaultPolicy,
  );
  const homeServiceText =
    settings.travelFeeCents > 0
      ? t('info.homeService.withFee', { fee: formatEuro(locale, settings.travelFeeCents) })
      : t('info.homeService.free');

  return (
    <main className="page-main space-y-12">
      <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('info.title') }]} />

      <header className="max-w-3xl">
        <Title as="h1" size="display" className="">
          {t('info.title')}
        </Title>
      </header>

      {/* Coordonnées et horaires */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-6 rounded-2xl bg-card p-8 shadow-soft">
          <Title as="h2" className="">
            {t('info.contact.title')}
          </Title>
          <p className="text-muted">
            <span className="font-semibold text-fg">{t('info.contact.address')}</span>
            <br />
            {addressLines.map((line, index) => (
              <span key={line}>
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
          {settings.homeServiceEnabled ? (
            <p className="text-muted">
              <span className="font-semibold text-fg">{t('info.contact.homeService')}</span>
              <br />
              {homeServiceText}
            </p>
          ) : null}
          <p className="text-muted">
            <span className="font-semibold text-fg">{t('info.contact.email')}</span>
            <br />
            {settings.contactEmail || DEFAULT_CONTACT_EMAIL}
          </p>
        </div>
        <div className="space-y-6 rounded-2xl bg-card p-8 shadow-soft">
          <Title as="h2" className="">
            {t('info.hours.title')}
          </Title>
          {hoursLines.map((line) => (
            <p key={line} className="text-muted">
              {line}
            </p>
          ))}
          <p className="text-muted">{t('info.hours.note')}</p>
        </div>
      </section>

      {/* Préparation */}
      <section className="space-y-6">
        <Title as="h2" className="">
          {t('info.preparation.title')}
        </Title>
        <ul className="max-w-3xl space-y-3">
          {messages.info.preparation.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-muted">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Paiement : toujours sur place, espèces ou virement */}
      <section className="space-y-6">
        <Title as="h2" className="">
          {t('info.payment.title')}
        </Title>
        <div className="flex max-w-3xl items-start gap-3 border-l-4 border-accent pl-5">
          <HandCoins aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" />
          <p className="leading-relaxed text-muted">{t('info.payment.sentence')}</p>
        </div>
      </section>

      {/* Conditions de réservation (paramètre « bookingPolicy » ou texte par défaut) */}
      <section className="space-y-6">
        <Title as="h2" className="">
          {t('info.booking.title')}
        </Title>
        <div className="max-w-3xl space-y-3 border-l-4 border-accent pl-5">
          {bookingParagraphs.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Politique d'annulation (paramètre « cancellationPolicy » ou règles par défaut) */}
      <section className="space-y-6">
        <Title as="h2" className="">
          {t('info.cancellation.title')}
        </Title>
        {cancellationRules ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {cancellationRules.map((rule) => (
              <div key={rule.label} className="border-l-4 border-accent pl-5">
                <h3 className="font-heading text-xl font-bold text-fg">{rule.label}</h3>
                <p className="mt-1 leading-relaxed text-muted">{rule.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-3xl space-y-3 border-l-4 border-accent pl-5">
            {splitParagraphs(customCancellation).map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-page p-8 text-center md:p-10">
        <Title as="h2" className="">
          {t('info.question.title')}
        </Title>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact" icon={Mail}>
            {t('info.question.contact')}
          </ButtonLink>
          <ButtonLink href="/coiffures" variant="secondary" icon={CalendarCheck}>
            {t('info.question.book')}
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
