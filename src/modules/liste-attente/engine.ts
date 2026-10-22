/* ============================================================
 * Liste d'attente (P8.8) - fonctions pures, testables sans base.
 * Le créneau souhaité est exact (date + heure UTC) : aucune logique
 * de fuseau côté serveur (cohérent avec la règle P1.5).
 * ============================================================ */

export interface WaitlistCandidate {
  id: string;
  serviceId: string;
  desiredStartsAt: Date;
  status: 'WAITING' | 'NOTIFIED' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  createdAt: Date;
}

/**
 * Sélectionne la prochaine candidate en attente pour un créneau libéré,
 * la plus ancienne demande d'abord (premier arrivé, premier servi).
 */
export function pickNextWaitingEntry(
  entries: WaitlistCandidate[],
  serviceId: string,
  desiredStartsAt: Date,
): WaitlistCandidate | null {
  const matching = entries
    .filter(
      (entry) =>
        entry.status === 'WAITING' &&
        entry.serviceId === serviceId &&
        entry.desiredStartsAt.getTime() === desiredStartsAt.getTime(),
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return matching[0] ?? null;
}

export function buildNotifyExpiry(now: Date, hours = 2): Date {
  return new Date(now.getTime() + Math.max(1, hours) * 3_600_000);
}

export function isNotifyTokenValid(expiresAt: Date | null, now: Date): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() > now.getTime();
}
