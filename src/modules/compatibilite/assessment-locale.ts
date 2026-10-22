import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/config';

/* Langue de la cliente pour une évaluation capillaire.
 * HairAssessment n'a pas de colonne dédiée : la langue est mémorisée dans le JSON des réponses
 * sous une clé réservée, retirée de toute lecture destinée au dashboard (voir queries.ts). */
export const ASSESSMENT_LOCALE_KEY = '__locale';

export function withAssessmentLocale(
  answers: Record<string, unknown>,
  locale: Locale,
): Record<string, unknown> {
  return { ...answers, [ASSESSMENT_LOCALE_KEY]: locale };
}

export function readAssessmentLocale(answers: unknown): Locale {
  if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
    const value = (answers as Record<string, unknown>)[ASSESSMENT_LOCALE_KEY];
    if (isLocale(value)) return value;
  }
  return DEFAULT_LOCALE;
}

export function withoutAssessmentLocale(answers: Record<string, unknown>): Record<string, unknown> {
  const { [ASSESSMENT_LOCALE_KEY]: _locale, ...rest } = answers;
  void _locale;
  return rest;
}
