/* ============================================================
 * Textes de politique (annulation, réservation) et contexte e-mail.
 * Fonctions pures : valeur saisie par Sarielle dans les paramètres,
 * sinon texte par défaut sobre. Aucune dépendance base de données.
 * ============================================================ */

import { formatNoticeDelay } from '@/modules/reservations/policy';

export interface EmailContext {
  /** Signature affichée en pied de tous les e-mails (texte brut). */
  signature?: string | null;
  /** Politique d'annulation déjà résolue (valeur saisie ou défaut). */
  cancellationPolicy?: string | null;
  /** Conditions de réservation déjà résolues (valeur saisie ou défaut). */
  bookingPolicy?: string | null;
  /** Valeurs saisies brutes : permettent de produire le texte par défaut dans la langue du client. */
  raw?: {
    cancellationPolicy: string | null;
    bookingPolicy: string | null;
    minCancelNoticeMinutes: number;
  };
}

export function resolveCancellationPolicy(
  custom: string | null | undefined,
  minCancelNoticeMinutes: number,
): string {
  const text = custom?.trim();
  if (text) return text;
  const notice = Math.max(0, Math.round(minCancelNoticeMinutes));
  if (notice > 0) {
    return `Tu peux annuler ton rendez-vous gratuitement jusqu’à ${formatNoticeDelay(notice)} avant l’heure convenue, via le lien sécurisé reçu par e-mail. Passé ce délai, le lien ne fonctionne plus : contacte Sarielle directement.`;
  }
  return 'Tu peux annuler ton rendez-vous via le lien sécurisé reçu par e-mail. En cas de difficulté, contacte Sarielle directement.';
}

export function resolveBookingPolicy(custom: string | null | undefined): string {
  const text = custom?.trim();
  if (text) return text;
  return 'Les rendez-vous se prennent uniquement sur réservation. Le paiement se fait toujours sur place, en espèces ou par virement. Merci de respecter l’heure convenue.';
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
  minCancelNoticeMinutes: number;
}): EmailContext {
  return {
    signature: settings.emailSignature?.trim() || null,
    cancellationPolicy: resolveCancellationPolicy(
      settings.cancellationPolicy,
      settings.minCancelNoticeMinutes,
    ),
    bookingPolicy: resolveBookingPolicy(settings.bookingPolicy),
    raw: {
      cancellationPolicy: settings.cancellationPolicy,
      bookingPolicy: settings.bookingPolicy,
      minCancelNoticeMinutes: settings.minCancelNoticeMinutes,
    },
  };
}
