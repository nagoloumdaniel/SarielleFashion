import type { AnswerType, HairLength } from '@prisma/client';
import type { CompatibilityAnswers, HairLengthAnswer, LocsAnswer } from './engine';

/* ============================================================
 * Questions capillaires publiques (P5.3)
 * - Questions de base construites depuis les règles de la prestation.
 * - Questions personnalisées configurées dans le dashboard (P4.8).
 * - Affichage conditionnel : aucune question inutile.
 * Module pur, partagé entre le client et le serveur.
 * ============================================================ */

export const CORE_KEYS = {
  hairLength: 'hair_length',
  hasLocs: 'has_locs',
  hairType: 'hair_type',
  shortCut: 'short_cut',
} as const;

export interface PublicQuestionOption {
  value: string;
  label: string;
}

export interface PublicQuestionCondition {
  dependsOn: string;
  equals: string;
}

export interface PublicQuestion {
  key: string;
  label: string;
  type: AnswerType;
  required: boolean;
  options: PublicQuestionOption[];
  help: string | null;
  condition: PublicQuestionCondition | null;
  core: boolean;
}

export interface ConfiguredQuestion {
  key: string;
  label: string;
  type: AnswerType;
  required: boolean;
  active: boolean;
  order: number;
  options: string[];
  condition: unknown;
}

export const HAIR_LENGTH_OPTIONS: Array<{ value: HairLengthAnswer; label: string }> = [
  { value: 'SHORT', label: 'Cheveux courts' },
  { value: 'MEDIUM', label: 'Mi-longs' },
  { value: 'LONG', label: 'Longs' },
  { value: 'VERY_LONG', label: 'Très longs' },
  { value: 'UNSURE', label: 'Je ne suis pas sûr(e)' },
];

export const LOCS_OPTIONS: Array<{ value: LocsAnswer; label: string }> = [
  { value: 'YES', label: 'Oui, je porte des locs' },
  { value: 'NO', label: 'Non, je ne porte pas de locs' },
  { value: 'UNSURE', label: 'Je ne suis pas sûr(e)' },
];

export const HAIR_TYPE_OPTIONS = [
  'Cheveux naturels fins',
  'Cheveux naturels épais',
  'Cheveux bouclés',
  'Cheveux crépus',
  'Cheveux défrisés',
  'Autre',
  'Je ne sais pas',
] as const;

export const YES_NO_OPTIONS: PublicQuestionOption[] = [
  { value: 'YES', label: 'Oui' },
  { value: 'NO', label: 'Non' },
];

export const DEFAULT_QUESTION_OPTIONS: Record<AnswerType, PublicQuestionOption[]> = {
  SINGLE_CHOICE: [],
  MULTI_CHOICE: [],
  BOOLEAN: YES_NO_OPTIONS,
  TEXT: [],
  PHOTO: [],
};

export function conditionFromJson(value: unknown): PublicQuestionCondition | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const dependsOn = typeof record.dependsOn === 'string' ? record.dependsOn.trim() : '';
  const equals = typeof record.equals === 'string' ? record.equals.trim() : '';
  if (!dependsOn || !equals) return null;
  return { dependsOn, equals };
}

export function isQuestionVisible(
  condition: PublicQuestionCondition | null,
  answers: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  const value = answers[condition.dependsOn];
  if (Array.isArray(value)) return value.map(String).includes(condition.equals);
  if (typeof value === 'boolean') return String(value) === condition.equals;
  return String(value ?? '') === condition.equals;
}

export function isQuestionAnswered(
  question: PublicQuestion,
  answers: Record<string, unknown>,
): boolean {
  const value = answers[question.key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return value !== undefined && value !== null;
}

/**
 * Construit le questionnaire réellement utile pour une prestation :
 * seules les questions liées aux restrictions configurées sont posées.
 */
export function buildPublicQuestions(input: {
  rule: {
    acceptedLengths: HairLength[];
    acceptedHairTypes: string[];
    requiresLocs: boolean;
    incompatibleLocs: boolean;
  } | null;
  configured: ConfiguredQuestion[];
}): PublicQuestion[] {
  const { rule, configured } = input;
  const questions: PublicQuestion[] = [];
  const coreKeys = new Set<string>(Object.values(CORE_KEYS));

  if (rule) {
    if (rule.acceptedLengths.length > 0) {
      questions.push({
        key: CORE_KEYS.hairLength,
        label: 'Quelle est la longueur actuelle de vos cheveux ?',
        type: 'SINGLE_CHOICE',
        required: true,
        options: HAIR_LENGTH_OPTIONS.map((option) => ({ ...option })),
        help: null,
        condition: null,
        core: true,
      });
      questions.push({
        key: CORE_KEYS.shortCut,
        label: 'Avez-vous une coupe très courte ou une zone rasée ?',
        type: 'BOOLEAN',
        required: false,
        options: YES_NO_OPTIONS,
        help: 'Cela peut empêcher la réalisation de certaines coiffures.',
        condition: null,
        core: true,
      });
    }

    if (rule.requiresLocs || rule.incompatibleLocs) {
      questions.push({
        key: CORE_KEYS.hasLocs,
        label: 'Portez-vous actuellement des locs ?',
        type: 'SINGLE_CHOICE',
        required: true,
        options: LOCS_OPTIONS.map((option) => ({ ...option })),
        help: null,
        condition: null,
        core: true,
      });
    }

    if (rule.acceptedHairTypes.length > 0) {
      questions.push({
        key: CORE_KEYS.hairType,
        label: 'Quel est votre type de cheveux ?',
        type: 'SINGLE_CHOICE',
        required: true,
        options: HAIR_TYPE_OPTIONS.map((value) => ({ value, label: value })),
        help: null,
        condition: null,
        core: true,
      });
    }
  }

  const configuredQuestions = configured
    .filter((question) => question.active && !coreKeys.has(question.key))
    .sort((a, b) => a.order - b.order)
    .map<PublicQuestion>((question) => {
      const options =
        question.options.length > 0
          ? question.options.map((value) => ({ value, label: value }))
          : (DEFAULT_QUESTION_OPTIONS[question.type] ?? []);
      return {
        key: question.key,
        label: question.label,
        type: question.type,
        required: question.required,
        options,
        help: null,
        condition: conditionFromJson(question.condition),
        core: false,
      };
    });

  return [...questions, ...configuredQuestions];
}

/** Normalise les réponses stockées ou reçues vers l'entrée du moteur. */
export function normalizeAnswers(raw: Record<string, unknown>): CompatibilityAnswers {
  const hairLengthRaw = raw[CORE_KEYS.hairLength];
  const hairLength: HairLengthAnswer | null =
    hairLengthRaw === 'SHORT' ||
    hairLengthRaw === 'MEDIUM' ||
    hairLengthRaw === 'LONG' ||
    hairLengthRaw === 'VERY_LONG' ||
    hairLengthRaw === 'UNSURE'
      ? hairLengthRaw
      : null;

  const hasLocsRaw = raw[CORE_KEYS.hasLocs];
  const hasLocs: LocsAnswer | null =
    hasLocsRaw === 'YES' || hasLocsRaw === 'NO' || hasLocsRaw === 'UNSURE' ? hasLocsRaw : null;

  const shortCutRaw = raw[CORE_KEYS.shortCut];
  const shortCut =
    shortCutRaw === true || shortCutRaw === 'YES' || shortCutRaw === 'true'
      ? true
      : shortCutRaw === false || shortCutRaw === 'NO' || shortCutRaw === 'false'
        ? false
        : null;

  const hairTypeRaw = raw[CORE_KEYS.hairType];
  const notesRaw = raw.notes;

  return {
    hairLength,
    hasLocs,
    hairType: typeof hairTypeRaw === 'string' ? hairTypeRaw : null,
    shortCut,
    notes: typeof notesRaw === 'string' ? notesRaw : null,
  };
}

export const CORE_ANSWER_LABELS: Record<string, (value: unknown) => string> = {
  [CORE_KEYS.hairLength]: (value) =>
    HAIR_LENGTH_OPTIONS.find((option) => option.value === value)?.label ?? String(value ?? ''),
  [CORE_KEYS.hasLocs]: (value) =>
    LOCS_OPTIONS.find((option) => option.value === value)?.label ?? String(value ?? ''),
  [CORE_KEYS.shortCut]: (value) =>
    value === true || value === 'YES'
      ? 'Oui'
      : value === false || value === 'NO'
        ? 'Non'
        : 'Non renseigné',
  [CORE_KEYS.hairType]: (value) => String(value ?? ''),
};
