import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryRaw, deleteMany } = vi.hoisted(() => ({ queryRaw: vi.fn(), deleteMany: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: { $queryRaw: queryRaw, rateLimitBucket: { deleteMany } },
}));

import { rateLimit } from './rate-limit';

describe('rateLimit (repli mémoire quand la base échoue)', () => {
  beforeEach(() => {
    queryRaw.mockReset();
    queryRaw.mockRejectedValue(new Error('db down'));
  });

  it('should allow requests below the limit and block the next one', async () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    expect((await rateLimit(key, { max: 2, windowMs: 1000 })).allowed).toBe(true);
    expect((await rateLimit(key, { max: 2, windowMs: 1000 })).allowed).toBe(true);
    expect((await rateLimit(key, { max: 2, windowMs: 1000 })).allowed).toBe(false);
  });

  it('should isolate counters by key', async () => {
    const a = `test:a:${Date.now()}`;
    const b = `test:b:${Date.now()}`;
    await rateLimit(a, { max: 1, windowMs: 1000 });
    expect((await rateLimit(a, { max: 1, windowMs: 1000 })).allowed).toBe(false);
    expect((await rateLimit(b, { max: 1, windowMs: 1000 })).allowed).toBe(true);
  });

  it('should never throw when the database fails', async () => {
    await expect(
      rateLimit(`test:safe:${Math.random()}`, { max: 1, windowMs: 1000 }),
    ).resolves.toMatchObject({
      allowed: true,
    });
  });
});

describe('rateLimit (base de données)', () => {
  beforeEach(() => {
    queryRaw.mockReset();
    deleteMany.mockReset();
    deleteMany.mockResolvedValue({ count: 0 });
  });

  it('should allow while the stored count stays under max', async () => {
    const resetAt = new Date(Date.now() + 5000);
    queryRaw.mockResolvedValueOnce([{ count: 3, resetAt }]);
    const result = await rateLimit('db:ok', { max: 3, windowMs: 5000 });
    expect(result).toEqual({ allowed: true, remaining: 0, resetAt: resetAt.getTime() });
  });

  it('should block once the stored count exceeds max', async () => {
    const resetAt = new Date(Date.now() + 5000);
    queryRaw.mockResolvedValueOnce([{ count: 4, resetAt }]);
    const result = await rateLimit('db:blocked', { max: 3, windowMs: 5000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should issue a single atomic upsert statement per call', async () => {
    queryRaw.mockResolvedValueOnce([{ count: 1, resetAt: new Date(Date.now() + 1000) }]);
    await rateLimit('db:atomic', { max: 3, windowMs: 1000 });
    expect(queryRaw).toHaveBeenCalledTimes(1);
    const strings = queryRaw.mock.calls[0]?.[0] as readonly string[];
    expect(strings.join('?')).toMatch(/ON CONFLICT \("key"\) DO UPDATE/);
  });
});
