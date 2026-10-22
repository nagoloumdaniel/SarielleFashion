import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { getAppointmentByCancelToken } from '@/modules/reservations/queries';
import {
  cancellationPolicyMessage,
  evaluateCancellationPolicy,
  isCancellationTokenValid,
} from '@/modules/reservations/policy';
import { isActiveAppointmentStatus } from '@/modules/reservations/status';
import { getSalonSettings } from '@/modules/disponibilites/queries';
import { resolveCancellationPolicy, splitParagraphs } from '@/modules/parametres/policies';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { CancelForm } from './cancel-form';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { I18nScope } from '@/i18n/client';
import { formatDuration, formatEuro } from '@/i18n/format';
import { getI18n } from '@/i18n/server';
import { pageMetadata } from '@/i18n/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return pageMetadata({
    locale,
    path: '/annulation',
    title: t('booking.cancel.meta.title'),
    description: t('booking.cancel.meta.title'),
    noindex: true,
  });
}

export default async function AnnulationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t, locale, messages } = await getI18n();
  const appointment = await getAppointmentByCancelToken(token);

  if (!appointment) {
    return (
      <main className="page-main">
        <div className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-8 text-center">
          <Title as="h1" size="display" className="">
            {t('booking.cancel.invalidTitle')}
          </Title>
          <p className="mt-3 text-fg">{t('booking.cancel.invalidText')}</p>
          <ButtonLink href="/contact" icon={Mail} className="mt-6">
            {t('booking.cancel.contactCta')}
          </ButtonLink>
        </div>
      </main>
    );
  }

  const settings = await getSalonSettings();
  const now = new Date();
  const tokenValid = isCancellationTokenValid(appointment.cancelTokenExpiresAt, now);
  const active = isActiveAppointmentStatus(appointment.status);
  const policyParagraphs = splitParagraphs(
    resolveCancellationPolicy(settings.cancellationPolicy, settings.minCancelNoticeMinutes),
  );
  const policy = evaluateCancellationPolicy({
    startsAt: appointment.startsAt,
    now,
    minCancelNoticeMinutes: settings.minCancelNoticeMinutes,
  });

  const policyMessage = cancellationPolicyMessage(t, policy);

  return (
    <main className="page-main space-y-6">
      <Breadcrumb
        items={[
          { label: t('booking.breadcrumb.home'), href: '/' },
          { label: t('booking.cancel.breadcrumbCurrent') },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{appointment.service.name}</Badge>
          <Badge tone={active ? 'success' : 'alert'}>
            {t(`booking.status.${appointment.status}`)}
          </Badge>
        </div>
        <Title as="h1" size="display" className="">
          {t('booking.cancel.pageTitle')}
        </Title>
      </header>

      <section className="rounded-[var(--radius-lg)] border border-line bg-card p-6 shadow-soft">
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">{t('booking.cancel.dateTime')}</dt>
            <dd className="text-muted">
              <LocalDateTime iso={appointment.startsAt.toISOString()} />
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">{t('booking.cancel.duration')}</dt>
            <dd className="text-muted">{formatDuration(locale, appointment.durationMinutes)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">{t('booking.cancel.price')}</dt>
            <dd className="text-muted">
              {appointment.priceCents == null
                ? t('booking.priceToConfirm')
                : formatEuro(locale, appointment.priceCents)}
            </dd>
          </div>
          {appointment.homeService ? (
            <>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold text-fg">{t('booking.cancel.place')}</dt>
                <dd className="whitespace-pre-line text-muted">
                  {t('booking.cancel.atHome')}
                  {appointment.homeAddress ? `\n${appointment.homeAddress}` : ''}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold text-fg">{t('booking.cancel.travelFee')}</dt>
                <dd className="text-muted">
                  {formatEuro(locale, appointment.travelFeeCents ?? 0)}
                </dd>
              </div>
            </>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">{t('booking.cancel.customer')}</dt>
            <dd className="text-muted">{appointment.customer.name}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">{t('booking.cancel.payment')}</dt>
            <dd className="text-muted">{t('booking.cancel.paymentValue')}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-line bg-page p-6">
        <Title as="h2" className="">
          {t('booking.cancel.policyTitle')}
        </Title>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          {policyParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {!tokenValid ? (
        <section className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-6">
          <Title as="h2" className="">
            {t('booking.cancel.expiredTitle')}
          </Title>
          <p className="mt-2 text-fg">{t('booking.cancel.expiredText')}</p>
          <ButtonLink href="/contact" icon={Mail} className="mt-5">
            {t('booking.cancel.contactCta')}
          </ButtonLink>
        </section>
      ) : !active ? (
        <section className="rounded-[var(--radius-lg)] border border-line bg-page p-6">
          <Title as="h2" className="">
            {t('booking.cancel.inactiveTitle')}
          </Title>
          <p className="mt-2 text-muted">
            {t('booking.cancel.currentStatus', {
              status: t(`booking.status.${appointment.status}`),
            })}
            {appointment.cancelReason
              ? t('booking.cancel.reasonLine', { reason: appointment.cancelReason })
              : ''}
          </p>
        </section>
      ) : !policy.allowed ? (
        <section className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-6">
          <Title as="h2" className="">
            {t('booking.cancel.closedTitle')}
          </Title>
          <p className="mt-2 text-fg">{policyMessage}</p>
          <ButtonLink href="/contact" icon={Mail} className="mt-5">
            {t('booking.cancel.contactCta')}
          </ButtonLink>
        </section>
      ) : (
        <section className="rounded-[var(--radius-lg)] border border-line bg-card p-6 shadow-soft">
          <Title as="h2" className="">
            {t('booking.cancel.cancelTitle')}
          </Title>
          <p className="mt-2 text-sm text-muted">{policyMessage}</p>
          <div className="mt-4">
            <I18nScope messages={{ booking: messages.booking }}>
              <CancelForm token={token} reasonRequired={settings.cancelReasonRequired} />
            </I18nScope>
          </div>
        </section>
      )}
    </main>
  );
}
