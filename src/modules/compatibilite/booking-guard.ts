import type { AssessmentStatus } from '@prisma/client';
import {
  evaluateCompatibility,
  type CompatibilityAnswers,
  type CompatibilityRuleData,
  type CompatibilityVerdict,
} from './engine';

/* ============================================================
 * Garde de réservation (P5.7, P5.8)
 * Rejoue les règles côté serveur au moment d'enregistrer une
 * réservation. Fonction pure : elle ne crée JAMAIS d'Appointment.
 * La disponibilité du créneau reste vérifiée séparément en phase 6.
 * ============================================================ */

export type BookingBlockReason =
  | 'RULES_OK'
  | 'ASSESSMENT_ACCEPTED'
  | 'INCOMPATIBLE'
  | 'AWAITING_ASSESSMENT'
  | 'AWAITING_DECISION'
  | 'AWAITING_INFORMATION'
  | 'ASSESSMENT_REFUSED'
  | 'REVIEW_REQUIRED';

export interface BookingGuardAssessment {
  serviceId: string;
  status: AssessmentStatus;
}

export interface BookingGuardResult {
  allowed: boolean;
  reason: BookingBlockReason;
  verdict: CompatibilityVerdict;
  message: string;
}

/**
 * Décide si une réservation peut être enregistrée du point de vue capillaire.
 * Une évaluation acceptée pour la bonne prestation autorise la réservation.
 * Sinon, les règles sont rejouées : seules les réponses compatibles et
 * auto-validées passent. Aucune écriture en base n'est effectuée ici.
 */
export function verifyBookingCompatibility(input: {
  serviceId: string;
  rule: CompatibilityRuleData | null;
  answers: CompatibilityAnswers;
  assessment: BookingGuardAssessment | null;
}): BookingGuardResult {
  const { serviceId, rule, answers, assessment } = input;
  const evaluation = evaluateCompatibility({ rule, answers });

  if (assessment && assessment.serviceId === serviceId) {
    if (assessment.status === 'ACCEPTED' || assessment.status === 'CONFIRMED') {
      return {
        allowed: true,
        reason: 'ASSESSMENT_ACCEPTED',
        verdict: evaluation.verdict,
        message: 'Évaluation capillaire acceptée par Sarielle.',
      };
    }
    if (assessment.status === 'REFUSED') {
      return {
        allowed: false,
        reason: 'ASSESSMENT_REFUSED',
        verdict: evaluation.verdict,
        message: 'Cette évaluation capillaire a été refusée.',
      };
    }
    if (assessment.status === 'INFO_REQUESTED') {
      return {
        allowed: false,
        reason: 'AWAITING_INFORMATION',
        verdict: evaluation.verdict,
        message: 'Des informations complémentaires sont attendues avant la réservation.',
      };
    }
    if (assessment.status === 'RECEIVED' || assessment.status === 'IN_PROGRESS') {
      return {
        allowed: false,
        reason: 'AWAITING_DECISION',
        verdict: evaluation.verdict,
        message: 'L’évaluation capillaire est en attente de la décision de Sarielle.',
      };
    }
  }

  if (evaluation.verdict === 'INCOMPATIBLE') {
    return {
      allowed: false,
      reason: 'INCOMPATIBLE',
      verdict: evaluation.verdict,
      message: evaluation.message,
    };
  }

  if (evaluation.nextStep !== 'BOOK') {
    return {
      allowed: false,
      reason: evaluation.verdict === 'UNCERTAIN' ? 'AWAITING_ASSESSMENT' : 'REVIEW_REQUIRED',
      verdict: evaluation.verdict,
      message: evaluation.message,
    };
  }

  return {
    allowed: true,
    reason: 'RULES_OK',
    verdict: evaluation.verdict,
    message: evaluation.message,
  };
}
