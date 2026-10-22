import type { Prisma } from '@prisma/client';
import type { AssessmentDecision } from './schemas';

/* ============================================================
 * Notification e-mail de la décision de Patricia sur une évaluation.
 * Fonction pure : construit la ligne de file d'envoi, ou null si la
 * cliente n'a pas d'e-mail exploitable. Ne crée jamais de réservation.
 * ============================================================ */

const EMAIL_VARIANT = {
  ACCEPT: 'ACCEPTED',
  ALLOW_CONDITIONAL: 'CONDITIONAL',
  REFUSE: 'REFUSED',
  REQUEST_INFO: 'INFO_REQUESTED',
  PROPOSE_ALTERNATIVE: 'INFO_REQUESTED',
} as const satisfies Record<AssessmentDecision, string>;

export interface AssessmentNotificationInput {
  assessmentId: string;
  decision: AssessmentDecision;
  serviceName: string;
  customerName: string;
  customerEmail: string | null | undefined;
  message: string;
  decidedAt: Date;
}

export function buildAssessmentDecisionNotification(input: AssessmentNotificationInput): {
  idempotencyKey: string;
  recipient: string;
  templateKey: string;
  payload: Prisma.InputJsonValue;
} | null {
  const email = input.customerEmail?.trim().toLowerCase() ?? '';
  if (!email.includes('@')) return null;
  return {
    idempotencyKey: `assessment:${input.assessmentId}:decision:${input.decidedAt.toISOString()}:client`,
    recipient: email,
    templateKey: 'assessment_decision',
    payload: {
      kind: 'assessment',
      assessmentId: input.assessmentId,
      customerName: input.customerName,
      customerEmail: email,
      serviceName: input.serviceName,
      decision: EMAIL_VARIANT[input.decision],
      message: input.message,
    },
  };
}
