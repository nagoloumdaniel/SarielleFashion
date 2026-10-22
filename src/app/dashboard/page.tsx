import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  ChartNoAxesColumn,
  ChevronRight,
  ClipboardCheck,
  Hourglass,
  LayoutDashboard,
  MessageSquare,
  Wand2,
  XCircle,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Skeleton } from '@/components/shared/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardLink } from '@/components/ui/Card';
import { requireAdmin } from '@/modules/auth/guards';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONES } from '@/modules/reservations/status';
import { formatEuro } from '@/modules/stats/format';
import { getDashboardOverview, getSummaryStatistics } from '@/modules/stats/overview';

export const metadata: Metadata = {
  title: 'Tableau de bord - Sarielle Fashion',
};

/* Ligne de liste entièrement cliquable (aucun bouton « Voir »). */
const ROW =
  'dash-row -mx-2 flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-2.5 transition-colors hover:bg-accent-soft/60 focus-visible:bg-accent-soft/60';

/* Lien « Voir tout » sous une liste tronquée (5 éléments maximum sur l'accueil). */
function SeeAll({ href }: { href: string }) {
  return (
    <div className="mt-2 flex justify-end">
      <ButtonLink href={href} variant="ghost" size="sm" icon={ChevronRight}>
        Voir tout
      </ButtonLink>
    </div>
  );
}

function CardTitle({ icon: Icon, children }: { icon: typeof Bell; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-heading text-base font-bold text-fg sm:text-lg">
      <span className="inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft">
        <Icon aria-hidden="true" className="size-4 text-accent" />
      </span>
      {children}
    </h2>
  );
}

async function HomeContent() {
  const [overview, summary] = await Promise.all([getDashboardOverview(), getSummaryStatistics()]);

  const indicators = [
    {
      label: 'Rendez-vous aujourd’hui',
      icon: CalendarCheck,
      value: overview.todayAppointments,
      href: '/dashboard/calendrier',
    },
    {
      label: 'En attente de confirmation',
      icon: Hourglass,
      value: overview.pendingAppointments,
      href: '/dashboard/reservations?status=PENDING',
    },
    {
      label: 'Nouvelles demandes',
      icon: Wand2,
      value: overview.newCustomRequests,
      href: '/dashboard/demandes?status=NEW',
    },
    {
      label: 'Évaluations à traiter',
      icon: ClipboardCheck,
      value: overview.pendingAssessments,
      href: '/dashboard/evaluations',
    },
    {
      label: 'Messages non lus',
      icon: MessageSquare,
      value: overview.unreadMessages,
      href: '/dashboard/messages',
    },
    {
      label: 'Notifications non lues',
      icon: Bell,
      value: overview.unreadNotifications,
      href: '/dashboard/notifications',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {indicators.map((indicator) => (
          <CardLink key={indicator.label} href={indicator.href} className="group">
            <div className="flex items-start justify-between gap-2">
              <span
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${
                  indicator.value > 0 ? 'bg-accent-soft text-accent' : 'bg-line/50 text-muted'
                }`}
              >
                <indicator.icon aria-hidden="true" className="size-4" />
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </div>
            <p
              className={`mt-3 font-heading text-3xl font-bold leading-none tabular-nums sm:text-4xl ${
                indicator.value > 0 ? 'text-fg' : 'text-muted'
              }`}
            >
              {indicator.value}
            </p>
            <p className="mt-1.5 truncate text-sm text-muted">{indicator.label}</p>
          </CardLink>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle icon={CalendarClock}>Prochains rendez-vous</CardTitle>
          {overview.upcoming.length === 0 ? (
            <p className="mt-3 rounded-[var(--radius-md)] bg-page px-3 py-4 text-center text-sm text-muted">
              Aucun rendez-vous à venir.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line/50">
              {overview.upcoming.map((appointment) => (
                <li key={appointment.id}>
                  <Link href={`/dashboard/reservations/${appointment.id}`} className={ROW}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-fg">
                        {appointment.customerName} · {appointment.serviceName}
                      </span>
                      <span className="block text-xs text-muted">
                        <LocalDateTime
                          iso={appointment.startsAt.toISOString()}
                          dateStyle="medium"
                        />
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Badge
                        tone={APPOINTMENT_STATUS_TONES[appointment.status as never] ?? 'neutral'}
                        size="sm"
                      >
                        {APPOINTMENT_STATUS_LABELS[appointment.status as never] ??
                          appointment.status}
                      </Badge>
                      <ChevronRight aria-hidden="true" className="size-4 text-muted" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {overview.upcoming.length > 0 ? <SeeAll href="/dashboard/reservations" /> : null}
        </Card>

        {/* Carte entière cliquable vers les statistiques. */}
        <CardLink href="/dashboard/statistiques">
          <CardTitle icon={ChartNoAxesColumn}>Indicateurs</CardTitle>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            {[
              ['Rendez-vous au total', summary.totalAppointments],
              ['Annulations (7 jours)', overview.recentCancellations],
              ['Prestations terminées', summary.completedCount],
              ['Revenus estimés', formatEuro(summary.completedRevenueCents)],
            ].map(([label, value]) => (
              <div key={label} className="border-l-2 border-accent-soft pl-3">
                <dt className="text-muted">{label}</dt>
                <dd className="mt-0.5 font-heading text-xl font-bold tabular-nums text-fg">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">Revenus = prix figés des rendez-vous terminés.</p>
        </CardLink>

        <Card>
          <CardTitle icon={CalendarOff}>Prochaines indisponibilités</CardTitle>
          {overview.nextBlocked.length === 0 ? (
            <p className="mt-3 rounded-[var(--radius-md)] bg-page px-3 py-4 text-center text-sm text-muted">
              Aucune indisponibilité à venir.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line/50">
              {overview.nextBlocked.map((block) => (
                <li key={block.id}>
                  <Link href="/dashboard/disponibilites" className={ROW}>
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold text-fg">
                        <LocalDateTime iso={block.startsAt.toISOString()} dateStyle="medium" />{' '}
                        <ArrowRight aria-hidden="true" className="inline size-3.5" />{' '}
                        <LocalDateTime iso={block.endsAt.toISOString()} dateStyle="medium" />
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {block.reason ?? 'Sans motif'}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {overview.nextBlocked.length > 0 ? <SeeAll href="/dashboard/disponibilites" /> : null}
        </Card>

        <Card>
          <CardTitle icon={XCircle}>Annulations récentes</CardTitle>
          {overview.recentCancelled.length === 0 ? (
            <p className="mt-3 rounded-[var(--radius-md)] bg-page px-3 py-4 text-center text-sm text-muted">
              Aucune annulation sur les 7 derniers jours.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line/50">
              {overview.recentCancelled.map((appointment) => (
                <li key={appointment.id}>
                  <Link href={`/dashboard/reservations/${appointment.id}`} className={ROW}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-fg">
                        {appointment.customerName} · {appointment.serviceName}
                      </span>
                      <span className="block text-xs text-muted">
                        Annulé le{' '}
                        {appointment.cancelledAt ? (
                          <LocalDateTime
                            iso={appointment.cancelledAt.toISOString()}
                            dateStyle="medium"
                          />
                        ) : (
                          'date inconnue'
                        )}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {overview.recentCancelled.length > 0 ? (
            <SeeAll href="/dashboard/reservations?all=1" />
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <p role="status" className="sr-only">
        Chargement
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[7.5rem] w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  // P1.8 : garde serveur en plus du middleware (défense en profondeur)
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard');

  return (
    <div>
      <PageHeader icon={LayoutDashboard} title={`Bonjour ${user.name}`} />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
