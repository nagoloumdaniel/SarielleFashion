import { db } from '@/lib/db';
import { auth } from './auth';

/**
 * Cache mémoire court (par instance) de l'état de l'utilisateur en base : évite
 * une requête par action/page tout en limitant la fenêtre de révocation à 30 s
 * sur les autres instances (immédiate sur celle qui révoque, via invalidateAdminCache).
 */
const CACHE_TTL_MS = 30_000;
interface CachedUser {
  role: string;
  sessionVersion: number;
  expiresAt: number;
}
const userCache = new Map<string, CachedUser | null>();
const expiries = new Map<string, number>();

export function invalidateAdminCache(userId?: string): void {
  if (userId) {
    userCache.delete(userId);
    expiries.delete(userId);
  } else {
    userCache.clear();
    expiries.clear();
  }
}

async function loadUser(userId: string): Promise<CachedUser | null> {
  const now = Date.now();
  const expiry = expiries.get(userId);
  if (expiry !== undefined && expiry > now && userCache.has(userId)) {
    return userCache.get(userId) ?? null;
  }
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, sessionVersion: true },
  });
  const value: CachedUser | null = row
    ? { role: row.role, sessionVersion: row.sessionVersion, expiresAt: now + CACHE_TTL_MS }
    : null;
  if (userCache.size > 200) invalidateAdminCache();
  userCache.set(userId, value);
  expiries.set(userId, now + CACHE_TTL_MS);
  return value;
}

/**
 * Garde serveur (P1.8) : à appeler dans CHAQUE server action et route
 * handler d'administration, en plus du middleware. Retourne l'utilisateur
 * admin ou null (appelant doit alors refuser l'opération).
 *
 * Relit l'utilisateur en base : refuse si le compte n'existe plus, n'est plus ADMIN,
 * ou si la version de session du JWT (sv) ne correspond plus à User.sessionVersion
 * (déconnexion de tous les appareils / changement de mot de passe).
 * Échec fermé : une erreur de lecture refuse l'accès.
 */
export async function requireAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user || user.role !== 'ADMIN' || !user.id) return null;
  try {
    const dbUser = await loadUser(user.id);
    if (!dbUser || dbUser.role !== 'ADMIN') return null;
    if ((user.sv ?? 0) !== dbUser.sessionVersion) return null;
  } catch (error) {
    console.error('[auth] requireAdmin: lecture utilisateur impossible', error);
    return null;
  }
  return user;
}
