import { describe, expect, it } from 'vitest';
import {
  expiredNotificationsWhere,
  expiredReviewsWhere,
  retentionCutoff,
  retentionPolicyCutoffs,
} from './retention';

describe('retentionCutoff', () => {
  it('should subtract the configured number of days', () => {
    const now = new Date('2026-10-19T12:00:00.000Z');
    expect(retentionCutoff(now, 90).toISOString()).toBe('2026-07-21T12:00:00.000Z');
    expect(retentionCutoff(now, 7).toISOString()).toBe('2026-10-12T12:00:00.000Z');
  });

  it('should never return a date in the future for zero or invalid days', () => {
    const now = new Date('2026-10-19T12:00:00.000Z');
    expect(retentionCutoff(now, 0).toISOString()).toBe(now.toISOString());
    expect(retentionCutoff(now, -10).toISOString()).toBe(now.toISOString());
  });
});

describe('retentionPolicyCutoffs', () => {
  const now = new Date('2026-10-19T12:00:00.000Z');

  it('should keep unanswered review requests 12 months, read notifications 6 months, failed emails 3 months', () => {
    const cutoffs = retentionPolicyCutoffs(now);
    expect(cutoffs.reviews.toISOString()).toBe('2025-10-19T12:00:00.000Z');
    expect(cutoffs.readNotifications.toISOString()).toBe('2026-04-19T12:00:00.000Z');
    expect(cutoffs.failedEmails.toISOString()).toBe('2026-07-19T12:00:00.000Z');
  });
});

describe('purge filters', () => {
  const cutoff = new Date('2025-10-19T12:00:00.000Z');

  it('should only target unanswered review requests, never published reviews', () => {
    const where = expiredReviewsWhere(cutoff);
    expect(where.submittedAt).toBeNull();
    expect(where.createdAt.lt).toBe(cutoff);
  });

  it('should only purge read in-app notifications and exhausted failed emails', () => {
    const where = expiredNotificationsWhere({
      readBefore: new Date('2026-04-19T12:00:00.000Z'),
      failedBefore: new Date('2026-07-19T12:00:00.000Z'),
    });
    expect(where.OR).toHaveLength(2);
    const [read, failed] = where.OR;
    expect(read).toMatchObject({ channel: 'IN_APP', readAt: { lt: expect.any(Date) } });
    expect(failed).toMatchObject({ channel: 'EMAIL', status: 'FAILED', nextAttemptAt: null });
    // Jamais de suppression d'e-mails en attente ou en cours d'envoi.
    expect(JSON.stringify(where)).not.toContain('PENDING');
    expect(JSON.stringify(where)).not.toContain('PROCESSING');
  });
});
