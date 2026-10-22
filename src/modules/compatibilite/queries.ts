import type { AssessmentStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import {
  normalizeAnswers,
  type ConfiguredQuestion,
  type PublicQuestion,
  buildPublicQuestions,
} from './questions';
import type { CompatibilityAnswers, CompatibilityRuleData } from './engine';
import { verifyBookingCompatibility, type BookingGuardResult } from './booking-guard';

/* ============================================================
 * Lectures du module compatibilité (P5.3 à P5.8)
 * ============================================================ */

export interface CompatibilityService {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  durationMinutes: number | null;
  rule: CompatibilityRuleData | null;
  questions: ConfiguredQuestion[];
}

export function mapCompatibilityRule(
  rule: {
    acceptedLengths: CompatibilityRuleData['acceptedLengths'];
    acceptedHairTypes: string[];
    requiresLocs: boolean;
    incompatibleLocs: boolean;
    photoPolicy: CompatibilityRuleData['photoPolicy'];
    autoApprove: boolean;
    conditionsNote: string | null;
    incompatibleMessage: string | null;
    uncertainMessage: string | null;
  } | null,
): CompatibilityRuleData | null {
  if (!rule) return null;
  return {
    acceptedLengths: rule.acceptedLengths,
    acceptedHairTypes: rule.acceptedHairTypes,
    requiresLocs: rule.requiresLocs,
    incompatibleLocs: rule.incompatibleLocs,
    photoPolicy: rule.photoPolicy,
    autoApprove: rule.autoApprove,
    conditionsNote: rule.conditionsNote,
    incompatibleMessage: rule.incompatibleMessage,
    uncertainMessage: rule.uncertainMessage,
  };
}

export async function getCompatibilityServiceBySlug(
  slug: string,
): Promise<CompatibilityService | null> {
  const service = await db.service.findFirst({
    where: { slug, status: 'PUBLISHED', category: { active: true } },
    select: {
      id: true,
      name: true,
      slug: true,
      durationMinutes: true,
      categoryId: true,
      category: { select: { name: true } },
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
    },
  });
  if (!service) return null;

  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    durationMinutes: service.durationMinutes,
    rule: mapCompatibilityRule(service.compatibility),
    questions: service.questions,
  };
}

export async function listPublishedServicesForCompatibility(): Promise<
  Array<{ id: string; name: string; slug: string; categoryName: string }>
> {
  return db.service
    .findMany({
      where: { status: 'PUBLISHED', category: { active: true } },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, category: { select: { name: true } } },
    })
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        categoryName: row.category.name,
      })),
    );
}

export function questionsForService(service: CompatibilityService): PublicQuestion[] {
  return buildPublicQuestions({
    rule: service.rule,
    configured: service.questions,
  });
}

/* ------------------------------------------------------------------ */
/* Évaluations dashboard (P5.6)                                        */
/* ------------------------------------------------------------------ */

export const ASSESSMENT_PAGE_SIZE = 20;

export interface AssessmentFilters {
  status?: AssessmentStatus;
  page?: number;
  order?: 'asc' | 'desc';
}

export interface AssessmentListItem {
  id: string;
  status: AssessmentStatus;
  createdAt: Date;
  updatedAt: Date;
  decidedAt: Date | null;
  decisionMessage: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  serviceSlug: string;
  photoCount: number;
}

export async function listAssessments(filters: AssessmentFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.HairAssessmentWhereInput = filters.status ? { status: filters.status } : {};
  const order = filters.order ?? 'desc';

  const [rows, total] = await Promise.all([
    db.hairAssessment.findMany({
      where,
      orderBy: { createdAt: order },
      skip: (page - 1) * ASSESSMENT_PAGE_SIZE,
      take: ASSESSMENT_PAGE_SIZE,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        decidedAt: true,
        decisionMessage: true,
        photoKeys: true,
        customer: { select: { name: true, email: true, phone: true } },
        service: { select: { name: true, slug: true } },
      },
    }),
    db.hairAssessment.count({ where }),
  ]);

  const items: AssessmentListItem[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    decidedAt: row.decidedAt,
    decisionMessage: row.decisionMessage,
    customerName: row.customer?.name ?? 'Cliente inconnue',
    customerEmail: row.customer?.email ?? '',
    customerPhone: row.customer?.phone ?? '',
    serviceName: row.service.name,
    serviceSlug: row.service.slug,
    photoCount: row.photoKeys.length,
  }));

  return {
    items,
    total,
    page,
    pageSize: ASSESSMENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / ASSESSMENT_PAGE_SIZE)),
  };
}

export type AssessmentStatusCounts = Record<AssessmentStatus, number>;

const ASSESSMENT_STATUSES: AssessmentStatus[] = [
  'RECEIVED',
  'IN_PROGRESS',
  'INFO_REQUESTED',
  'ACCEPTED',
  'REFUSED',
  'BOOKING_PENDING',
  'CONFIRMED',
];

export async function countAssessmentsByStatus(): Promise<AssessmentStatusCounts> {
  const groups = await db.hairAssessment.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const counts = Object.fromEntries(
    ASSESSMENT_STATUSES.map((status) => [status, 0]),
  ) as AssessmentStatusCounts;
  for (const group of groups) {
    counts[group.status] = group._count._all;
  }
  return counts;
}

export interface AssessmentDetail {
  id: string;
  status: AssessmentStatus;
  answers: Record<string, unknown>;
  photoKeys: string[];
  decisionNote: string | null;
  decisionMessage: string | null;
  decidedAt: Date | null;
  decidedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  categoryName: string;
  rule: CompatibilityRuleData | null;
  questions: PublicQuestion[];
  customer: { id: string; name: string; email: string; phone: string } | null;
}

export async function getAssessmentDetail(id: string): Promise<AssessmentDetail | null> {
  const assessment = await db.hairAssessment.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      decidedBy: { select: { name: true } },
      service: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: { select: { name: true } },
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
        },
      },
    },
  });
  if (!assessment) return null;

  const answers =
    assessment.answers &&
    typeof assessment.answers === 'object' &&
    !Array.isArray(assessment.answers)
      ? (assessment.answers as Record<string, unknown>)
      : {};
  const rule = mapCompatibilityRule(assessment.service.compatibility);
  const questions = buildPublicQuestions({
    rule,
    configured: assessment.service.questions,
  });

  return {
    id: assessment.id,
    status: assessment.status,
    answers,
    photoKeys: assessment.photoKeys,
    decisionNote: assessment.decisionNote,
    decisionMessage: assessment.decisionMessage,
    decidedAt: assessment.decidedAt,
    decidedByName: assessment.decidedBy?.name ?? null,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
    serviceId: assessment.service.id,
    serviceName: assessment.service.name,
    serviceSlug: assessment.service.slug,
    categoryName: assessment.service.category.name,
    rule,
    questions,
    customer: assessment.customer,
  };
}

export function assessmentEngineAnswers(answers: Record<string, unknown>): CompatibilityAnswers {
  return normalizeAnswers(answers);
}

/* ------------------------------------------------------------------ */
/* Garde de réservation (P5.7, P5.8)                                    */
/* ------------------------------------------------------------------ */

/**
 * Rejoue les règles depuis la base au moment d'une réservation.
 * Ne crée, ne modifie et ne réserve rien : renvoie seulement la décision.
 * La phase 6 appellera cette fonction avant d'enregistrer un Appointment.
 */
export async function verifyCompatibilityForBooking(input: {
  serviceId: string;
  answers: Record<string, unknown>;
  assessmentId?: string | null;
  customerId?: string | null;
}): Promise<BookingGuardResult> {
  const [service, assessment] = await Promise.all([
    db.service.findUnique({
      where: { id: input.serviceId },
      select: { compatibility: true },
    }),
    input.assessmentId
      ? db.hairAssessment.findUnique({
          where: { id: input.assessmentId },
          select: { serviceId: true, status: true },
        })
      : input.customerId
        ? db.hairAssessment.findFirst({
            where: { customerId: input.customerId, serviceId: input.serviceId },
            orderBy: { createdAt: 'desc' },
            select: { serviceId: true, status: true },
          })
        : Promise.resolve(null),
  ]);

  return verifyBookingCompatibility({
    serviceId: input.serviceId,
    rule: mapCompatibilityRule(service?.compatibility ?? null),
    answers: normalizeAnswers(input.answers),
    assessment,
  });
}
