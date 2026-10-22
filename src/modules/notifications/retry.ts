/* P7.2 : politique de reprise des envois, pure et testable. */
export const MAX_EMAIL_ATTEMPTS = 5;

/** Backoff progressif en minutes, indexé sur le nombre de tentatives. */
export function retryDelayMinutes(attempts: number): number {
  const delays = [1, 5, 15, 60, 240];
  return delays[Math.min(Math.max(attempts - 1, 0), delays.length - 1)] ?? 240;
}
