import { CalendarClock, CalendarDays, ClipboardList, House } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { AppointmentStatus } from '@prisma/client';
import { requireAdmin } from '@/modules/auth/guards';
import { countAppointmentsByStatus, listAppointmentsAdmin } from '@/modules/reservations/queries';
import { formatDuration, formatEuro, formatEuroOrPending } from '@/modules/reservations/format';
import {
  APPOINTMENT_STATUS_SHORT_LABELS,
  APPOINTMENT_STATUS_TONES,
} from '@/modules/reservations/status';
import { PageHeader } from '@/components/layout/PageHeader';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { CardLink } from '@/components/ui/Card';
import { FilterChips } from '@/components/ui/FilterChips';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = { title: 'Réservations - Tableau de bord' };

const STATUSES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'RESCHEDULED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_ADMIN',
];

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function pageHref(status: string, page: number, all: boolean): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  if (all) params.set('all', '1');
  const query = params.toString();
  return query ? `/dashboard/reservations?${query}` : '/dashboard/reservations';
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/reservations');

  const params = await searchParams;
  const rawStatus = firstValue(params.status);
  const status = (STATUSES.includes(rawStatus as AppointmentStatus) ? rawStatus : '') as
    AppointmentStatus | '';
  // Un filtre de statut (terminées, annulées…) porte sur tout l'historique.
  const all = firstValue(params.all) === '1' || Boolean(status);
  const rawPage = Number.parseInt(firstValue(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [counts, result] = await Promise.all([
    countAppointmentsByStatus(),
    listAppointmentsAdmin({ status: status || undefined, page, upcomingOnly: !all }),
  ]);
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Réservations"
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

      <FilterChips
        label="Filtres des réservations"
        items={[
          { href: pageHref('', 1, false), label: 'À venir', active: !all },
          {
            href: pageHref('', 1, true),
            label: 'Tout',
            count: totalCount,
            active: !status && all,
          },
          ...STATUSES.map((item) => ({
            href: pageHref(item, 1, true),
            label: APPOINTMENT_STATUS_SHORT_LABELS[item],
            count: counts[item] ?? 0,
            active: status === item,
          })),
        ]}
      />

      {result.items.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Aucune réservation"
          message={
            status || all
              ? 'Aucun rendez-vous ne correspond à ce filtre.'
              : 'Aucun rendez-vous à venir. Les nouvelles réservations apparaîtront ici.'
          }
        />
      ) : (
        <ul className="grid gap-2">
          {result.items.map((appointment) => (
            <li key={appointment.id}>
              <CardLink
                href={`/dashboard/reservations/${appointment.id}`}
                label={`Réservation de ${appointment.customerName}, ${appointment.serviceName}`}
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{appointment.customerName}</p>
                    <p className="truncate text-sm text-muted">
                      {appointment.serviceName} · {formatDuration(appointment.durationMinutes)} ·{' '}
                      {formatEuroOrPending(appointment.priceCents)}
                    </p>
                    {appointment.homeService ? (
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted">
                        <Badge tone="accent" size="sm" className="shrink-0">
                          <House aria-hidden="true" className="mr-1 size-3" />À domicile
                        </Badge>
                        <span className="truncate">
                          {appointment.homeAddress ?? 'Adresse non renseignée'} · déplacement{' '}
                          {formatEuro(appointment.travelFeeCents ?? 0)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <span className="flex items-center gap-1.5 text-sm text-muted">
                      <CalendarClock aria-hidden="true" className="size-4 text-accent" />
                      <LocalDateTime
                        iso={appointment.startsAt.toISOString()}
                        dateStyle="medium"
                        timeStyle="short"
                      />
                    </span>
                    <Badge tone={APPOINTMENT_STATUS_TONES[appointment.status]}>
                      {APPOINTMENT_STATUS_SHORT_LABELS[appointment.status]}
                    </Badge>
                  </div>
                </div>
              </CardLink>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(nextPage) => pageHref(status, nextPage, all)}
        label="Pagination des réservations"
      />
    </div>
  );
}
