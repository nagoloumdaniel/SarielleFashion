import { timingSafeEqual } from 'node:crypto';

/* ============================================================
 * P7.7 : protection des routes cron (Vercel Cron ou planificateur
 * externe). Aucune route cron ne doit être publique.
 * ============================================================ */

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const headerBuffer = Buffer.from(header);
  const expectedBuffer = Buffer.from(expected);
  if (headerBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(headerBuffer, expectedBuffer);
}
