import { describe, expect, it } from 'vitest';
import {
  buildCancellationExpiry,
  evaluateCancellationPolicy,
  isCancellationTokenValid,
} from './policy';

const now = new Date('2026-06-01T10:00:00.000Z');

describe('evaluateCancellationPolicy', () => {
  it('should allow cancellation before the notice delay', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-06-03T10:00:00.000Z'),
      now,
      minCancelNoticeHours: 24,
    });
    expect(result.allowed).toBe(true);
    expect(result.hoursBefore).toBe(48);
  });

  it('should refuse cancellation inside the notice delay', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-06-02T06:00:00.000Z'),
      now,
      minCancelNoticeHours: 24,
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('24 h');
  });

  it('should refuse cancellation for a past appointment', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-05-31T10:00:00.000Z'),
      now,
      minCancelNoticeHours: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('déjà passé');
  });

  it('should allow cancellation with no notice delay', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-06-01T11:00:00.000Z'),
      now,
      minCancelNoticeHours: 0,
    });
    expect(result.allowed).toBe(true);
  });
});

describe('cancellation token validity', () => {
  it('should accept a token without expiry', () => {
    expect(isCancellationTokenValid(null, now)).toBe(true);
  });

  it('should reject an expired token', () => {
    expect(isCancellationTokenValid(new Date('2026-05-01T00:00:00.000Z'), now)).toBe(false);
  });

  it('should build an expiry after the appointment', () => {
    const startsAt = new Date('2026-06-10T10:00:00.000Z');
    const expiry = buildCancellationExpiry(startsAt, 30);
    expect(expiry.getTime() - startsAt.getTime()).toBe(30 * 24 * 3_600_000);
  });
});
