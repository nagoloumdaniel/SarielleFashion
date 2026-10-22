'use client';

import { CalendarOff, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AppointmentStatus } from '@prisma/client';
import { utcToDeviceParts } from '@/lib/dates';
import { loadCalendarData, type CalendarState } from '@/modules/reservations/actions';
import {
  APPOINTMENT_STATUS_SHORT_LABELS,
  APPOINTMENT_STATUS_TONES,
} from '@/modules/reservations/status';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/* ============================================================
 * Calendrier dashboard : jour / semaine / mois / liste.
 * Les données viennent du serveur, l'affichage suit l'heure
 * locale de l'appareil connecté. Chaque rendez-vous est un lien
 * vers sa fiche ; un jour (semaine, mois) ouvre la vue jour.
 * ============================================================ */

type View = 'day' | 'week' | 'month' | 'list';

const VIEW_LABELS: Record<View, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  list: 'Liste',
};

const CANCELLED: AppointmentStatus[] = ['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'];

interface CalendarEntry {
  id: string;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  customerName: string;
  serviceName: string;
  priceCents: number | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isoFromDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseISO(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1);
}

function addDays(dateISO: string, days: number): string {
  const date = parseISO(dateISO);
  date.setDate(date.getDate() + days);
  return isoFromDate(date);
}

function addMonths(dateISO: string, months: number): string {
  const date = parseISO(dateISO);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return isoFromDate(date);
}

/** Lundi de la semaine contenant la date. */
function mondayOf(dateISO: string): string {
  return addDays(dateISO, -((parseISO(dateISO).getDay() + 6) % 7));
}

function timeLabel(iso: string, timeZone: string): string {
  const parts = utcToDeviceParts(new Date(iso), timeZone);
  return `${pad(Math.floor(parts.minute / 60))}:${pad(parts.minute % 60)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const shortDay = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const longDay = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

export function CalendarClient() {
  const [view, setView] = useState<View>('week');
  const [dateISO, setDateISO] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<CalendarState>({});
  const [loading, setLoading] = useState(true);

  // Date et fuseau de l'appareil (inconnus côté serveur).
  useEffect(() => {
    setDateISO(isoFromDate(new Date()));
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Dakar');
    } catch {
      setTimeZone('Africa/Dakar');
    }
  }, []);

  // Chargement de la période affichée ; une réponse périmée est ignorée.
  useEffect(() => {
    if (!dateISO || !timeZone) return;
    let cancelled = false;
    setLoading(true);
    const data = new FormData();
    data.set('view', view);
    data.set('dateISO', dateISO);
    data.set('timeZone', timeZone);
    loadCalendarData({}, data)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch(() => {
        if (!cancelled) setState({ error: 'Connexion impossible. Réessayez.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, dateISO, timeZone, reloadKey]);

  if (!dateISO || !timeZone) {
    return <Skeleton className="h-72 w-full" />;
  }

  const todayISO = isoFromDate(new Date());
  const go = (direction: -1 | 1) => {
    if (view === 'day') setDateISO(addDays(dateISO, direction));
    else if (view === 'week') setDateISO(addDays(dateISO, direction * 7));
    else if (view === 'month') setDateISO(addMonths(dateISO, direction));
  };
  const openDay = (day: string) => {
    setDateISO(day);
    setView('day');
  };

  const all: CalendarEntry[] = state.appointments ?? [];
  const appointments = showCancelled ? all : all.filter((item) => !CANCELLED.includes(item.status));
  const byDay = new Map<string, CalendarEntry[]>();
  for (const appointment of appointments) {
    const day = utcToDeviceParts(new Date(appointment.startsAt), timeZone).dateISO;
    const list = byDay.get(day) ?? [];
    list.push(appointment);
    byDay.set(day, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const weekStart = mondayOf(dateISO);
  const monthStart = mondayOf(`${dateISO.slice(0, 8)}01`);
  const title =
    view === 'month'
      ? capitalize(monthYear.format(parseISO(dateISO)))
      : view === 'week'
        ? `Semaine du ${shortDay.format(parseISO(weekStart))}`
        : view === 'day'
          ? capitalize(longDay.format(parseISO(dateISO)))
          : 'Prochains rendez-vous';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {view !== 'list' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconOnly
                icon={ChevronLeft}
                onClick={() => go(-1)}
              >
                Période précédente
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconOnly
                icon={ChevronRight}
                onClick={() => go(1)}
              >
                Période suivante
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDateISO(todayISO)}
              >
                Aujourd’hui
              </Button>
            </>
          ) : null}
          <h2 className="min-w-0 truncate font-heading text-base font-bold text-fg sm:text-lg">
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Affichage"
            className="flex gap-1 rounded-[var(--radius-md)] bg-line p-1"
          >
            {(Object.keys(VIEW_LABELS) as View[]).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={view === item ? 'primary' : 'secondary'}
                aria-pressed={view === item}
                onClick={() => setView(item)}
              >
                {VIEW_LABELS[item]}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant={showCancelled ? 'primary' : 'secondary'}
            icon={showCancelled ? Eye : EyeOff}
            iconOnly="mobile"
            aria-pressed={showCancelled}
            onClick={() => setShowCancelled((value) => !value)}
          >
            Annulées
          </Button>
        </div>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] bg-alert-soft px-3 py-2 text-sm text-alert"
        >
          <span>{state.error}</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Réessayer
          </Button>
        </div>
      ) : null}

      <div
        aria-busy={loading}
        className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}
      >
        {view === 'day' ? (
          <DayView
            entries={byDay.get(dateISO) ?? []}
            timeZone={timeZone}
            loading={loading && all.length === 0}
          />
        ) : null}

        {view === 'week' ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            {Array.from({ length: 7 }, (_, index) => {
              const dayISO = addDays(weekStart, index);
              const entries = byDay.get(dayISO) ?? [];
              return (
                <section
                  key={dayISO}
                  aria-label={capitalize(longDay.format(parseISO(dayISO)))}
                  className={`rounded-[var(--radius-md)] border p-2 ${
                    dayISO === todayISO ? 'border-cacao bg-accent-soft/50' : 'border-line bg-card'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openDay(dayISO)}
                    className="w-full text-left text-sm font-semibold text-fg hover:text-accent"
                  >
                    {capitalize(shortDay.format(parseISO(dayISO)))}
                    {entries.length > 0 ? (
                      <span className="ml-2 font-normal text-muted">({entries.length})</span>
                    ) : null}
                  </button>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {entries.length === 0 ? (
                      <p className="text-xs text-muted">Aucun rendez-vous</p>
                    ) : (
                      entries.map((appointment) => (
                        <Link
                          key={appointment.id}
                          href={`/dashboard/reservations/${appointment.id}`}
                          className="rounded-[var(--radius-sm)] border border-line bg-page px-2 py-1.5 text-xs transition hover:border-cacao"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-semibold">
                              {timeLabel(appointment.startsAt, timeZone)}
                            </span>
                            <Badge
                              tone={APPOINTMENT_STATUS_TONES[appointment.status] ?? 'neutral'}
                              size="sm"
                            >
                              {APPOINTMENT_STATUS_SHORT_LABELS[appointment.status] ??
                                appointment.status}
                            </Badge>
                          </span>
                          <span className="mt-0.5 block truncate text-fg">
                            {appointment.customerName}
                          </span>
                          <span className="block truncate text-muted">
                            {appointment.serviceName}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}

        {view === 'month' ? (
          <div>
            <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-semibold text-muted">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 42 }, (_, index) => addDays(monthStart, index)).map(
                (dayISO) => {
                  const entries = byDay.get(dayISO) ?? [];
                  const inMonth = dayISO.slice(0, 7) === dateISO.slice(0, 7);
                  const label = `${capitalize(longDay.format(parseISO(dayISO)))}, ${entries.length} rendez-vous`;
                  return (
                    <button
                      key={dayISO}
                      type="button"
                      aria-label={label}
                      onClick={() => openDay(dayISO)}
                      className={`flex min-h-14 flex-col items-start gap-0.5 rounded-[var(--radius-sm)] border p-1 text-left transition hover:border-cacao sm:min-h-20 sm:p-1.5 ${
                        dayISO === todayISO
                          ? 'border-cacao bg-accent-soft/50'
                          : inMonth
                            ? 'border-line bg-card'
                            : 'border-line/50 bg-page opacity-60'
                      }`}
                    >
                      <span className="text-xs font-semibold">{Number(dayISO.slice(-2))}</span>
                      {entries.length > 0 ? (
                        <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-fg sm:hidden">
                          {entries.length}
                        </span>
                      ) : null}
                      {entries.slice(0, 2).map((appointment) => (
                        <span
                          key={appointment.id}
                          className="hidden w-full truncate text-xs text-muted sm:block"
                        >
                          {timeLabel(appointment.startsAt, timeZone)} {appointment.customerName}
                        </span>
                      ))}
                      {entries.length > 2 ? (
                        <span className="hidden text-xs font-semibold text-accent sm:block">
                          +{entries.length - 2}
                        </span>
                      ) : null}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : null}

        {view === 'list' ? (
          <ListView
            appointments={appointments}
            timeZone={timeZone}
            loading={loading && all.length === 0}
          />
        ) : null}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <CalendarOff aria-hidden="true" className="size-3.5" />
        Horaires affichés à l’heure de votre appareil. Les créneaux bloqués se gèrent dans
        Disponibilités.
      </p>
    </div>
  );
}

function EntryRow({ appointment, timeZone }: { appointment: CalendarEntry; timeZone: string }) {
  return (
    <Link
      href={`/dashboard/reservations/${appointment.id}`}
      className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-card px-3 py-2.5 text-sm shadow-soft transition hover:border-cacao hover:shadow-lift"
    >
      <span className="min-w-0">
        <span className="block font-semibold text-fg">
          {timeLabel(appointment.startsAt, timeZone)} - {timeLabel(appointment.endsAt, timeZone)}{' '}
          <span className="font-normal">· {appointment.customerName}</span>
        </span>
        <span className="block truncate text-muted">{appointment.serviceName}</span>
      </span>
      <Badge tone={APPOINTMENT_STATUS_TONES[appointment.status] ?? 'neutral'} className="shrink-0">
        {APPOINTMENT_STATUS_SHORT_LABELS[appointment.status] ?? appointment.status}
      </Badge>
    </Link>
  );
}

function DayView({
  entries,
  timeZone,
  loading,
}: {
  entries: CalendarEntry[];
  timeZone: string;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (entries.length === 0) {
    return (
      <EmptyState variant="compact" title="Aucun rendez-vous" message="Rien de prévu ce jour." />
    );
  }
  return (
    <div className="grid gap-2">
      {entries.map((appointment) => (
        <EntryRow key={appointment.id} appointment={appointment} timeZone={timeZone} />
      ))}
    </div>
  );
}

function ListView({
  appointments,
  timeZone,
  loading,
}: {
  appointments: CalendarEntry[];
  timeZone: string;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (appointments.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="Aucun rendez-vous"
        message="Rien de prévu sur cette période."
      />
    );
  }
  const groups = new Map<string, CalendarEntry[]>();
  for (const appointment of appointments) {
    const day = utcToDeviceParts(new Date(appointment.startsAt), timeZone).dateISO;
    groups.set(day, [...(groups.get(day) ?? []), appointment]);
  }
  return (
    <div className="grid gap-3">
      {[...groups.entries()].map(([day, entries]) => (
        <section key={day} aria-label={capitalize(longDay.format(parseISO(day)))}>
          <h3 className="mb-1.5 text-sm font-semibold text-muted">
            {capitalize(longDay.format(parseISO(day)))}
          </h3>
          <div className="grid gap-2">
            {entries.map((appointment) => (
              <EntryRow key={appointment.id} appointment={appointment} timeZone={timeZone} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
