import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { isNotifyTokenValid } from '@/modules/liste-attente/engine';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { ConfirmForm } from './confirm-form';
import { Title } from '@/components/ui/Title';
import { I18nScope } from '@/i18n/client';
import { getI18n } from '@/i18n/server';
import { pageMetadata } from '@/i18n/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return pageMetadata({
    locale,
    path: '/liste-attente',
    title: t('waitlist.confirm.meta.title'),
    description: t('waitlist.confirm.meta.title'),
    noindex: true,
  });
}

export default async function WaitlistTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { t, messages } = await getI18n();
  const entry = await db.waitlistEntry.findUnique({
    where: { notifyToken: token },
    include: { service: { select: { slug: true, name: true } } },
  });

  if (!entry) {
    return (
      <main className="page-main">
        <div className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-8 text-center">
          <Title as="h1" size="display" className="">
            {t('waitlist.confirm.invalidTitle')}
          </Title>
          <p className="mt-3 text-fg">{t('waitlist.confirm.invalidText')}</p>
        </div>
      </main>
    );
  }

  const valid =
    entry.status === 'NOTIFIED' && isNotifyTokenValid(entry.notifyTokenExpiresAt, new Date());

  if (!valid) {
    return (
      <main className="page-main">
        <div className="rounded-[var(--radius-lg)] border border-line bg-card p-8 text-center">
          <Title as="h1" size="display" className="">
            {entry.status === 'CONFIRMED'
              ? t('waitlist.confirm.alreadyTitle')
              : t('waitlist.confirm.expiredTitle')}
          </Title>
          <p className="mt-3 text-muted">
            {entry.status === 'CONFIRMED'
              ? t('waitlist.confirm.alreadyText')
              : t('waitlist.confirm.expiredText')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main">
      <div className="rounded-[var(--radius-lg)] border border-line bg-card p-8 shadow-soft">
        <Title as="h1" size="display" className="">
          {t('waitlist.confirm.freedTitle', { service: entry.service.name })}
        </Title>
        <p className="mt-2 text-muted">
          {t('waitlist.confirm.slotBefore')}{' '}
          <LocalDateTime iso={entry.desiredStartsAt.toISOString()} />.
        </p>
        <div className="mt-6">
          <I18nScope messages={{ waitlist: messages.waitlist }}>
            <ConfirmForm
              token={token}
              serviceSlug={entry.service.slug}
              startsAtISO={entry.desiredStartsAt.toISOString()}
              defaultName={entry.customerName}
              defaultEmail={entry.customerEmail}
              defaultPhone={entry.customerPhone}
            />
          </I18nScope>
        </div>
      </div>
    </main>
  );
}
