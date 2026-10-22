import type { HairLength, PhotoPolicy } from '@prisma/client';

/* ============================================================
 * Moteur de compatibilité capillaire (P5.2)
 * Fonction pure : aucune I/O, aucune décision front-only.
 * Les règles viennent de la base, la décision est rejouée côté serveur.
 * ============================================================ */

export type CompatibilityVerdict = 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNCERTAIN';
export type CompatibilityNextStep = 'BOOK' | 'SUBMIT_ASSESSMENT' | 'BLOCKED';
export type LocsAnswer = 'YES' | 'NO' | 'UNSURE';
export type HairLengthAnswer = HairLength | 'UNSURE';

export interface CompatibilityRuleData {
  acceptedLengths: HairLength[];
  acceptedHairTypes: string[];
  requiresLocs: boolean;
  incompatibleLocs: boolean;
  photoPolicy: PhotoPolicy;
  autoApprove: boolean;
  conditionsNote: string | null;
  incompatibleMessage: string | null;
  uncertainMessage: string | null;
}

export interface CompatibilityAnswers {
  hairLength?: HairLengthAnswer | null;
  hasLocs?: LocsAnswer | null;
  hairType?: string | null;
  shortCut?: boolean | null;
  notes?: string | null;
}

export type CompatibilityReason =
  | 'ACCEPTED'
  | 'LENGTH'
  | 'LOCS_REQUIRED'
  | 'LOCS_INCOMPATIBLE'
  | 'SHORT_CUT'
  | 'HAIR_TYPE'
  | 'UNSURE_LENGTH'
  | 'UNSURE_LOCS'
  | 'MISSING_ANSWERS';

export interface CompatibilityResult {
  verdict: CompatibilityVerdict;
  reason: CompatibilityReason;
  message: string;
  nextStep: CompatibilityNextStep;
  photoRequired: boolean;
  canRequestPhotoEvaluation: boolean;
  requiresManualReview: boolean;
  missingAnswers: string[];
  conditionsNote: string | null;
}

export const COMPATIBILITY_MESSAGES = {
  compatible: 'Vos informations capillaires sont compatibles avec cette prestation.',
  length:
    "Cette coiffure nécessite une longueur de cheveux suffisante pour permettre sa réalisation. D'après votre réponse, elle pourrait ne pas être adaptée. Vous pouvez envoyer une photo de vos cheveux afin que Sarielle vérifie si la prestation est réalisable.",
  locsRequired:
    'Cette prestation nécessite des locs déjà posées. Si ce n’est pas votre cas, elle ne peut pas être réalisée.',
  locsIncompatible: 'Cette prestation n’est pas réalisable sur des cheveux portés en locs.',
  shortCut:
    'Une coupe très courte ou une zone rasée peut empêcher la réalisation de cette prestation. Envoyez une photo pour que Sarielle vérifie.',
  hairType: 'Votre type de cheveux nécessite une vérification par Sarielle avant la réservation.',
  unsureLength:
    'Vous avez indiqué ne pas être sûr(e) de la longueur de vos cheveux. Envoyez une photo afin que Sarielle évalue la compatibilité.',
  unsureLocs:
    'Vous avez indiqué ne pas être sûr(e) de la présence de locs. Envoyez une photo afin que Sarielle vérifie.',
  missing: 'Complétez les informations capillaires demandées pour évaluer la compatibilité.',
  manualReview:
    'Vos réponses sont compatibles avec cette prestation. Sarielle doit valider les informations avant la réservation.',
  photoRequired: 'Une photo de vos cheveux est nécessaire avant la réservation.',
} as const;

function customOr(message: string | null | undefined, fallback: string): string {
  const trimmed = message?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function result(
  verdict: CompatibilityVerdict,
  reason: CompatibilityReason,
  message: string,
  rule: CompatibilityRuleData | null,
  extra: Partial<Pick<CompatibilityResult, 'missingAnswers'>> = {},
): CompatibilityResult {
  const photoRequired = rule?.photoPolicy === 'REQUIRED';
  const canRequestPhotoEvaluation = rule ? rule.photoPolicy !== 'FORBIDDEN' : false;
  const requiresManualReview = rule ? !rule.autoApprove : false;
  const conditionsNote = rule?.conditionsNote?.trim() || null;

  let nextStep: CompatibilityNextStep;
  if (verdict === 'COMPATIBLE') {
    nextStep = photoRequired || requiresManualReview ? 'SUBMIT_ASSESSMENT' : 'BOOK';
  } else if (verdict === 'UNCERTAIN') {
    nextStep = 'SUBMIT_ASSESSMENT';
  } else {
    nextStep = canRequestPhotoEvaluation ? 'SUBMIT_ASSESSMENT' : 'BLOCKED';
  }

  return {
    verdict,
    reason,
    message,
    nextStep,
    photoRequired,
    canRequestPhotoEvaluation,
    requiresManualReview,
    missingAnswers: extra.missingAnswers ?? [],
    conditionsNote,
  };
}

/**
 * Évalue la compatibilité d'une prestation à partir des règles et des réponses.
 * Ordre de décision : informations manquantes, doutes explicites, locs, longueur,
 * coupe courte, type de cheveux, puis compatibilité.
 */
export function evaluateCompatibility(input: {
  rule: CompatibilityRuleData | null;
  answers: CompatibilityAnswers;
}): CompatibilityResult {
  const { rule, answers } = input;

  if (rule === null) {
    return result('COMPATIBLE', 'ACCEPTED', COMPATIBILITY_MESSAGES.compatible, null);
  }

  const lengthIsRestricted = rule.acceptedLengths.length > 0;
  const locsIsRestricted = rule.requiresLocs || rule.incompatibleLocs;
  const hairTypeIsRestricted = rule.acceptedHairTypes.length > 0;

  const missingAnswers: string[] = [];
  if (lengthIsRestricted && answers.hairLength == null) missingAnswers.push('hair_length');
  if (locsIsRestricted && answers.hasLocs == null) missingAnswers.push('has_locs');
  if (hairTypeIsRestricted && answers.hairType == null) missingAnswers.push('hair_type');

  if (missingAnswers.length > 0) {
    return result(
      'UNCERTAIN',
      'MISSING_ANSWERS',
      customOr(rule.uncertainMessage, COMPATIBILITY_MESSAGES.missing),
      rule,
      { missingAnswers },
    );
  }

  if (answers.hasLocs === 'UNSURE') {
    return result(
      'UNCERTAIN',
      'UNSURE_LOCS',
      customOr(rule.uncertainMessage, COMPATIBILITY_MESSAGES.unsureLocs),
      rule,
    );
  }

  if (answers.hairLength === 'UNSURE') {
    return result(
      'UNCERTAIN',
      'UNSURE_LENGTH',
      customOr(rule.uncertainMessage, COMPATIBILITY_MESSAGES.unsureLength),
      rule,
    );
  }

  if (rule.requiresLocs && answers.hasLocs === 'NO') {
    return result(
      'INCOMPATIBLE',
      'LOCS_REQUIRED',
      customOr(rule.incompatibleMessage, COMPATIBILITY_MESSAGES.locsRequired),
      rule,
    );
  }

  if (rule.incompatibleLocs && answers.hasLocs === 'YES') {
    return result(
      'INCOMPATIBLE',
      'LOCS_INCOMPATIBLE',
      customOr(rule.incompatibleMessage, COMPATIBILITY_MESSAGES.locsIncompatible),
      rule,
    );
  }

  if (
    lengthIsRestricted &&
    answers.hairLength != null &&
    !rule.acceptedLengths.includes(answers.hairLength)
  ) {
    return result(
      'INCOMPATIBLE',
      'LENGTH',
      customOr(rule.incompatibleMessage, COMPATIBILITY_MESSAGES.length),
      rule,
    );
  }

  if (answers.shortCut === true && lengthIsRestricted && !rule.acceptedLengths.includes('SHORT')) {
    return result(
      'INCOMPATIBLE',
      'SHORT_CUT',
      customOr(rule.incompatibleMessage, COMPATIBILITY_MESSAGES.shortCut),
      rule,
    );
  }

  if (
    hairTypeIsRestricted &&
    answers.hairType != null &&
    !rule.acceptedHairTypes.includes(answers.hairType)
  ) {
    return result(
      'UNCERTAIN',
      'HAIR_TYPE',
      customOr(rule.uncertainMessage, COMPATIBILITY_MESSAGES.hairType),
      rule,
    );
  }

  if (rule.photoPolicy === 'REQUIRED') {
    return result('COMPATIBLE', 'ACCEPTED', COMPATIBILITY_MESSAGES.photoRequired, rule);
  }

  if (!rule.autoApprove) {
    return result('COMPATIBLE', 'ACCEPTED', COMPATIBILITY_MESSAGES.manualReview, rule);
  }

  return result('COMPATIBLE', 'ACCEPTED', COMPATIBILITY_MESSAGES.compatible, rule);
}
