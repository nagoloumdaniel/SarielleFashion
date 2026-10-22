import { CalendarDays, CalendarCheck, House, Mail, MapPin, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import { getAppointmentDetail } from '@/modules/reservations/queries';
import { formatDuration, formatFcfa, formatFcfaOrPending } from '@/modules/reservations/format';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONES } from '@/modules/reservations/status';
import { bookingReference } from '@/modules/reservations/schemas';
import { listAuditLogsForEntity } from '@/modules/stats/audit';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackButton } from '@/components/shared/BackButton';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppointmentActions } from './appointment-actions';

export const metadata: Metadata = { title: 'Rendez-vous - Tableau de bord' };

const ACTION_LABELS: Record<string, string> = {
  'appointment.create': 'Réservation créée',
  'appointment.confirmed': 'Rendez-vous confirmé',
  'appointment.completed': 'Rendez-vous terminé',
  'appointment.no_show': 'Cliente absente',
  'appointment.cancel_admin': 'Annulation par Patricia',
  'appointment.cancel_customer': 'Annulation par la cliente',
  'appointment.reschedule': 'Reprogrammation',
  'appointment.auto_expire': 'Libération automatique du créneau',
};

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (value == null || value === '') return 'Non renseigné';
  return String(value);
}

/* « hairLength » / « hair_length » -> « Hair length » (clé technique des réponses). */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!user) redirect(`/connexion?callbackUrl=/dashboard/reservations/${id}`);

  const [appointment, history] = await Promise.all([
    getAppointmentDetail(id),
    listAuditLogsForEntity('Appointment', id),
  ]);
  if (!appointment) notFound();

  return (
    <div>
      <PageHeader
        icon={CalendarCheck}
        back={<BackButton fallbackHref="/dashboard/reservations" />}
        title={`Réservation ${bookingReference(appointment.id)}`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone={APPOINTMENT_STATUS_TONES[appointment.status]}>
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>
            <span>
              <LocalDateTime iso={appointment.startsAt.toISOString()} dateStyle="long" /> ·{' '}
              {appointment.service.name}
            </span>
          </span>
        }
        actions={
          <ButtonLink
            href="/dashboard/calendrier"
            variant="secondary"
            icon={CalendarDays}
            iconOnly="mobile"
          >
            Calendrier
          </ButtonLink>
        }
      />

      {appointment.holdExpiresAt ? (
        <p className="mb-3 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-sm text-fg">
          Créneau réservé temporairement jusqu’à{' '}
          <LocalDateTime iso={appointment.holdExpiresAt.toISOString()} timeStyle="short" />.
          Confirmez-le avant pour ne pas le perdre.
        </p>
      ) : null}

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <div className="grid gap-3">
          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Actions</h2>
            <div className="mt-3">
              <AppointmentActions appointmentId={appointment.id} status={appointment.status} />
            </div>
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Cliente</h2>
            <p className="mt-2 font-semibold">{appointment.customer.name}</p>
            <ul className="mt-2 grid gap-1.5 text-sm">
              <li>
                <a
                  href={`mailto:${appointment.customer.email}`}
                  className="inline-flex items-center gap-2 text-accent underline-offset-4 hover:underline"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  {appointment.customer.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${appointment.customer.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-2 text-accent underline-offset-4 hover:underline"
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {appointment.customer.phone}
                </a>
              </li>
            </ul>
          </Card>
        </div>

        <div className="grid gap-3">
          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Réservation</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold">Prestation</dt>
                <dd className="text-muted">{appointment.service.name}</dd>
              </div>
              {appointment.homeService ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="font-semibold">Lieu</dt>
                    <dd>
                      <Badge tone="accent">
                        <House aria-hidden="true" className="mr-1 size-3.5" />À domicile
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="flex items-center gap-1.5 font-semibold">
                      <MapPin aria-hidden="true" className="size-4 text-accent" />
                      Adresse
                    </dt>
                    <dd className="whitespace-pre-line text-muted">
                      {appointment.homeAddress ?? 'Non renseignée'}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="font-semibold">Frais de déplacement</dt>
                    <dd className="text-muted">{formatFcfa(appointment.travelFeeCents ?? 0)}</dd>
                  </div>
                </>
              ) : null}
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold">
                  {appointment.homeService ? 'Total figé (frais inclus)' : 'Prix figé'}
                </dt>
                <dd className="text-muted">{formatFcfaOrPending(appointment.priceCents)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold">Durée figée</dt>
                <dd className="text-muted">{formatDuration(appointment.durationMinutes)}</dd>
              </div>
              {appointment.selectedOptions.length > 0 ? (
                <div>
                  <dt className="font-semibold">Options</dt>
                  <dd className="mt-1 space-y-1 text-muted">
                    {appointment.selectedOptions.map((option) => (
                      <p key={option.optionId}>
                        {option.name} (+{formatFcfa(option.priceCents)})
                      </p>
                    ))}
                  </dd>
                </div>
              ) : null}
              {appointment.comments ? (
                <div>
                  <dt className="font-semibold">Commentaire</dt>
                  <dd className="mt-1 whitespace-pre-line text-muted">{appointment.comments}</dd>
                </div>
              ) : null}
              {appointment.rescheduledFrom ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="font-semibold">Ancien créneau</dt>
                  <dd className="text-muted">
                    <LocalDateTime iso={appointment.rescheduledFrom.toISOString()} />
                  </dd>
                </div>
              ) : null}
              {appointment.cancelledAt ? (
                <div className="rounded-[var(--radius-sm)] bg-alert-soft px-3 py-2 text-alert">
                  Annulé le <LocalDateTime iso={appointment.cancelledAt.toISOString()} />
                  {appointment.cancelReason ? ` · Motif : ${appointment.cancelReason}` : ''}
                </div>
              ) : null}
            </dl>
            {appointment.cancelToken ? (
              <p className="mt-3 text-sm">
                <Link
                  href={`/annulation/${appointment.cancelToken}`}
                  prefetch={false}
                  className="font-semibold text-accent underline-offset-4 hover:underline"
                >
                  Page d’annulation de la cliente
                </Link>
              </p>
            ) : null}
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Informations capillaires</h2>
            {Object.keys(appointment.hairInfo).length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aucune réponse enregistrée.</p>
            ) : (
              <dl className="mt-3 divide-y divide-line text-sm">
                {Object.entries(appointment.hairInfo).map(([key, value]) => (
                  <div key={key} className="flex flex-wrap justify-between gap-2 py-2">
                    <dt className="font-semibold text-fg">{humanizeKey(key)}</dt>
                    <dd className="text-muted">{formatAnswer(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Historique</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aucune action enregistrée.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-fg">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    <p className="text-xs text-muted">
                      <LocalDateTime iso={entry.createdAt.toISOString()} />
                      {entry.userName ? ` · ${entry.userName}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
