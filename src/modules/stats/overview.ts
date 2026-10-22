import { db } from '@/lib/db';
import { deviceTimeToUtc } from '@/lib/dates';

/* ============================================================
 * P8.5 / P8.6 : indicateurs du tableau de bord.
 * Définitions :
 * - rendez-vous du jour : créneaux dont le début est dans la journée
 *   locale Europe/Berlin ;
 * - revenus estimés : somme des prix figés des rendez-vous terminés ;
 * - annulations récentes : annulations client ou admin sur 7 jours ;
 * - taux de remplissage : non calculé dans cette version, voir ROADMAP.
 * ============================================================ */

const SALON_TZ = 'Europe/Berlin';
const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULED'] as const;

function parisDateISO(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function salonDayBounds(now = new Date()): { start: Date; end: Date } {
  const dateISO = parisDateISO(now);
  const start = deviceTimeToUtc(dateISO, 0, SALON_TZ);
  const end = new Date(start.getTime() + 24 * 3_600_000);
  return { start, end };
}

export interface DashboardOverview {
  todayAppointments: number;
  pendingAppointments: number;
  activeUpcoming: number;
  newCustomRequests: number;
  pendingAssessments: number;
  unreadMessages: number;
  unreadNotifications: number;
  recentCancellations: number;
  upcoming: Array<{
    id: string;
    startsAt: Date;
    customerName: string;
    serviceName: string;
    status: string;
  }>;
  nextBlocked: Array<{ id: string; startsAt: Date; endsAt: Date; reason: string | null }>;
  recentCancelled: Array<{
    id: string;
    startsAt: Date;
    customerName: string;
    serviceName: string;
    status: string;
    cancelledAt: Date | null;
  }>;
}

export async function getDashboardOverview(now = new Date()): Promise<DashboardOverview> {
  const { start, end } = salonDayBounds(now);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3_600_000);

  const [
    todayAppointments,
    pendingAppointments,
    activeUpcoming,
    newCustomRequests,
    pendingAssessments,
    unreadMessages,
    unreadNotifications,
    recentCancellations,
    upcomingRows,
    blockedRows,
    cancelledRows,
  ] = await Promise.all([
    db.appointment.count({ where: { startsAt: { gte: start, lt: end } } }),
    db.appointment.count({ where: { status: 'PENDING' } }),
    db.appointment.count({
      where: { status: { in: [...ACTIVE_STATUSES] }, startsAt: { gte: now } },
    }),
    db.customRequest.count({ where: { status: 'NEW' } }),
    db.hairAssessment.count({ where: { status: { in: ['RECEIVED', 'IN_PROGRESS'] } } }),
    db.message.count({ where: { author: 'CUSTOMER', isInternal: false, readAt: null } }),
    db.notification.count({ where: { channel: 'IN_APP', readAt: null } }),
    db.appointment.count({
      where: {
        status: { in: ['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'] },
        cancelledAt: { gte: weekAgo },
      },
    }),
    db.appointment.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] }, startsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
      take: 5,
      select: {
        id: true,
        startsAt: true,
        status: true,
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    db.blockedPeriod.findMany({
      where: { endsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
      take: 5,
    }),
    db.appointment.findMany({
      where: {
        status: { in: ['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'] },
        cancelledAt: { gte: weekAgo },
      },
      orderBy: { cancelledAt: 'desc' },
      take: 5,
      select: {
        id: true,
        startsAt: true,
        status: true,
        cancelledAt: true,
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
  ]);

  return {
    todayAppointments,
    pendingAppointments,
    activeUpcoming,
    newCustomRequests,
    pendingAssessments,
    unreadMessages,
    unreadNotifications,
    recentCancellations,
    upcoming: upcomingRows.map((row) => ({
      id: row.id,
      startsAt: row.startsAt,
      status: row.status,
      customerName: row.customer.name,
      serviceName: row.service.name,
    })),
    nextBlocked: blockedRows.map((row) => ({
      id: row.id,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      reason: row.reason,
    })),
    recentCancelled: cancelledRows.map((row) => ({
      id: row.id,
      startsAt: row.startsAt,
      status: row.status,
      cancelledAt: row.cancelledAt,
      customerName: row.customer.name,
      serviceName: row.service.name,
    })),
  };
}

/* ============================================================
 * Statistiques (période) : tout est calculé sur les rendez-vous dont le début
 * tombe dans la période, en jour civil Europe/Berlin. Montants en centimes.
 * ============================================================ */

export const STATS_PERIODS = ['7', '30', '90', '365'] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export function parseStatsPeriod(value: string | string[] | undefined): StatsPeriod {
  const v = Array.isArray(value) ? value[0] : value;
  return (STATS_PERIODS as readonly string[]).includes(v ?? '') ? (v as StatsPeriod) : '30';
}

export interface StatsBucket {
  key: string;
  /** Libellé court d'axe (ex. « 12 oct. »). */
  label: string;
  /** Libellé complet pour l'infobulle / le tableau. */
  tip: string;
  appointments: number;
  revenueCents: number;
}

export interface PeriodStatistics {
  period: StatsPeriod;
  granularity: 'day' | 'week' | 'month';
  totalAppointments: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  customRequests: number;
  revenueCents: number;
  averageTicketCents: number;
  byStatus: Array<{ status: string; count: number }>;
  popularServices: Array<{ name: string; count: number }>;
  series: StatsBucket[];
  /** Vrai si plus de 20 000 rendez-vous : le graphique est alors partiel (totaux exacts). */
  seriesTruncated: boolean;
}

const labelFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: SALON_TZ,
  day: 'numeric',
  month: 'short',
});
const tipFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: SALON_TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});
const monthFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: SALON_TZ,
  month: 'short',
  year: '2-digit',
});
const monthLongFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: SALON_TZ,
  month: 'long',
  year: 'numeric',
});

/** Ajoute `n` jours civils à une date ISO (YYYY-MM-DD), sans effet de fuseau. */
function addDaysISO(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Prépare les intervalles du graphique et la fonction qui range un instant dans le bon.
 *  Les bornes sont des minuits LOCAUX (Europe/Berlin, heure d'été comprise). */
function buildBuckets(period: StatsPeriod, now: Date) {
  const todayISO = parisDateISO(now);
  const buckets: StatsBucket[] = [];
  const starts: Date[] = [];
  const indexOf = (t: Date) => {
    let found = -1;
    for (let i = 0; i < starts.length; i++) {
      if (starts[i]!.getTime() <= t.getTime()) found = i;
      else break;
    }
    return found;
  };

  if (period === '365') {
    // 12 derniers mois civils, mois courant inclus.
    const [ty, tm] = todayISO.split('-').map(Number) as [number, number];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(Date.UTC(ty, tm - 1 - i, 1));
      const iso = monthStart.toISOString().slice(0, 10);
      const start = deviceTimeToUtc(iso, 0, SALON_TZ);
      starts.push(start);
      buckets.push({
        key: iso.slice(0, 7),
        label: monthFmt.format(start),
        tip: monthLongFmt.format(start),
        appointments: 0,
        revenueCents: 0,
      });
    }
    return { from: starts[0]!, granularity: 'month' as const, buckets, index: indexOf };
  }

  const days = Number(period);
  const weekly = period === '90';
  const count = weekly ? 13 : days;
  const span = weekly ? 7 : 1;
  for (let i = 0; i < count; i++) {
    const iso = addDaysISO(todayISO, -(count - 1 - i) * span);
    const start = deviceTimeToUtc(iso, 0, SALON_TZ);
    starts.push(start);
    buckets.push({
      key: iso,
      label: labelFmt.format(start),
      tip: weekly ? `Semaine du ${labelFmt.format(start)}` : tipFmt.format(start),
      appointments: 0,
      revenueCents: 0,
    });
  }
  return {
    from: starts[0]!,
    granularity: weekly ? ('week' as const) : ('day' as const),
    buckets,
    index: indexOf,
  };
}

/* Garde-fou : le graphique lit au plus ce nombre de rendez-vous (triés par date). Au-delà, la série
   est tronquée (`seriesTruncated`) ; les totaux, statuts et prestations restent exacts (agrégations SQL). */
const SERIES_ROW_LIMIT = 20_000;

export async function getPeriodStatistics(
  period: StatsPeriod,
  now = new Date(),
): Promise<PeriodStatistics> {
  const { from, granularity, buckets, index } = buildBuckets(period, now);
  const to = salonDayBounds(now).end;
  const where = { startsAt: { gte: from, lt: to } };

  const [byStatusRows, topServiceRows, seriesRows, customRequests] = await Promise.all([
    // Totaux exacts par statut (+ somme des prix figés).
    db.appointment.groupBy({
      by: ['status'],
      where,
      _count: { _all: true, priceCents: true },
      _sum: { priceCents: true },
    }),
    db.appointment.groupBy({
      by: ['serviceId'],
      where: { ...where, status: { in: ['CONFIRMED', 'RESCHEDULED', 'COMPLETED'] } },
      _count: { _all: true },
      orderBy: [{ _count: { serviceId: 'desc' } }, { serviceId: 'asc' }],
      take: 8,
    }),
    // Série du graphique : lignes minimales, ordre déterministe, borne explicite (+1 pour détecter le dépassement).
    db.appointment.findMany({
      where,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      select: { startsAt: true, status: true, priceCents: true },
      take: SERIES_ROW_LIMIT + 1,
    }),
    db.customRequest.count({ where: { createdAt: { gte: from, lt: to } } }),
  ]);

  const seriesTruncated = seriesRows.length > SERIES_ROW_LIMIT;
  for (const row of seriesRows.slice(0, SERIES_ROW_LIMIT)) {
    const cancelled = row.status === 'CANCELLED_BY_CUSTOMER' || row.status === 'CANCELLED_BY_ADMIN';
    const bucket = buckets[index(row.startsAt)];
    if (!bucket) continue;
    if (!cancelled) bucket.appointments++;
    if (row.status === 'COMPLETED' && row.priceCents != null) bucket.revenueCents += row.priceCents;
  }

  let totalAppointments = 0;
  let revenueCents = 0;
  let completedCount = 0;
  let pricedCompleted = 0;
  let cancelledCount = 0;
  let noShowCount = 0;
  for (const row of byStatusRows) {
    const count = row._count._all;
    totalAppointments += count;
    if (row.status === 'CANCELLED_BY_CUSTOMER' || row.status === 'CANCELLED_BY_ADMIN') {
      cancelledCount += count;
    }
    if (row.status === 'NO_SHOW') noShowCount += count;
    if (row.status === 'COMPLETED') {
      completedCount += count;
      revenueCents += row._sum.priceCents ?? 0;
      pricedCompleted += row._count.priceCents;
    }
  }

  const services = topServiceRows.length
    ? await db.service.findMany({
        where: { id: { in: topServiceRows.map((r) => r.serviceId) } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(services.map((s) => [s.id, s.name]));

  return {
    period,
    granularity,
    totalAppointments,
    completedCount,
    cancelledCount,
    noShowCount,
    customRequests,
    revenueCents,
    averageTicketCents: pricedCompleted > 0 ? Math.round(revenueCents / pricedCompleted) : 0,
    byStatus: byStatusRows
      .map((row) => ({ status: row.status as string, count: row._count._all }))
      .sort((x, y) => y.count - x.count),
    popularServices: topServiceRows.map((row) => ({
      name: names.get(row.serviceId) ?? 'Prestation supprimée',
      count: row._count._all,
    })),
    series: buckets,
    seriesTruncated,
  };
}

/** Totaux depuis le début (accueil) : 2 requêtes seulement. */
export async function getSummaryStatistics() {
  const [totalAppointments, revenue] = await Promise.all([
    db.appointment.count(),
    db.appointment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { priceCents: true },
      _count: { _all: true },
    }),
  ]);
  return {
    totalAppointments,
    completedCount: revenue._count._all,
    completedRevenueCents: revenue._sum.priceCents ?? 0,
  };
}
