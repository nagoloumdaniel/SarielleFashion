import { randomBytes } from 'node:crypto';
import type { AppointmentStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { deviceTimeToUtc } from '@/lib/dates';
import { evaluateCompatibility } from '@/modules/compatibilite/engine';
import { normalizeAnswers } from '@/modules/compatibilite/questions';
import { verifyBookingCompatibility } from '@/modules/compatibilite/booking-guard';
import { mapCompatibilityRule } from '@/modules/compatibilite/queries';
import { computeAvailableSlots } from '@/modules/disponibilites/engine';
import {
  DEFAULT_SALON_SETTINGS,
  mapSalonSettings,
  type SalonSettingsData,
} from '@/modules/disponibilites/queries';
import { OPTION_ORDER_BY } from '@/modules/catalogue/ordering';
import { logAudit } from '@/modules/stats/audit';
import { getBookableServiceBySlug, type BookableService } from './queries';
import {
  addTravelFee,
  computeBookingSnapshot,
  resolveHomeService,
  type SelectedOptionSnapshot,
} from './pricing';
import {
  applyPromotion,
  findBestPromotion,
  INVALID_PROMO_CODE_MESSAGE,
  normalizePromoCode,
  resolvePromoCode,
} from '@/modules/promotions/pricing';
import { fetchPromotionCandidates } from '@/modules/promotions/queries';
import {
  buildCancellationExpiry,
  evaluateCancellationPolicy,
  isCancellationTokenValid,
} from './policy';
import { assertTransition } from './status';
import { queueAppointmentNotifications } from './notifications';
import { notifyWaitlistForFreedSlot } from '@/modules/liste-attente/service';
import { createReviewRequest } from '@/modules/avis/service';
import { bookingReference, HOME_ADDRESS_MIN } from './schemas';
import { expirePendingHolds } from './expiry';

/* ============================================================
 * Service de réservation (P6.2 à P6.8)
 * - Verrou PostgreSQL consultatif : un seul enregistrement à la fois.
 * - Disponibilité recalculée dans la transaction.
 * - Compatibilité rejouée côté serveur (P5.8).
 * - Instantanés prix et durée figés (P6.11).
 * ============================================================ */

const BOOKING_LOCK_KEY = 872014751;

function dayRange(dateISO: string, timeZone: string) {
  const dayStart = deviceTimeToUtc(dateISO, 0, timeZone);
  return {
    from: new Date(dayStart.getTime() - 24 * 3_600_000),
    to: new Date(dayStart.getTime() + 48 * 3_600_000),
  };
}

async function settingsInTx(tx: Prisma.TransactionClient): Promise<SalonSettingsData> {
  const row = await tx.salonSettings.findUnique({ where: { id: 1 } });
  return row ? mapSalonSettings(row) : DEFAULT_SALON_SETTINGS;
}

async function serviceInTx(
  tx: Prisma.TransactionClient,
  slug: string,
): Promise<BookableService | null> {
  const row = await tx.service.findFirst({
    where: { slug, status: 'PUBLISHED', category: { active: true } },
    select: {
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
    },
  });
  if (!row) return null;
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
    publicQuestions: [],
  };
}

async function slotsInTx(
  tx: Prisma.TransactionClient,
  input: {
    dateISO: string;
    timeZone: string;
    durationMinutes: number;
    settings: SalonSettingsData;
    excludeAppointmentId?: string;
    now: Date;
  },
) {
  const range = dayRange(input.dateISO, input.timeZone);
  const [rules, blockedPeriods, busy] = await Promise.all([
    tx.availabilityRule.findMany({ where: { active: true } }),
    tx.blockedPeriod.findMany({
      where: { startsAt: { lt: range.to }, endsAt: { gt: range.from } },
      select: { startsAt: true, endsAt: true },
    }),
    tx.appointment.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        startsAt: { lt: range.to },
        endsAt: { gt: range.from },
        ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return computeAvailableSlots({
    dateISO: input.dateISO,
    timeZone: input.timeZone,
    durationMinutes: input.durationMinutes,
    rules: rules.map((rule) => ({
      kind: rule.kind,
      weekday: rule.weekday,
      date: rule.date,
      startMinute: rule.startMinute,
      endMinute: rule.endMinute,
      active: rule.active,
    })),
    blockedPeriods,
    busy,
    settings: {
      bufferMinutes: input.settings.bufferMinutes,
      slotIntervalMinutes: input.settings.slotIntervalMinutes,
      minLeadTimeMinutes: input.settings.minLeadTimeMinutes,
      maxAdvanceDays: input.settings.maxAdvanceDays,
    },
    now: input.now,
  });
}

export interface BookingSlotResult {
  service: BookableService;
  durationMinutes: number;
  priceCents: number | null;
  selectedOptions: SelectedOptionSnapshot[];
  slots: Array<{ startsAt: Date; endsAt: Date; startMinute: number; endMinute: number }>;
}

export async function getBookingSlots(input: {
  serviceSlug: string;
  optionIds: string[];
  dateISO: string;
  timeZone: string;
}): Promise<BookingSlotResult> {
  const service = await getBookableServiceBySlug(input.serviceSlug);
  if (!service) throw new AppError('NOT_FOUND', 'Cette prestation n’est plus disponible.', 404);

  const snapshot = computeBookingSnapshot(service, input.optionIds, service.options);
  if (snapshot.invalidOptionIds.length > 0) {
    throw new AppError('INVALID_OPTION', 'Une option sélectionnée n’est plus disponible.', 409);
  }
  if (snapshot.durationMinutes <= 0) {
    throw new AppError(
      'INVALID_DURATION',
      'La durée de cette prestation n’est pas renseignée. Contactez Sarielle.',
      409,
    );
  }

  const settings = await getSalonSettingsForSlots();
  await expirePendingHolds();
  const range = dayRange(input.dateISO, input.timeZone);
  const [rules, blockedPeriods, busy] = await Promise.all([
    db.availabilityRule.findMany({ where: { active: true } }),
    db.blockedPeriod.findMany({
      where: { startsAt: { lt: range.to }, endsAt: { gt: range.from } },
      select: { startsAt: true, endsAt: true },
    }),
    db.appointment.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        startsAt: { lt: range.to },
        endsAt: { gt: range.from },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const slots = computeAvailableSlots({
    dateISO: input.dateISO,
    timeZone: input.timeZone,
    durationMinutes: snapshot.durationMinutes,
    rules: rules.map((rule) => ({
      kind: rule.kind,
      weekday: rule.weekday,
      date: rule.date,
      startMinute: rule.startMinute,
      endMinute: rule.endMinute,
      active: rule.active,
    })),
    blockedPeriods,
    busy,
    settings: {
      bufferMinutes: settings.bufferMinutes,
      slotIntervalMinutes: settings.slotIntervalMinutes,
      minLeadTimeMinutes: settings.minLeadTimeMinutes,
      maxAdvanceDays: settings.maxAdvanceDays,
    },
    now: new Date(),
  });

  return {
    service,
    durationMinutes: snapshot.durationMinutes,
    priceCents: snapshot.priceCents,
    selectedOptions: snapshot.selectedOptions,
    slots,
  };
}

export interface PromoCodePreview {
  code: string;
  promotionName: string;
  /** false : une promotion automatique plus avantageuse s'applique déjà, le code n'ajoute rien. */
  codeApplied: boolean;
  basePriceCents: number;
  discountCents: number;
  finalPriceCents: number;
}

/**
 * Valide un code promo pour une prestation + options et calcule le prix remisé (aperçu).
 * Le prix réel est refigé par createBooking, qui revalide le code.
 * Échec unique et générique : aucune information sur l'existence d'autres codes.
 */
export async function previewPromoCode(input: {
  serviceSlug: string;
  optionIds: string[];
  code: string;
}): Promise<PromoCodePreview> {
  const code = normalizePromoCode(input.code);
  const service = await getBookableServiceBySlug(input.serviceSlug);
  if (!code || !service) throw new AppError('INVALID_PROMO', INVALID_PROMO_CODE_MESSAGE, 409);

  const snapshot = computeBookingSnapshot(service, input.optionIds, service.options);
  if (snapshot.invalidOptionIds.length > 0) {
    throw new AppError('INVALID_OPTION', 'Une option sélectionnée n’est plus disponible.', 409);
  }
  const now = new Date();
  const candidates = await fetchPromotionCandidates(db, now);
  const resolved = resolvePromoCode(candidates, service.id, now, code);
  if (!resolved.ok || snapshot.priceCents == null) {
    throw new AppError('INVALID_PROMO', INVALID_PROMO_CODE_MESSAGE, 409);
  }

  const best = findBestPromotion(candidates, service.id, now, snapshot.priceCents, code);
  const discount = applyPromotion(snapshot.priceCents, best ?? resolved.promotion);
  return {
    code,
    promotionName: discount.promotionName,
    codeApplied: (best ?? resolved.promotion).id === resolved.promotion.id,
    basePriceCents: snapshot.priceCents,
    discountCents: discount.discountCents,
    finalPriceCents: discount.finalPriceCents,
  };
}

export interface AutoPromotionPreview {
  promotionName: string;
  basePriceCents: number;
  discountCents: number;
  finalPriceCents: number;
}

/** Aperçu de l'offre automatique (sans code) qui sera figée à l'enregistrement, ou null. */
export async function previewAutomaticPromotion(input: {
  serviceSlug: string;
  optionIds: string[];
}): Promise<AutoPromotionPreview | null> {
  const service = await getBookableServiceBySlug(input.serviceSlug);
  if (!service) return null;
  const snapshot = computeBookingSnapshot(service, input.optionIds, service.options);
  if (snapshot.invalidOptionIds.length > 0 || snapshot.priceCents == null) return null;
  const now = new Date();
  const candidates = await fetchPromotionCandidates(db, now);
  const best = findBestPromotion(candidates, service.id, now, snapshot.priceCents, null);
  if (!best) return null;
  const discount = applyPromotion(snapshot.priceCents, best);
  if (discount.discountCents <= 0) return null;
  return {
    promotionName: discount.promotionName,
    basePriceCents: snapshot.priceCents,
    discountCents: discount.discountCents,
    finalPriceCents: discount.finalPriceCents,
  };
}

async function getSalonSettingsForSlots(): Promise<SalonSettingsData> {
  const row = await db.salonSettings.findUnique({ where: { id: 1 } });
  return row ? mapSalonSettings(row) : DEFAULT_SALON_SETTINGS;
}

export interface CreateBookingInput {
  serviceSlug: string;
  dateISO: string;
  startsAt: Date;
  timeZone: string;
  name: string;
  email: string;
  phone: string;
  comment: string;
  answers: Record<string, unknown>;
  optionIds: string[];
  /** Code promo saisi par la cliente (facultatif) : revalidé ici, jamais cru côté client. */
  promoCode?: string | null;
  /** Coiffure à domicile demandée : acceptée seulement si activée, frais recalculés ici. */
  homeService?: boolean;
  homeAddress?: string | null;
  /** Confirmation depuis un lien de liste d'attente (P8.8), facultatif. */
  waitlistToken?: string | null;
}

export interface CreatedBooking {
  appointmentId: string;
  reference: string;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  priceCents: number | null;
  homeService: boolean;
  travelFeeCents: number | null;
  cancelToken: string;
  serviceName: string;
  customerEmail: string;
}

export async function createBooking(input: CreateBookingInput): Promise<CreatedBooking> {
  if (Number.isNaN(input.startsAt.getTime())) {
    throw new AppError('INVALID_SLOT', 'Créneau invalide.', 400);
  }

  const created = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`;
      const now = new Date();

      await tx.appointment.updateMany({
        where: { status: 'PENDING', holdExpiresAt: { not: null, lt: now } },
        data: {
          status: 'CANCELLED_BY_ADMIN',
          cancelledAt: now,
          cancelReason: 'Délai de confirmation dépassé : le créneau a été libéré automatiquement.',
        },
      });

      const service = await serviceInTx(tx, input.serviceSlug);
      if (!service) {
        throw new AppError('NOT_FOUND', 'Cette prestation n’est plus disponible.', 404);
      }
      const settings = await settingsInTx(tx);
      const snapshot = computeBookingSnapshot(service, input.optionIds, service.options);
      const home = resolveHomeService(Boolean(input.homeService), settings);
      if (!home.ok) {
        throw new AppError(
          'HOME_SERVICE_DISABLED',
          'La coiffure à domicile n’est plus proposée. Retirez cette option pour continuer.',
          409,
        );
      }
      const homeAddress = home.homeService ? (input.homeAddress?.trim() ?? '') : '';
      if (home.homeService && homeAddress.length < HOME_ADDRESS_MIN) {
        throw new AppError(
          'HOME_ADDRESS_REQUIRED',
          'Indiquez votre adresse ou votre quartier pour la coiffure à domicile.',
          400,
        );
      }
      // Promotions : automatiques + code saisi (revalidé), une seule appliquée, la plus avantageuse.
      const enteredCode = input.promoCode?.trim() ? input.promoCode : null;
      const promoCandidates =
        snapshot.priceCents != null || enteredCode ? await fetchPromotionCandidates(tx, now) : [];
      if (enteredCode && !resolvePromoCode(promoCandidates, service.id, now, enteredCode).ok) {
        throw new AppError('INVALID_PROMO', INVALID_PROMO_CODE_MESSAGE, 409);
      }
      const promotion =
        snapshot.priceCents != null
          ? findBestPromotion(promoCandidates, service.id, now, snapshot.priceCents, enteredCode)
          : null;
      const discount =
        promotion && snapshot.priceCents != null
          ? applyPromotion(snapshot.priceCents, promotion)
          : null;
      if (snapshot.invalidOptionIds.length > 0) {
        throw new AppError('INVALID_OPTION', 'Une option sélectionnée n’est plus disponible.', 409);
      }
      if (snapshot.durationMinutes <= 0) {
        throw new AppError(
          'INVALID_DURATION',
          'La durée de cette prestation n’est pas renseignée.',
          409,
        );
      }

      const existingCustomer = await tx.customer.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      const assessment = existingCustomer
        ? await tx.hairAssessment.findFirst({
            where: { customerId: existingCustomer.id, serviceId: service.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true, serviceId: true, status: true },
          })
        : null;

      const answers = normalizeAnswers(input.answers);
      const guard = verifyBookingCompatibility({
        serviceId: service.id,
        rule: service.rule,
        answers,
        assessment,
      });
      const engine = evaluateCompatibility({ rule: service.rule, answers });
      const assessmentAccepted =
        assessment?.status === 'ACCEPTED' || assessment?.status === 'CONFIRMED';

      if (!guard.allowed) {
        const manualReviewOnly =
          guard.reason === 'REVIEW_REQUIRED' &&
          engine.verdict === 'COMPATIBLE' &&
          !engine.photoRequired;
        if (!manualReviewOnly) {
          throw new AppError('COMPATIBILITY', guard.message, 409);
        }
      }
      if (engine.photoRequired && !assessmentAccepted) {
        throw new AppError(
          'COMPATIBILITY',
          'Une photo de vos cheveux doit être évaluée avant de réserver cette prestation.',
          409,
        );
      }

      const slots = await slotsInTx(tx, {
        dateISO: input.dateISO,
        timeZone: input.timeZone,
        durationMinutes: snapshot.durationMinutes,
        settings,
        now,
      });
      const slot = slots.find(
        (candidate) => candidate.startsAt.getTime() === input.startsAt.getTime(),
      );
      if (!slot) {
        throw new AppError(
          'SLOT_TAKEN',
          'Ce créneau n’est plus disponible. Choisissez un autre horaire.',
          409,
        );
      }

      const customer = existingCustomer
        ? await tx.customer.findUniqueOrThrow({ where: { id: existingCustomer.id } })
        : await tx.customer.create({
            data: { name: input.name, email: input.email, phone: input.phone },
          });

      const status: AppointmentStatus =
        assessmentAccepted || (engine.verdict === 'COMPATIBLE' && engine.nextStep === 'BOOK')
          ? 'CONFIRMED'
          : 'PENDING';
      const cancelToken = randomBytes(32).toString('hex');
      const holdExpiresAt =
        status === 'PENDING' && settings.holdSlotMinutes > 0
          ? new Date(now.getTime() + settings.holdSlotMinutes * 60_000)
          : null;

      const appointment = await tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status,
          // Total figé = prestation (remisée) + frais de déplacement (jamais remisés).
          priceCents: addTravelFee(
            discount ? discount.finalPriceCents : snapshot.priceCents,
            home.travelFeeCents,
          ),
          homeService: home.homeService,
          travelFeeCents: home.travelFeeCents,
          homeAddress: home.homeService ? homeAddress : null,
          promotionId: discount?.promotionId ?? null,
          promotionName: discount?.promotionName ?? null,
          discountCents: discount?.discountCents ?? null,
          durationMinutes: snapshot.durationMinutes,
          selectedOptions: snapshot.selectedOptions as unknown as Prisma.InputJsonValue,
          hairInfo: input.answers as Prisma.InputJsonValue,
          comments: input.comment || null,
          cancelToken,
          cancelTokenExpiresAt: buildCancellationExpiry(slot.startsAt),
          holdExpiresAt,
        },
      });

      if (assessment && assessmentAccepted) {
        await tx.hairAssessment.update({
          where: { id: assessment.id },
          data: {
            appointmentId: appointment.id,
            status: status === 'CONFIRMED' ? 'CONFIRMED' : 'BOOKING_PENDING',
          },
        });
      }

      if (input.waitlistToken) {
        await tx.waitlistEntry.updateMany({
          where: { notifyToken: input.waitlistToken, status: 'NOTIFIED' },
          data: { status: 'CONFIRMED', confirmedAppointmentId: appointment.id },
        });
      }

      const notificationContext = {
        appointmentId: appointment.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        serviceName: service.name,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        status,
        cancelToken,
        settings,
        homeService: home.homeService,
        homeAddress: home.homeService ? homeAddress : null,
        travelFeeCents: home.travelFeeCents,
      };
      await queueAppointmentNotifications(tx, 'created', notificationContext);
      if (status === 'CONFIRMED') {
        await queueAppointmentNotifications(tx, 'confirmed', notificationContext);
      }

      return {
        appointmentId: appointment.id,
        reference: bookingReference(appointment.id),
        status,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        durationMinutes: appointment.durationMinutes,
        priceCents: appointment.priceCents,
        homeService: home.homeService,
        travelFeeCents: home.travelFeeCents,
        cancelToken,
        serviceName: service.name,
        customerEmail: customer.email,
      } satisfies CreatedBooking;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  await logAudit({
    userId: null,
    action: 'appointment.create',
    entityType: 'Appointment',
    entityId: created.appointmentId,
    metadata: {
      status: created.status,
      serviceName: created.serviceName,
      // Booléen seulement : jamais l'adresse de la cliente dans l'audit.
      homeService: created.homeService,
      startsAt: created.startsAt.toISOString(),
    },
  });

  return created;
}

/* ------------------------------------------------------------------ */
/* Reprogrammation (P6.8)                                              */
/* ------------------------------------------------------------------ */

export async function getRescheduleSlots(input: {
  appointmentId: string;
  dateISO: string;
  timeZone: string;
}): Promise<Array<{ startsAt: Date; endsAt: Date; startMinute: number; endMinute: number }>> {
  const appointment = await db.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, durationMinutes: true, status: true },
  });
  if (!appointment) throw new AppError('NOT_FOUND', 'Rendez-vous introuvable.', 404);
  if (!['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status)) {
    throw new AppError('CONFLICT', 'Ce rendez-vous ne peut plus être reprogrammé.', 409);
  }
  const settings = await getSalonSettingsForSlots();
  return db.$transaction(async (tx) => {
    return (
      (await slotsInTx(tx, {
        dateISO: input.dateISO,
        timeZone: input.timeZone,
        durationMinutes: appointment.durationMinutes,
        settings,
        excludeAppointmentId: appointment.id,
        now: new Date(),
      })) ?? []
    ).map((slot) => ({
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
    }));
  });
}

export async function rescheduleAppointment(input: {
  appointmentId: string;
  dateISO: string;
  startsAt: Date;
  timeZone: string;
  userId?: string | null;
}): Promise<{ appointmentId: string; startsAt: Date; status: AppointmentStatus }> {
  const updated = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`;
      const appointment = await tx.appointment.findUnique({
        where: { id: input.appointmentId },
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          service: { select: { name: true } },
        },
      });
      if (!appointment) throw new AppError('NOT_FOUND', 'Rendez-vous introuvable.', 404);
      assertTransition(appointment.status, 'RESCHEDULED');

      const settings = await settingsInTx(tx);
      const slots = await slotsInTx(tx, {
        dateISO: input.dateISO,
        timeZone: input.timeZone,
        durationMinutes: appointment.durationMinutes,
        settings,
        excludeAppointmentId: appointment.id,
        now: new Date(),
      });
      const slot = slots.find(
        (candidate) => candidate.startsAt.getTime() === input.startsAt.getTime(),
      );
      if (!slot) {
        throw new AppError(
          'SLOT_TAKEN',
          'Ce nouveau créneau n’est plus disponible. Choisissez un autre horaire.',
          409,
        );
      }

      const result = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status: 'RESCHEDULED',
          rescheduledFrom: appointment.startsAt,
          cancelTokenExpiresAt: buildCancellationExpiry(slot.startsAt),
          holdExpiresAt: null,
          cancelledAt: null,
          cancelReason: null,
        },
      });

      await queueAppointmentNotifications(tx, 'rescheduled', {
        appointmentId: appointment.id,
        customerName: appointment.customer.name,
        customerEmail: appointment.customer.email,
        customerPhone: appointment.customer.phone,
        serviceName: appointment.service.name,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: 'RESCHEDULED',
        cancelToken: appointment.cancelToken,
        settings,
        homeService: appointment.homeService,
        homeAddress: appointment.homeAddress,
        travelFeeCents: appointment.travelFeeCents,
        idempotencySuffix: slot.startsAt.toISOString(),
      });
      await notifyWaitlistForFreedSlot(
        tx,
        appointment.serviceId,
        appointment.startsAt,
        appointment.service.name,
      );

      return { appointmentId: result.id, startsAt: result.startsAt, status: result.status };
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  await logAudit({
    userId: input.userId ?? null,
    action: 'appointment.reschedule',
    entityType: 'Appointment',
    entityId: updated.appointmentId,
    metadata: { startsAt: updated.startsAt.toISOString() },
  }).catch(() => undefined);
  return updated;
}

/* ------------------------------------------------------------------ */
/* Annulations et transitions (P6.5 à P6.7)                            */
/* ------------------------------------------------------------------ */

export async function updateAppointmentStatus(input: {
  appointmentId: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW';
  userId: string;
}): Promise<void> {
  const appointment = await db.appointment.findUnique({
    where: { id: input.appointmentId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      service: { select: { name: true } },
    },
  });
  if (!appointment) throw new AppError('NOT_FOUND', 'Rendez-vous introuvable.', 404);
  assertTransition(appointment.status, input.status);
  // Terminer / marquer absente n'a de sens qu'une fois le rendez-vous commencé.
  if (
    (input.status === 'COMPLETED' || input.status === 'NO_SHOW') &&
    appointment.startsAt.getTime() > Date.now()
  ) {
    throw new AppError(
      'NOT_STARTED',
      'Ce rendez-vous n’a pas encore commencé : impossible de le clôturer.',
      409,
    );
  }
  const settings = await getSalonSettingsForSlots();

  await db.$transaction(async (tx) => {
    // Garde de concurrence : le statut ne doit pas avoir changé depuis la lecture.
    const updated = await tx.appointment.updateMany({
      where: { id: appointment.id, status: appointment.status },
      data: {
        status: input.status,
        holdExpiresAt: null,
        ...(input.status === 'CONFIRMED' ? { cancelledAt: null, cancelReason: null } : {}),
      },
    });
    if (updated.count === 0) {
      throw new AppError(
        'CONFLICT',
        'Ce rendez-vous vient d’être modifié. Rechargez la page puis réessayez.',
        409,
      );
    }
    if (input.status === 'CONFIRMED') {
      await queueAppointmentNotifications(tx, 'confirmed', {
        appointmentId: appointment.id,
        customerName: appointment.customer.name,
        customerEmail: appointment.customer.email,
        customerPhone: appointment.customer.phone,
        serviceName: appointment.service.name,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        status: 'CONFIRMED',
        cancelToken: appointment.cancelToken,
        settings,
        homeService: appointment.homeService,
        homeAddress: appointment.homeAddress,
        travelFeeCents: appointment.travelFeeCents,
      });
    }
    if (input.status === 'COMPLETED') {
      await createReviewRequest(tx, {
        id: appointment.id,
        customerId: appointment.customerId,
        serviceId: appointment.serviceId,
        endsAt: appointment.endsAt,
        customerEmail: appointment.customer.email,
        customerName: appointment.customer.name,
        serviceName: appointment.service.name,
      });
    }
  });

  await logAudit({
    userId: input.userId,
    action: `appointment.${input.status.toLowerCase()}`,
    entityType: 'Appointment',
    entityId: appointment.id,
    metadata: { status: input.status },
  });
}

export async function cancelAppointmentByAdmin(input: {
  appointmentId: string;
  reason: string;
  userId: string;
}): Promise<void> {
  const appointment = await db.appointment.findUnique({
    where: { id: input.appointmentId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      service: { select: { name: true } },
    },
  });
  if (!appointment) throw new AppError('NOT_FOUND', 'Rendez-vous introuvable.', 404);
  assertTransition(appointment.status, 'CANCELLED_BY_ADMIN');
  const settings = await getSalonSettingsForSlots();

  await db.$transaction(async (tx) => {
    // Garde de concurrence : évite d'annuler un rendez-vous déjà clos entre-temps.
    const updated = await tx.appointment.updateMany({
      where: { id: appointment.id, status: appointment.status },
      data: {
        status: 'CANCELLED_BY_ADMIN',
        cancelledAt: new Date(),
        cancelReason: input.reason || null,
      },
    });
    if (updated.count === 0) {
      throw new AppError(
        'CONFLICT',
        'Ce rendez-vous vient d’être modifié. Rechargez la page puis réessayez.',
        409,
      );
    }
    await queueAppointmentNotifications(tx, 'cancelled_by_admin', {
      appointmentId: appointment.id,
      customerName: appointment.customer.name,
      customerEmail: appointment.customer.email,
      customerPhone: appointment.customer.phone,
      serviceName: appointment.service.name,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: 'CANCELLED_BY_ADMIN',
      cancelToken: appointment.cancelToken,
      reason: input.reason || null,
      settings,
    });
    await notifyWaitlistForFreedSlot(
      tx,
      appointment.serviceId,
      appointment.startsAt,
      appointment.service.name,
    );
  });

  await logAudit({
    userId: input.userId,
    action: 'appointment.cancel_admin',
    entityType: 'Appointment',
    entityId: appointment.id,
    // Pas de texte libre (PII) dans l'audit : le motif reste sur le rendez-vous.
    metadata: {
      hasReason: input.reason.trim().length > 0,
      reasonLength: input.reason.trim().length,
    },
  });
}

export async function cancelAppointmentByCustomer(input: {
  token: string;
  reason: string;
}): Promise<{ startsAt: Date; serviceName: string }> {
  const appointment = await db.appointment.findUnique({
    where: { cancelToken: input.token },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      service: { select: { name: true } },
    },
  });
  if (!appointment) {
    throw new AppError('NOT_FOUND', 'Ce lien d’annulation est invalide ou expiré.', 404);
  }
  const now = new Date();
  if (!isCancellationTokenValid(appointment.cancelTokenExpiresAt, now)) {
    throw new AppError('TOKEN_EXPIRED', 'Ce lien d’annulation a expiré.', 410);
  }
  const policy = evaluateCancellationPolicy({
    startsAt: appointment.startsAt,
    now,
    minCancelNoticeHours: (await getSalonSettingsForSlots()).minCancelNoticeHours,
  });
  if (!policy.allowed) throw new AppError('CANCEL_WINDOW', policy.message, 409);
  assertTransition(appointment.status, 'CANCELLED_BY_CUSTOMER');
  const settings = await getSalonSettingsForSlots();
  if (settings.cancelReasonRequired && !input.reason.trim()) {
    throw new AppError('REASON_REQUIRED', 'Merci d’indiquer un motif d’annulation.', 400);
  }

  await db.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CANCELLED_BY_CUSTOMER',
        cancelledAt: now,
        cancelReason: input.reason || null,
      },
    });
    await queueAppointmentNotifications(tx, 'cancelled_by_customer', {
      appointmentId: appointment.id,
      customerName: appointment.customer.name,
      customerEmail: appointment.customer.email,
      customerPhone: appointment.customer.phone,
      serviceName: appointment.service.name,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: 'CANCELLED_BY_CUSTOMER',
      cancelToken: appointment.cancelToken,
      reason: input.reason || null,
      settings,
    });
    await notifyWaitlistForFreedSlot(
      tx,
      appointment.serviceId,
      appointment.startsAt,
      appointment.service.name,
    );
  });

  await logAudit({
    userId: null,
    action: 'appointment.cancel_customer',
    entityType: 'Appointment',
    entityId: appointment.id,
    // Pas de texte libre (PII) dans l'audit : le motif reste sur le rendez-vous.
    metadata: {
      hasReason: input.reason.trim().length > 0,
      reasonLength: input.reason.trim().length,
    },
  });

  return { startsAt: appointment.startsAt, serviceName: appointment.service.name };
}
