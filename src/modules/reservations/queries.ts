import type { AppointmentStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { OPTION_ORDER_BY } from '@/modules/catalogue/ordering';
import { mapCompatibilityRule, type CompatibilityService } from '@/modules/compatibilite/queries';
import { buildPublicQuestions, type PublicQuestion } from '@/modules/compatibilite/questions';

/* ============================================================
 * Lectures du module réservations (P6.3 à P6.11)
 * ============================================================ */

export interface BookableService extends CompatibilityService {
  description: string | null;
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
  options: Array<{
    id: string;
    name: string;
    priceCents: number;
    durationMinutes: number;
  }>;
  publicQuestions: PublicQuestion[];
}

const BOOKABLE_SERVICE_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  durationMinutes: true,
  priceFromCents: true,
  priceToCents: true,
  priceOnRequest: true,
  categoryId: true,
  category: { select: { name: true } },
  options: {
    where: { active: true },
    orderBy: OPTION_ORDER_BY,
    select: { id: true, name: true, priceCents: true, durationMinutes: true },
  },
  compatibility: true,
  questions: {
    where: { active: true },
    orderBy: { order: 'asc' },
    select: {
      key: true,
      label: true,
      type: true,
      required: true,
      active: true,
      order: true,
      options: true,
      condition: true,
    },
  },
} satisfies Prisma.ServiceSelect;

type BookableServiceRow = Prisma.ServiceGetPayload<{
  select: typeof BOOKABLE_SERVICE_SELECT;
}>;

function mapBookableService(row: BookableServiceRow): BookableService {
  const rule = mapCompatibilityRule(row.compatibility);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    durationMinutes: row.durationMinutes,
    priceFromCents: row.priceFromCents,
    priceToCents: row.priceToCents,
    priceOnRequest: row.priceOnRequest,
    options: row.options,
    rule,
    questions: row.questions,
    publicQuestions: buildPublicQuestions({ rule, configured: row.questions }),
  };
}

export async function getBookableServiceBySlug(slug: string): Promise<BookableService | null> {
  const row = await db.service.findFirst({
    where: { slug, status: 'PUBLISHED', category: { active: true } },
    select: BOOKABLE_SERVICE_SELECT,
  });
  return row ? mapBookableService(row) : null;
}

export async function listBookableServices(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    durationMinutes: number | null;
  }>
> {
  const rows = await db.service.findMany({
    where: { status: 'PUBLISHED', category: { active: true } },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      durationMinutes: true,
      category: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryName: row.category.name,
    durationMinutes: row.durationMinutes,
  }));
}

/* ------------------------------------------------------------------ */
/* Rendez-vous                                                         */
/* ------------------------------------------------------------------ */

export interface SelectedOption {
  optionId: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
}

export interface AppointmentDetail {
  id: string;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  priceCents: number | null;
  durationMinutes: number;
  homeService: boolean;
  travelFeeCents: number | null;
  homeAddress: string | null;
  selectedOptions: SelectedOption[];
  hairInfo: Record<string, unknown>;
  comments: string | null;
  cancelToken: string | null;
  cancelTokenExpiresAt: Date | null;
  holdExpiresAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  rescheduledFrom: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; name: string; email: string; phone: string };
  service: { id: string; name: string; slug: string };
}

const APPOINTMENT_DETAIL_SELECT = {
  id: true,
  status: true,
  startsAt: true,
  endsAt: true,
  priceCents: true,
  durationMinutes: true,
  homeService: true,
  travelFeeCents: true,
  homeAddress: true,
  selectedOptions: true,
  hairInfo: true,
  comments: true,
  cancelToken: true,
  cancelTokenExpiresAt: true,
  holdExpiresAt: true,
  cancelledAt: true,
  cancelReason: true,
  rescheduledFrom: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, email: true, phone: true } },
  service: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.AppointmentSelect;

type AppointmentDetailRow = Prisma.AppointmentGetPayload<{
  select: typeof APPOINTMENT_DETAIL_SELECT;
}>;

function mapAppointmentDetail(row: AppointmentDetailRow): AppointmentDetail {
  const selectedOptions = Array.isArray(row.selectedOptions)
    ? (row.selectedOptions as unknown as SelectedOption[])
    : [];
  const hairInfo =
    row.hairInfo && typeof row.hairInfo === 'object' && !Array.isArray(row.hairInfo)
      ? (row.hairInfo as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    priceCents: row.priceCents,
    durationMinutes: row.durationMinutes,
    homeService: row.homeService,
    travelFeeCents: row.travelFeeCents,
    homeAddress: row.homeAddress,
    selectedOptions,
    hairInfo,
    comments: row.comments,
    cancelToken: row.cancelToken,
    cancelTokenExpiresAt: row.cancelTokenExpiresAt,
    holdExpiresAt: row.holdExpiresAt,
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    rescheduledFrom: row.rescheduledFrom,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer,
    service: row.service,
  };
}

export async function getAppointmentDetail(id: string): Promise<AppointmentDetail | null> {
  const row = await db.appointment.findUnique({
    where: { id },
    select: APPOINTMENT_DETAIL_SELECT,
  });
  return row ? mapAppointmentDetail(row) : null;
}

export async function getAppointmentByCancelToken(
  token: string,
): Promise<AppointmentDetail | null> {
  const row = await db.appointment.findUnique({
    where: { cancelToken: token },
    select: APPOINTMENT_DETAIL_SELECT,
  });
  return row ? mapAppointmentDetail(row) : null;
}

export const APPOINTMENT_PAGE_SIZE = 20;

export interface AppointmentListItem {
  id: string;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  priceCents: number | null;
  homeService: boolean;
  travelFeeCents: number | null;
  homeAddress: string | null;
  customerName: string;
  customerEmail: string;
  serviceName: string;
}

export async function listAppointmentsAdmin(
  filters: {
    status?: AppointmentStatus;
    page?: number;
    upcomingOnly?: boolean;
  } = {},
) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.AppointmentWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.upcomingOnly) {
    where.startsAt = { gte: new Date(Date.now() - 24 * 3_600_000) };
  }

  const [rows, total] = await Promise.all([
    db.appointment.findMany({
      where,
      orderBy: { startsAt: filters.upcomingOnly ? 'asc' : 'desc' },
      skip: (page - 1) * APPOINTMENT_PAGE_SIZE,
      take: APPOINTMENT_PAGE_SIZE,
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        durationMinutes: true,
        priceCents: true,
        homeService: true,
        travelFeeCents: true,
        homeAddress: true,
        customer: { select: { name: true, email: true } },
        service: { select: { name: true } },
      },
    }),
    db.appointment.count({ where }),
  ]);

  const items: AppointmentListItem[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    durationMinutes: row.durationMinutes,
    priceCents: row.priceCents,
    homeService: row.homeService,
    travelFeeCents: row.travelFeeCents,
    homeAddress: row.homeAddress,
    customerName: row.customer.name,
    customerEmail: row.customer.email,
    serviceName: row.service.name,
  }));

  return {
    items,
    total,
    page,
    pageSize: APPOINTMENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / APPOINTMENT_PAGE_SIZE)),
  };
}

export async function countAppointmentsByStatus(): Promise<Record<string, number>> {
  const groups = await db.appointment.groupBy({ by: ['status'], _count: { _all: true } });
  return Object.fromEntries(groups.map((group) => [group.status, group._count._all]));
}

export interface CalendarAppointment {
  id: string;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  serviceName: string;
  priceCents: number | null;
}

export async function getCalendarAppointments(input: {
  from: Date;
  to: Date;
}): Promise<CalendarAppointment[]> {
  const rows = await db.appointment.findMany({
    where: {
      startsAt: { lt: input.to },
      endsAt: { gt: input.from },
    },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      priceCents: true,
      customer: { select: { name: true } },
      service: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    priceCents: row.priceCents,
    customerName: row.customer.name,
    serviceName: row.service.name,
  }));
}

export async function findActiveAppointmentsBetween(input: {
  from: Date;
  to: Date;
  excludeAppointmentId?: string;
}): Promise<
  Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: AppointmentStatus;
    customerName: string;
    serviceName: string;
  }>
> {
  const rows = await db.appointment.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
      startsAt: { lt: input.to },
      endsAt: { gt: input.from },
      ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
    },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      customer: { select: { name: true } },
      service: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    customerName: row.customer.name,
    serviceName: row.service.name,
  }));
}
