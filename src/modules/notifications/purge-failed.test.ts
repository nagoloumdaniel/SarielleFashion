import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleteMany = vi.fn();
const requireAdmin = vi.fn();
const logAudit = vi.fn();
const rateLimit = vi.fn();

vi.mock('@/lib/db', () => ({ db: { notification: { deleteMany } } }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit }));
vi.mock('@/modules/auth/guards', () => ({ requireAdmin }));
vi.mock('@/modules/stats/audit', () => ({ logAudit }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('./flush', () => ({ flushEmailsSoon: vi.fn() }));
vi.mock('./service', () => ({ retryNotification: vi.fn() }));

const { deleteFailedEmails } = await import('./actions');

describe('deleteFailedEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ id: 'admin-1' });
    rateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: 0 });
    deleteMany.mockResolvedValue({ count: 3 });
  });

  it('should refuse without an admin session', async () => {
    requireAdmin.mockResolvedValue(null);
    const result = await deleteFailedEmails();
    expect(result.error).toBeDefined();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('should delete only FAILED emails and audit the count', async () => {
    const result = await deleteFailedEmails();
    expect(deleteMany).toHaveBeenCalledWith({ where: { channel: 'EMAIL', status: 'FAILED' } });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'notification.purge_failed', metadata: { count: 3 } }),
    );
    expect(result.success).toBe('3 échecs d’envoi supprimés.');
  });

  it('should stop when rate limited', async () => {
    rateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0 });
    const result = await deleteFailedEmails();
    expect(result.error).toBeDefined();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
