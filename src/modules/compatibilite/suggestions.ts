import {
  evaluateCompatibility,
  type CompatibilityAnswers,
  type CompatibilityRuleData,
} from './engine';

/* ============================================================
 * Suggestions de coiffures compatibles (P8.9)
 * Fonction pure : ne propose JAMAIS une prestation dont le moteur
 * de compatibilité ne confirme pas une réservation directe (COMPATIBLE
 * + BOOK). Aucune restriction n'est contournée - une suggestion qui
 * nécessiterait une photo ou une validation manuelle n'est pas proposée.
 * ============================================================ */

export interface SuggestionCandidate {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  rule: CompatibilityRuleData | null;
}

export interface SuggestedService {
  id: string;
  name: string;
  slug: string;
}

export function suggestCompatibleServices(
  candidates: SuggestionCandidate[],
  excludeServiceId: string,
  currentCategoryId: string,
  answers: CompatibilityAnswers,
  limit = 3,
): SuggestedService[] {
  const eligible = candidates
    .filter((candidate) => candidate.id !== excludeServiceId)
    .filter((candidate) => {
      const verdict = evaluateCompatibility({ rule: candidate.rule, answers });
      return verdict.verdict === 'COMPATIBLE' && verdict.nextStep === 'BOOK';
    })
    .sort((a, b) => {
      const aSame = a.categoryId === currentCategoryId ? 0 : 1;
      const bSame = b.categoryId === currentCategoryId ? 0 : 1;
      return aSame - bSame;
    });

  return eligible.slice(0, limit).map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    slug: candidate.slug,
  }));
}
