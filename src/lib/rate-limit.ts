import { db } from '@/lib/db';

/**
 * Rate limiter à fenêtre fixe, partagé entre instances via la table
 * RateLimitBucket (opération atomique INSERT ... ON CONFLICT). Repli sur un
 * Map mémoire si la base échoue : la fonction ne propage jamais d'exception.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();
let lastMemorySweep = 0;
let lastDbPurge = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweepMemory(now: number): void {
  if (now - lastMemorySweep < SWEEP_INTERVAL_MS) return;
  lastMemorySweep = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function memoryRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
  now: number,
): RateLimitResult {
  sweepMemory(now);
  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: 1 <= max, remaining: Math.max(max - 1, 0), resetAt: now + windowMs };
  }
  if (entry.count >= max) return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  entry.count += 1;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/** Purge opportuniste des buckets expirés, au plus une fois par minute. */
async function purgeExpired(now: number): Promise<void> {
  if (now - lastDbPurge < SWEEP_INTERVAL_MS) return;
  lastDbPurge = now;
  try {
    await db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(now) } } });
  } catch {
    // Best effort : la purge ne doit jamais bloquer une requête.
  }
}

export async function rateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    const nowDate = new Date(now);
    const resetDate = new Date(now + opts.windowMs);
    // Atomique : création, incrément ou remise à zéro si la fenêtre est échue.
    const rows = await db.$queryRaw<Array<{ count: number; resetAt: Date }>>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
      VALUES (${key}, 1, ${resetDate}, ${nowDate})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."resetAt" <= ${nowDate}
                       THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${nowDate}
                         THEN ${resetDate} ELSE "RateLimitBucket"."resetAt" END,
        "updatedAt" = ${nowDate}
      RETURNING "count", "resetAt"`;
    const row = rows[0];
    if (!row) throw new Error('rate-limit: aucune ligne renvoyée');
    void purgeExpired(now);
    const count = Number(row.count);
    const resetAt = new Date(row.resetAt).getTime();
    return {
      allowed: count <= opts.max,
      remaining: Math.max(opts.max - count, 0),
      resetAt,
    };
  } catch {
    return memoryRateLimit(key, opts, now);
  }
}
