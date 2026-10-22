import { z } from 'zod';

/* ============================================================
 * Validation Zod du parcours de compatibilité (P5.3 à P5.6)
 * Toute entrée publique repasse par ces schémas côté serveur.
 * ============================================================ */

export const ASSESSMENT_DECISIONS = [
  'ACCEPT',
  'REFUSE',
  'REQUEST_INFO',
  'PROPOSE_ALTERNATIVE',
  'ALLOW_CONDITIONAL',
] as const;

export type AssessmentDecision = (typeof ASSESSMENT_DECISIONS)[number];

export const ASSESSMENT_DECISION_LABELS: Record<AssessmentDecision, string> = {
  ACCEPT: 'Accepter la compatibilité',
  REFUSE: 'Refuser la prestation',
  REQUEST_INFO: 'Demander des informations',
  PROPOSE_ALTERNATIVE: 'Proposer une autre coiffure',
  ALLOW_CONDITIONAL: 'Autoriser sous conditions',
};

const answerValueSchema = z.union([
  z.string().max(1000),
  z.boolean(),
  z.array(z.string().max(200)).max(20),
]);

export const assessmentAnswersSchema = z
  .record(z.string().max(80), answerValueSchema)
  .refine((answers) => Object.keys(answers).length <= 40, {
    message: 'Trop de réponses transmises.',
  });

export type AssessmentAnswersInput = z.infer<typeof assessmentAnswersSchema>;

const nameSchema = z.string().trim().min(2, 'Indiquez votre nom.').max(80, 'Le nom est trop long.');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email('Adresse e-mail invalide.'));

const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Numéro de téléphone trop court.')
  .max(30, 'Numéro de téléphone trop long.')
  .regex(/^[0-9+\s().-]+$/, 'Numéro de téléphone invalide.');

const commentSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : ''),
  z.string().max(1000, 'Le commentaire est limité à 1000 caractères.').default(''),
);

export const assessmentPreviewSchema = z.object({
  serviceSlug: z.string().trim().min(1, 'Prestation manquante.').max(160),
  answers: assessmentAnswersSchema,
});

export const assessmentSubmissionSchema = z.object({
  serviceSlug: z.string().trim().min(1, 'Prestation manquante.').max(160),
  answers: assessmentAnswersSchema,
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  comment: commentSchema,
  consent: z.preprocess(
    (value) => value === 'on' || value === true || value === 'true',
    z.boolean().refine((value) => value, {
      message: 'Vous devez accepter l’utilisation de vos informations.',
    }),
  ),
});

export type AssessmentSubmissionInput = z.infer<typeof assessmentSubmissionSchema>;

export const assessmentDecisionSchema = z.object({
  assessmentId: z.string().trim().min(1, 'Évaluation manquante.'),
  decision: z.enum(ASSESSMENT_DECISIONS),
  decisionMessage: z
    .string()
    .trim()
    .min(3, 'Rédigez le message destiné à la cliente.')
    .max(1000, 'Le message est limité à 1000 caractères.'),
  decisionNote: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().max(1000, 'La note interne est limitée à 1000 caractères.').default(''),
  ),
});

export type AssessmentDecisionInput = z.infer<typeof assessmentDecisionSchema>;

export const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Reçue',
  IN_PROGRESS: 'En cours',
  INFO_REQUESTED: 'Informations demandées',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  BOOKING_PENDING: 'Réservation en attente',
  CONFIRMED: 'Confirmée',
};
