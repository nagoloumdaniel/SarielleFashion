import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { isNotifyTokenValid } from '@/modules/liste-attente/engine';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { ConfirmForm } from './confirm-form';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Confirmer ma réservation',
  robots: { index: false, follow: false },
};

export default async function WaitlistTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const entry = await db.waitlistEntry.findUnique({
    where: { notifyToken: token },
    include: { service: { select: { slug: true, name: true } } },
  });

  if (!entry) {
    return (
      <main className="page-main">
        <div className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-8 text-center">
          <Title as="h1" size="display" className="">
            Lien invalide
          </Title>
          <p className="mt-3 text-fg">Ce lien ne correspond à aucune demande de liste d’attente.</p>
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
            {entry.status === 'CONFIRMED' ? 'Déjà confirmée' : 'Lien expiré'}
          </Title>
          <p className="mt-3 text-muted">
            {entry.status === 'CONFIRMED'
              ? 'Cette réservation a déjà été confirmée.'
              : 'Ce lien a expiré. La place a été proposée à la personne suivante sur la liste d’attente.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main">
      <div className="rounded-[var(--radius-lg)] border border-line bg-card p-8 shadow-soft">
        <Title as="h1" size="display" className="">
          Une place s’est libérée pour « {entry.service.name} »
        </Title>
        <p className="mt-2 text-muted">
          Créneau du <LocalDateTime iso={entry.desiredStartsAt.toISOString()} />.
        </p>
        <div className="mt-6">
          <ConfirmForm
            token={token}
            serviceSlug={entry.service.slug}
            startsAtISO={entry.desiredStartsAt.toISOString()}
            defaultName={entry.customerName}
            defaultEmail={entry.customerEmail}
            defaultPhone={entry.customerPhone}
          />
        </div>
      </div>
    </main>
  );
}
