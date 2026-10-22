/* ============================================================
 * Politique d'annulation et validité du lien client (P6.7)
 * Fonctions pures, testables sans base de données.
 * Le délai minimum est exprimé en MINUTES (défaut : 30).
 * ============================================================ */

import type { Translator } from '@/i18n/translate';

export interface CancellationPolicyResult {
  allowed: boolean;
  /** Cas d'affichage (permet de traduire le message sans parser le texte français). */
  code: 'PAST' | 'CLOSED' | 'OPEN';
  /** Délai minimum d'annulation en minutes. */
  notice: number;
  /** Minutes restantes avant le rendez-vous (peut être négatif). */
  minutesBefore: number;
  message: string;
}

/** « 30 minutes », « 1 heure », « 2 heures », « 1 h 30 » : durée lisible pour les textes publics et e-mails. */
export function formatNoticeDelay(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} minute${total > 1 ? 's' : ''}`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (rest === 0) return `${hours} heure${hours > 1 ? 's' : ''}`;
  return `${hours} h ${String(rest).padStart(2, '0')}`;
}

/** Délai lisible dans la langue de l'interface (« 30 minutes », « 1 h 30 » / « 1 Std. 30 Min. »). */
export function formatNoticeDelayLocalized(t: Translator, minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return t('booking.delay.minutes', { count: total });
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (rest === 0) return t('booking.delay.hours', { count: hours });
  return t('booking.delay.hoursMinutes', { h: hours, m: String(rest).padStart(2, '0') });
}

/** Message de la politique d'annulation dans la langue de l'interface. */
export function cancellationPolicyMessage(t: Translator, policy: CancellationPolicyResult): string {
  if (policy.code === 'PAST') return t('booking.cancel.policyPast');
  if (policy.code === 'CLOSED') {
    return t('booking.cancel.policyClosed', {
      delay: formatNoticeDelayLocalized(t, policy.notice),
    });
  }
  return policy.notice > 0
    ? t('booking.cancel.policyOpen', { delay: formatNoticeDelayLocalized(t, policy.notice) })
    : t('booking.cancel.policyOpenNoDelay');
}

export function evaluateCancellationPolicy(input: {
  startsAt: Date;
  now: Date;
  minCancelNoticeMinutes: number;
}): CancellationPolicyResult {
  const { startsAt, now, minCancelNoticeMinutes } = input;
  const minutesBefore = (startsAt.getTime() - now.getTime()) / 60_000;
  const notice = Math.max(0, minCancelNoticeMinutes);

  if (minutesBefore < 0) {
    return {
      allowed: false,
      code: 'PAST',
      notice,
      minutesBefore,
      message: 'Ce rendez-vous est déjà passé. Contacte Sarielle si tu as besoin d’aide.',
    };
  }

  if (minutesBefore < notice) {
    return {
      allowed: false,
      code: 'CLOSED',
      notice,
      minutesBefore,
      message: `L’annulation en ligne est fermée à moins de ${formatNoticeDelay(notice)} du rendez-vous. Contacte Sarielle directement.`,
    };
  }

  return {
    allowed: true,
    code: 'OPEN',
    notice,
    minutesBefore,
    message:
      notice > 0
        ? `Annulation possible jusqu’à ${formatNoticeDelay(notice)} avant le rendez-vous.`
        : 'Annulation possible en ligne.',
  };
}

export function isCancellationTokenValid(expiresAt: Date | null, now: Date): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() > now.getTime();
}

export function buildCancellationExpiry(startsAt: Date, daysAfter = 30): Date {
  return new Date(startsAt.getTime() + daysAfter * 24 * 3_600_000);
}
