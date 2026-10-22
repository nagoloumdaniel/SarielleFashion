/* ============================================================
 * Paiement : toujours sur place (aucun paiement en ligne).
 * Moyens acceptés : espèces et virement. Source unique des textes.
 * ============================================================ */

export const PAYMENT_METHODS = ['espèces', 'virement'] as const;

/** Phrase courte (récapitulatif, e-mails, pied de page). */
export const PAYMENT_SHORT = 'Paiement sur place, en espèces ou par virement.';

/** Phrase complète (infos pratiques, FAQ). */
export const PAYMENT_SENTENCE =
  'Le paiement se fait toujours sur place, le jour du rendez-vous, en espèces ou par virement. Aucun paiement en ligne n’est demandé.';
