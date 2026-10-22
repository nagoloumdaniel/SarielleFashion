'use server';

import type { AssessmentStatus, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { requireAdmin } from '@/modules/auth/guards';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import { flushEmailsSoon } from '@/modules/notifications/flush';
import { adminNotificationRecipient } from '@/modules/notifications/service';
import { logAudit } from '@/modules/stats/audit';
import { deletePrivateImages, storePrivateImages } from '@/modules/fichiers/private-images';
import {
  evaluateCompatibility,
  type CompatibilityNextStep,
  type CompatibilityVerdict,
} from './engine';
import { buildPublicQuestions, isQuestionVisible, normalizeAnswers } from './questions';
import { buildAssessmentDecisionNotification } from './decision-notification';
import { getCompatibilityServiceBySlug, mapCompatibilityRule } from './queries';
import { suggestCompatibleServices } from './suggestions';
import {
  assessmentDecisionSchema,
  assessmentPreviewSchema,
  assessmentSubmissionSchema,
  type AssessmentDecision,
} from './schemas';

/* ============================================================
 * Actions serveur du parcours de compatibilité (P5.3 à P5.8)
 * - previewCompatibility : verdict serveur, aucune écriture.
 * - submitAssessment : crée la cliente et la demande, photos privées.
 * - decideAssessment : décision de Patricia, elle ne crée JAMAIS
 *   d'Appointment (règle d'or P5.7).
 * ============================================================ */

function parseAnswersJson(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  if (raw.length > 20_000) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseForm<T extends z.ZodType>(
  schema: T,
  raw: unknown,
): { data: z.infer<T> } | { error: string } {
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Données invalides.' };
  }
  return { data: result.data };
}

export interface CompatibilityPreview {
  verdict: CompatibilityVerdict;
  nextStep: CompatibilityNextStep;
  message: string;
  photoRequired: boolean;
  canRequestPhotoEvaluation: boolean;
  requiresManualReview: boolean;
  conditionsNote: string | null;
  missingAnswers: string[];
  suggestions: { id: string; name: string; slug: string }[];
}

export type CompatibilityPreviewState = {
  error?: string;
  preview?: CompatibilityPreview;
  serviceName?: string;
};

export async function previewCompatibility(
  _prev: CompatibilityPreviewState,
  formData: FormData,
): Promise<CompatibilityPreviewState> {
  const ip = await getClientIp();
  const limit = await rateLimit(`compat:preview:${ip}`, { max: 40, windowMs: 60_000 });
  if (!limit.allowed) {
    return { error: 'Trop de demandes. Réessayez dans une minute.' };
  }

  const answers = parseAnswersJson(formData.get('answers'));
  if (!answers) return { error: 'Réponses illisibles.' };

  const parsed = parseForm(assessmentPreviewSchema, {
    serviceSlug: String(formData.get('serviceSlug') ?? ''),
    answers,
  });
  if ('error' in parsed) return { error: parsed.error };

  const service = await getCompatibilityServiceBySlug(parsed.data.serviceSlug);
  if (!service) return { error: 'Cette prestation n’est plus disponible.' };

  const questions = buildPublicQuestions({
    rule: service.rule,
    configured: service.questions,
  });
  const visibleQuestions = questions.filter((question) =>
    isQuestionVisible(question.condition, answers),
  );
  const missingRequired = visibleQuestions.filter(
    (question) =>
      question.required &&
      question.type !== 'PHOTO' &&
      (answers[question.key] === undefined ||
        answers[question.key] === null ||
        (typeof answers[question.key] === 'string' &&
          (answers[question.key] as string).trim() === '') ||
        (Array.isArray(answers[question.key]) &&
          (answers[question.key] as unknown[]).length === 0)),
  );
  if (missingRequired.length > 0) {
    return { error: 'Répondez aux questions obligatoires avant de continuer.' };
  }

  const normalizedAnswers = normalizeAnswers(answers);
  const result = evaluateCompatibility({ rule: service.rule, answers: normalizedAnswers });

  let suggestions: CompatibilityPreview['suggestions'] = [];
  if (result.verdict === 'INCOMPATIBLE') {
    const candidates = await db.service.findMany({
      where: { status: 'PUBLISHED', category: { active: true }, id: { not: service.id } },
      select: { id: true, name: true, slug: true, categoryId: true, compatibility: true },
      take: 30,
    });
    suggestions = suggestCompatibleServices(
      candidates.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        categoryId: c.categoryId,
        rule: mapCompatibilityRule(c.compatibility),
      })),
      service.id,
      service.categoryId,
      normalizedAnswers,
    );
  }

  return {
    serviceName: service.name,
    preview: {
      verdict: result.verdict,
      nextStep: result.nextStep,
      message: result.message,
      photoRequired: result.photoRequired,
      canRequestPhotoEvaluation: result.canRequestPhotoEvaluation,
      requiresManualReview: result.requiresManualReview,
      conditionsNote: result.conditionsNote,
      missingAnswers: result.missingAnswers,
      suggestions,
    },
  };
}

export interface CompatibilitySubmitSuccess {
  reference: string;
  status: 'RECEIVED' | 'COMPATIBLE';
  message: string;
  canBook: boolean;
}

export type CompatibilitySubmitState = {
  error?: string;
  success?: CompatibilitySubmitSuccess;
};

export async function submitAssessment(
  _prev: CompatibilitySubmitState,
  formData: FormData,
): Promise<CompatibilitySubmitState> {
  const ip = await getClientIp();
  const limit = await rateLimit(`compat:submit:${ip}`, { max: 6, windowMs: 10 * 60_000 });
  if (!limit.allowed) {
    return { error: 'Trop de demandes envoyées. Réessayez dans quelques minutes.' };
  }

  // Honeypot : un humain laisse ce champ vide.
  if (String(formData.get('website') ?? '').trim() !== '') {
    return { error: 'Demande refusée.' };
  }

  const answers = parseAnswersJson(formData.get('answers'));
  if (!answers) return { error: 'Réponses illisibles.' };

  const parsed = parseForm(assessmentSubmissionSchema, {
    serviceSlug: String(formData.get('serviceSlug') ?? ''),
    answers,
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    comment: String(formData.get('comment') ?? ''),
    consent: formData.get('consent'),
  });
  if ('error' in parsed) return { error: parsed.error };

  const service = await getCompatibilityServiceBySlug(parsed.data.serviceSlug);
  if (!service) return { error: 'Cette prestation n’est plus disponible.' };

  const questions = buildPublicQuestions({
    rule: service.rule,
    configured: service.questions,
  });
  const result = evaluateCompatibility({
    rule: service.rule,
    answers: normalizeAnswers(parsed.data.answers),
  });

  if (result.nextStep === 'BLOCKED') {
    return { error: result.message };
  }

  // Réponses compatibles et auto-validées : aucune évaluation à stocker,
  // la réservation sera re-vérifiée côté serveur en phase 6.
  if (result.nextStep === 'BOOK') {
    return {
      success: {
        reference: '',
        status: 'COMPATIBLE',
        message: result.message,
        canBook: true,
      },
    };
  }

  const photoFiles = formData
    .getAll('photos')
    .filter((value): value is File => value instanceof File && value.size > 0);
  const requiresConfiguredPhoto = questions.some(
    (question) =>
      question.type === 'PHOTO' &&
      question.required &&
      isQuestionVisible(question.condition, parsed.data.answers),
  );
  if ((result.photoRequired || requiresConfiguredPhoto) && photoFiles.length === 0) {
    return { error: 'Ajoutez une photo de vos cheveux pour cette prestation.' };
  }

  let photoKeys: string[] = [];
  try {
    photoKeys = await storePrivateImages(photoFiles, 'assessments');
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    console.error(error);
    return { error: 'Impossible d’envoyer la photo. Réessayez plus tard.' };
  }

  // Ne conserver que les réponses des questions réellement visibles.
  const visibleQuestions = questions.filter((question) =>
    isQuestionVisible(question.condition, parsed.data.answers),
  );
  const allowedKeys = new Set(visibleQuestions.map((question) => question.key));
  const storedAnswers = Object.fromEntries(
    Object.entries(parsed.data.answers).filter(([key]) => allowedKeys.has(key)),
  );

  let assessmentId: string;
  try {
    const customer = await db.customer.upsert({
      where: { email: parsed.data.email },
      // Ne jamais écraser les coordonnées d'une cliente existante depuis
      // un formulaire public non authentifié.
      update: {},
      create: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
      },
    });

    const assessment = await db.hairAssessment.create({
      data: {
        serviceId: service.id,
        customerId: customer.id,
        answers: storedAnswers as Prisma.InputJsonValue,
        photoKeys,
        status: 'RECEIVED',
        decisionNote: parsed.data.comment ? `Commentaire cliente : ${parsed.data.comment}` : null,
      },
    });
    assessmentId = assessment.id;

    // Alerte admin (e-mail + notification dashboard) : un échec ne doit jamais faire perdre l'évaluation.
    try {
      const adminEmail = adminNotificationRecipient();
      const payload = {
        kind: 'assessment',
        assessmentId: assessment.id,
        customerName: customer.name,
        customerEmail: customer.email,
        serviceName: service.name,
      } satisfies Prisma.InputJsonValue;
      await db.notification.createMany({
        data: [
          {
            idempotencyKey: `assessment:${assessment.id}:admin:email`,
            recipient: adminEmail,
            templateKey: 'admin_assessment_received',
            payload,
          },
          {
            idempotencyKey: `assessment:${assessment.id}:admin:inapp`,
            recipient: adminEmail,
            channel: 'IN_APP',
            templateKey: 'admin_assessment_received',
            link: `/dashboard/evaluations/${assessment.id}`,
            payload,
          },
        ],
        skipDuplicates: true,
      });
      flushEmailsSoon();
    } catch (notifyError) {
      console.error('[compatibilite] alerte admin non créée', notifyError);
    }
  } catch (error) {
    console.error(error);
    // Ne pas laisser de photos orphelines si l'enregistrement échoue.
    await deletePrivateImages(photoKeys);
    return { error: 'L’enregistrement de la demande a échoué. Réessayez plus tard.' };
  }

  await logAudit({
    userId: null,
    action: 'assessment.submit',
    entityType: 'HairAssessment',
    entityId: assessmentId,
    metadata: {
      serviceId: service.id,
      serviceSlug: service.slug,
      verdict: result.verdict,
      photoCount: photoKeys.length,
    },
  });

  revalidatePath('/dashboard/evaluations');
  revalidatePath('/dashboard');

  return {
    success: {
      reference: `EV-${assessmentId.slice(-6).toUpperCase()}`,
      status: 'RECEIVED',
      message: result.message,
      canBook: false,
    },
  };
}

const DECISION_TARGET_STATUS: Record<AssessmentDecision, AssessmentStatus> = {
  ACCEPT: 'ACCEPTED',
  ALLOW_CONDITIONAL: 'ACCEPTED',
  REFUSE: 'REFUSED',
  REQUEST_INFO: 'INFO_REQUESTED',
  PROPOSE_ALTERNATIVE: 'INFO_REQUESTED',
};

export type AssessmentDecisionState = { error?: string; success?: string };

/**
 * Décision de Patricia sur une évaluation.
 * IMPORTANT (P5.7) : cette action ne crée AUCUN Appointment.
 * Elle enregistre uniquement la décision capillaire et son message.
 */
export async function decideAssessment(
  _prev: AssessmentDecisionState,
  formData: FormData,
): Promise<AssessmentDecisionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = parseForm(assessmentDecisionSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  const assessment = await db.hairAssessment.findUnique({
    where: { id: parsed.data.assessmentId },
    select: {
      id: true,
      status: true,
      serviceId: true,
      service: { select: { name: true } },
      customer: { select: { name: true, email: true } },
      customRequest: { select: { requesterName: true, requesterEmail: true } },
    },
  });
  if (!assessment) return { error: 'Évaluation introuvable.' };

  if (assessment.status === 'ACCEPTED' || assessment.status === 'REFUSED') {
    return { error: 'Cette évaluation a déjà reçu une décision définitive.' };
  }
  if (assessment.status === 'CONFIRMED') {
    return { error: 'Cette évaluation est déjà rattachée à une réservation confirmée.' };
  }

  const status = DECISION_TARGET_STATUS[parsed.data.decision];

  const decidedAt = new Date();
  // La cliente est prévenue par e-mail (file d'envoi, jamais bloquant). Sans e-mail
  // exploitable, on journalise et la décision reste enregistrée.
  const notification = buildAssessmentDecisionNotification({
    assessmentId: assessment.id,
    decision: parsed.data.decision,
    serviceName: assessment.service.name,
    customerName: assessment.customer?.name ?? assessment.customRequest?.requesterName ?? 'Madame',
    customerEmail: assessment.customer?.email ?? assessment.customRequest?.requesterEmail,
    message: parsed.data.decisionMessage,
    decidedAt,
  });

  try {
    await db.$transaction(async (tx) => {
      await tx.hairAssessment.update({
        where: { id: assessment.id },
        data: {
          status,
          decisionMessage: parsed.data.decisionMessage,
          decisionNote: parsed.data.decisionNote || null,
          decidedById: user.id,
          decidedAt,
        },
      });
      if (notification) {
        await tx.notification.createMany({ data: [notification], skipDuplicates: true });
      }
    });
  } catch (error) {
    console.error(error);
    return { error: 'Enregistrement de la décision impossible.' };
  }

  await logAudit({
    userId: user.id,
    action: `assessment.decision.${parsed.data.decision.toLowerCase()}`,
    entityType: 'HairAssessment',
    entityId: assessment.id,
    metadata: {
      serviceId: assessment.serviceId,
      decision: parsed.data.decision,
      status,
    },
  });

  if (notification) {
    flushEmailsSoon();
  } else {
    console.warn(`[evaluation] ${assessment.id} : aucun e-mail cliente, décision non notifiée.`);
  }

  revalidatePath('/dashboard/evaluations');
  revalidatePath(`/dashboard/evaluations/${assessment.id}`);
  revalidatePath('/dashboard');

  const notified = notification
    ? ' La cliente est prévenue par e-mail.'
    : ' Aucun e-mail connu : la cliente n’a pas été prévenue.';
  return {
    success:
      (parsed.data.decision === 'ALLOW_CONDITIONAL'
        ? 'Compatibilité acceptée sous conditions. Aucune réservation n’a été créée.'
        : 'Décision enregistrée. Aucune réservation n’a été créée.') + notified,
  };
}
