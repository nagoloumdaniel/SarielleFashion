/* ============================================================
 * Avis clients - fonctions pures, testables sans base.
 * Un avis est publié dès qu'il est soumis (pas de modération) ;
 * l'admin peut le supprimer depuis son tableau de bord.
 * ============================================================ */

export const MAX_REVIEW_PHOTOS = 3;
export const MAX_REVIEW_COMMENT_LENGTH = 1500;

export function isReviewTokenValid(expiresAt: Date | null, now: Date): boolean {
  return expiresAt !== null && expiresAt.getTime() > now.getTime();
}

export function buildReviewTokenExpiry(appointmentEndsAt: Date, daysAfter = 60): Date {
  return new Date(appointmentEndsAt.getTime() + daysAfter * 24 * 3_600_000);
}

export function isValidRating(rating: unknown): rating is 1 | 2 | 3 | 4 | 5 {
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/** Un avis est public dès qu'il a reçu une réponse (note + date de soumission). */
export function isPubliclyVisible(review: {
  submittedAt: Date | null;
  rating: number | null;
}): boolean {
  return review.submittedAt !== null && isValidRating(review.rating);
}

/**
 * Texte libre : aucun HTML (balises retirées), pas de caractères de contrôle,
 * lignes vides consécutives réduites. React échappe déjà l'affichage ; ceci
 * évite surtout de stocker du balisage.
 */
export function cleanReviewText(input: string): string {
  return input
    .replace(/<\/?[a-zA-Z!?][^>]*>?/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface RatingSummary {
  count: number;
  /** Moyenne arrondie au dixième ; 0 sans avis. */
  average: number;
}

export function summarizeRatings(ratings: Array<number | null | undefined>): RatingSummary {
  const valid = ratings.filter(isValidRating);
  if (valid.length === 0) return { count: 0, average: 0 };
  const sum = valid.reduce<number>((total, value) => total + value, 0);
  return { count: valid.length, average: Math.round((sum / valid.length) * 10) / 10 };
}

/** « 4,8 » (virgule décimale en français comme en allemand). */
export function formatAverage(average: number, locale: 'fr' | 'de' = 'fr'): string {
  return average.toLocaleString(locale === 'de' ? 'de-DE' : 'fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** « 1 avis » / « 12 avis » (fr), « 1 Bewertung » / « 12 Bewertungen » (de). */
export function formatReviewCount(count: number, locale: 'fr' | 'de' = 'fr'): string {
  if (locale === 'de') return count === 1 ? '1 Bewertung' : `${count} Bewertungen`;
  return count === 1 ? '1 avis' : `${count} avis`;
}

/** Nom affiché publiquement : prénom + initiale du nom (« Awa D. »), jamais le nom complet. */
export function publicAuthorName(fullName: string, locale: 'fr' | 'de' = 'fr'): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return locale === 'de' ? 'Kundin' : 'Cliente';
  const first = parts[0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]! : '';
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}
