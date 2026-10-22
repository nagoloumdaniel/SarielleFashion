/* ============================================================
 * Textes de politique (annulation, réservation) et contexte e-mail.
 * Fonctions pures : valeur saisie par Sarielle dans les paramètres,
 * sinon texte par défaut sobre. Aucune dépendance base de données.
 * ============================================================ */

export interface EmailContext {
  /** Signature affichée en pied de tous les e-mails (texte brut). */
  signature?: string | null;
  /** Politique d'annulation déjà résolue (valeur saisie ou défaut). */
  cancellationPolicy?: string | null;
  /** Conditions de réservation déjà résolues (valeur saisie ou défaut). */
  bookingPolicy?: string | null;
}

export function resolveCancellationPolicy(
  custom: string | null | undefined,
  minCancelNoticeHours: number,
): string {
  const text = custom?.trim();
  if (text) return text;
  const notice = Math.max(0, Math.round(minCancelNoticeHours));
  if (notice > 0) {
    return `Vous pouvez annuler ou déplacer votre rendez-vous gratuitement jusqu’à ${notice} heures avant l’heure convenue, via le lien sécurisé reçu par e-mail. Passé ce délai, contactez Sarielle directement.`;
  }
  return 'Vous pouvez annuler ou déplacer votre rendez-vous via le lien sécurisé reçu par e-mail. En cas de difficulté, contactez Sarielle directement.';
}

export function resolveBookingPolicy(custom: string | null | undefined): string {
  const text = custom?.trim();
  if (text) return text;
  return 'Les rendez-vous se prennent uniquement sur réservation. Paiement sur place. Merci de respecter l’heure convenue.';
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function emailContextFromSettings(settings: {
  emailSignature: string | null;
  cancellationPolicy: string | null;
  bookingPolicy: string | null;
  minCancelNoticeHours: number;
}): EmailContext {
  return {
    signature: settings.emailSignature?.trim() || null,
    cancellationPolicy: resolveCancellationPolicy(
      settings.cancellationPolicy,
      settings.minCancelNoticeHours,
    ),
    bookingPolicy: resolveBookingPolicy(settings.bookingPolicy),
  };
}
