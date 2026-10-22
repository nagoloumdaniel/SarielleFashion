/* ============================================================
 * Avis clients (P8.10) - fonctions pures, testables sans base.
 * Un avis n'est jamais affiché publiquement avant modération (§19).
 * ============================================================ */

export type ReviewStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export function isReviewTokenValid(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() > now.getTime();
}

export function buildReviewTokenExpiry(appointmentEndsAt: Date, daysAfter = 60): Date {
  return new Date(appointmentEndsAt.getTime() + daysAfter * 24 * 3_600_000);
}

export function isValidRating(rating: unknown): rating is 1 | 2 | 3 | 4 | 5 {
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Un avis n'est jamais visible publiquement s'il n'est pas explicitement
 * approuvé par une décision de modération - jamais par défaut (§19).
 */
export function isPubliclyVisible(status: ReviewStatus): boolean {
  return status === 'APPROVED';
}
