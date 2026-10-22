import { headers } from 'next/headers';
import { isIP } from 'node:net';

/**
 * IP du client derrière Vercel. Priorité : x-vercel-forwarded-for (posé par la
 * plateforme, non falsifiable), puis x-real-ip, puis premier élément de
 * x-forwarded-for. Valeur non conforme au format IP => 'unknown'.
 */
export function pickClientIp(read: (name: string) => string | null | undefined): string {
  const candidates = [
    read('x-vercel-forwarded-for'),
    read('x-real-ip'),
    read('x-forwarded-for')?.split(',')[0],
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isIP(value) !== 0) return value;
  }
  return 'unknown';
}

export async function getClientIp(): Promise<string> {
  try {
    const list = await headers();
    return pickClientIp((name) => list.get(name));
  } catch {
    // Hors contexte de requête (tests, scripts).
    return 'unknown';
  }
}
