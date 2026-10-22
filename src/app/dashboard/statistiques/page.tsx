import { Ban, ChartNoAxesColumn, CircleCheck, Receipt, UserX, Wand2, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardLink } from '@/components/ui/Card';
import { requireAdmin } from '@/modules/auth/guards';
import { APPOINTMENT_STATUS_LABELS } from '@/modules/reservations/status';
import { formatFcfa, formatFcfaCompact } from '@/modules/stats/format';
import { getPeriodStatistics, parseStatsPeriod, STATS_PERIODS } from '@/modules/stats/overview';
import { BarChart, RankBars } from './bar-chart';

export const metadata: Metadata = { title: 'Statistiques - Tableau de bord' };

const PERIOD_LABELS: Record<(typeof STATS_PERIODS)[number], string> = {
  '7': '7 jours',
  '30': '30 jours',
  '90': '3 mois',
  '365': '12 mois',
};
const GRANULARITY_LABELS = { day: 'par jour', week: 'par semaine', month: 'par mois' } as const;

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string | number;
}) {
  return (
    <>
      <p className="flex items-center gap-1.5 text-sm text-muted">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-accent" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate font-heading text-xl font-bold text-fg sm:text-2xl">{value}</p>
    </>
  );
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/statistiques');
  const period = parseStatsPeriod((await searchParams).period);
  const stats = await getPeriodStatistics(period);

  return (
    <div>
      <PageHeader
        icon={ChartNoAxesColumn}
        title="Statistiques"
        description="Montants estimés d’après les prix figés à la réservation."
      />

      <nav aria-label="Période" className="-mx-3 mb-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <ul className="inline-flex gap-1 rounded-full bg-line p-1">
          {STATS_PERIODS.map((p) => (
            <li key={p}>
              <Link
                href={`/dashboard/statistiques?period=${p}`}
                aria-current={p === period ? 'page' : undefined}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold transition ${
                  p === period ? 'bg-ink text-panel-fg' : 'text-fg hover:bg-accent-soft'
                }`}
              >
                {PERIOD_LABELS[p]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <Kpi icon={Wallet} label="Revenus estimés" value={formatFcfa(stats.revenueCents)} />
        </Card>
        <CardLink href="/dashboard/reservations">
          <Kpi icon={ChartNoAxesColumn} label="Rendez-vous" value={stats.totalAppointments} />
        </CardLink>
        <Card>
          <Kpi icon={CircleCheck} label="Terminés" value={stats.completedCount} />
        </Card>
        <Card>
          <Kpi icon={Receipt} label="Ticket moyen" value={formatFcfa(stats.averageTicketCents)} />
        </Card>
        <Card>
          <Kpi icon={Ban} label="Annulés" value={stats.cancelledCount} />
        </Card>
        <Card>
          <Kpi icon={UserX} label="Absences" value={stats.noShowCount} />
        </Card>
        <CardLink href="/dashboard/demandes" className="col-span-2">
          <Kpi icon={Wand2} label="Demandes personnalisées" value={stats.customRequests} />
        </CardLink>
      </div>

      {stats.seriesTruncated ? (
        <p role="status" className="mt-3 text-sm text-muted">
          Volume très élevé : les graphiques sont partiels, les totaux restent exacts.
        </p>
      ) : null}

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-2">
        <Card>
          <h2 className="font-heading text-lg font-bold text-fg">Revenus</h2>
          <p className="mb-3 text-sm text-muted">
            Prestations terminées, {GRANULARITY_LABELS[stats.granularity]}.
          </p>
          <BarChart
            title="Revenus estimés"
            valueLabel="Revenus"
            data={stats.series.map((b) => ({
              key: b.key,
              label: b.label,
              tip: b.tip,
              value: b.revenueCents,
            }))}
            format={formatFcfa}
            formatAxis={formatFcfaCompact}
          />
        </Card>

        <Card>
          <h2 className="font-heading text-lg font-bold text-fg">Rendez-vous</h2>
          <p className="mb-3 text-sm text-muted">
            Hors annulations, {GRANULARITY_LABELS[stats.granularity]}.
          </p>
          <BarChart
            title="Rendez-vous"
            valueLabel="Rendez-vous"
            data={stats.series.map((b) => ({
              key: b.key,
              label: b.label,
              tip: b.tip,
              value: b.appointments,
            }))}
            format={(v) => `${v} rendez-vous`}
            formatAxis={(v) => String(Math.round(v))}
          />
        </Card>

        <Card>
          <h2 className="mb-3 font-heading text-lg font-bold text-fg">Rendez-vous par statut</h2>
          <RankBars
            emptyLabel="Aucun rendez-vous sur la période."
            rows={stats.byStatus.map((row) => ({
              label:
                APPOINTMENT_STATUS_LABELS[row.status as keyof typeof APPOINTMENT_STATUS_LABELS] ??
                row.status,
              value: row.count,
            }))}
          />
        </Card>

        <Card>
          <h2 className="mb-3 font-heading text-lg font-bold text-fg">Prestations populaires</h2>
          <RankBars
            emptyLabel="Aucune donnée de réservation."
            rows={stats.popularServices.map((row) => ({ label: row.name, value: row.count }))}
          />
          <p className="mt-3 text-xs text-muted">
            Rendez-vous confirmés, reprogrammés ou terminés.
          </p>
        </Card>
      </div>
    </div>
  );
}
