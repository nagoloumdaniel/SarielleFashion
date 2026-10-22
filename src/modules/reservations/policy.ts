/* ============================================================
 * Politique d'annulation et validité du lien client (P6.7)
 * Fonctions pures, testables sans base de données.
 * ============================================================ */

export interface CancellationPolicyResult {
  allowed: boolean;
  /** Heures restantes avant le rendez-vous (peut être négatif). */
  hoursBefore: number;
  message: string;
}

export function evaluateCancellationPolicy(input: {
  startsAt: Date;
  now: Date;
  minCancelNoticeHours: number;
}): CancellationPolicyResult {
  const { startsAt, now, minCancelNoticeHours } = input;
  const hoursBefore = (startsAt.getTime() - now.getTime()) / 3_600_000;
  const notice = Math.max(0, minCancelNoticeHours);

  if (hoursBefore < 0) {
    return {
      allowed: false,
      hoursBefore,
      message: 'Ce rendez-vous est déjà passé. Contactez Patricia si vous avez besoin d’aide.',
    };
  }

  if (hoursBefore < notice) {
    return {
      allowed: false,
      hoursBefore,
      message: `L’annulation en ligne est fermée à moins de ${notice} h du rendez-vous. Contactez Patricia pour toute modification.`,
    };
  }

  return {
    allowed: true,
    hoursBefore,
    message:
      notice > 0
        ? `Annulation possible jusqu’à ${notice} h avant le rendez-vous.`
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
