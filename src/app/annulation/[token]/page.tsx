import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { getAppointmentByCancelToken } from '@/modules/reservations/queries';
import {
  evaluateCancellationPolicy,
  isCancellationTokenValid,
} from '@/modules/reservations/policy';
import {
  APPOINTMENT_STATUS_LABELS,
  isActiveAppointmentStatus,
} from '@/modules/reservations/status';
import { getSalonSettings } from '@/modules/disponibilites/queries';
import { resolveCancellationPolicy, splitParagraphs } from '@/modules/parametres/policies';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { CancelForm } from './cancel-form';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Gérer mon rendez-vous',
  robots: { index: false, follow: false },
};

const euroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default async function AnnulationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await getAppointmentByCancelToken(token);

  if (!appointment) {
    return (
      <main className="page-main">
        <div className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-8 text-center">
          <Title as="h1" size="display" className="">
            Lien invalide
          </Title>
          <p className="mt-3 text-fg">Ce lien ne correspond à aucun rendez-vous.</p>
          <ButtonLink href="/contact" icon={Mail} className="mt-6">
            Contacter Sarielle
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
    resolveCancellationPolicy(settings.cancellationPolicy, settings.minCancelNoticeHours),
  );
  const policy = evaluateCancellationPolicy({
    startsAt: appointment.startsAt,
    now,
    minCancelNoticeHours: settings.minCancelNoticeHours,
  });

  return (
    <main className="page-main space-y-6">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Mon rendez-vous' }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{appointment.service.name}</Badge>
          <Badge tone={active ? 'success' : 'alert'}>
            {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
          </Badge>
        </div>
        <Title as="h1" size="display" className="">
          Gérer mon rendez-vous
        </Title>
      </header>

      <section className="rounded-[var(--radius-lg)] border border-line bg-card p-6 shadow-soft">
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">Date et heure</dt>
            <dd className="text-muted">
              <LocalDateTime iso={appointment.startsAt.toISOString()} />
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">Durée</dt>
            <dd className="text-muted">{appointment.durationMinutes} minutes</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">Prix</dt>
            <dd className="text-muted">
              {appointment.priceCents == null
                ? 'Prix à confirmer'
                : euroFormatter.format(appointment.priceCents / 100)}
            </dd>
          </div>
          {appointment.homeService ? (
            <>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold text-fg">Lieu</dt>
                <dd className="whitespace-pre-line text-muted">
                  À domicile{appointment.homeAddress ? `\n${appointment.homeAddress}` : ''}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold text-fg">Frais de déplacement</dt>
                <dd className="text-muted">
                  {euroFormatter.format((appointment.travelFeeCents ?? 0) / 100)}
                </dd>
              </div>
            </>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">Cliente</dt>
            <dd className="text-muted">{appointment.customer.name}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold text-fg">Paiement</dt>
            <dd className="text-muted">Sur place</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-line bg-page p-6">
        <Title as="h2" className="">
          Conditions d’annulation
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
            Lien expiré
          </Title>
          <p className="mt-2 text-fg">Ce lien n’est plus valide.</p>
          <ButtonLink href="/contact" icon={Mail} className="mt-5">
            Contacter Sarielle
          </ButtonLink>
        </section>
      ) : !active ? (
        <section className="rounded-[var(--radius-lg)] border border-line bg-page p-6">
          <Title as="h2" className="">
            Ce rendez-vous n’est plus actif
          </Title>
          <p className="mt-2 text-muted">
            Statut actuel : {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}.
            {appointment.cancelReason ? ` Motif : ${appointment.cancelReason}.` : ''}
          </p>
        </section>
      ) : !policy.allowed ? (
        <section className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-6">
          <Title as="h2" className="">
            Annulation en ligne indisponible
          </Title>
          <p className="mt-2 text-fg">{policy.message}</p>
          <ButtonLink href="/contact" icon={Mail} className="mt-5">
            Contacter Sarielle
          </ButtonLink>
        </section>
      ) : (
        <section className="rounded-[var(--radius-lg)] border border-line bg-card p-6 shadow-soft">
          <Title as="h2" className="">
            Annuler ce rendez-vous
          </Title>
          <p className="mt-2 text-sm text-muted">{policy.message}</p>
          <div className="mt-4">
            <CancelForm token={token} reasonRequired={settings.cancelReasonRequired} />
          </div>
        </section>
      )}
    </main>
  );
}
