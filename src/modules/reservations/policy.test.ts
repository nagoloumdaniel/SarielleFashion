import { describe, expect, it } from 'vitest';
import {
  buildCancellationExpiry,
  evaluateCancellationPolicy,
  formatNoticeDelay,
  isCancellationTokenValid,
} from './policy';

const now = new Date('2026-06-01T10:00:00.000Z');

describe('evaluateCancellationPolicy', () => {
  it('should allow cancellation well before the notice delay', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-06-03T10:00:00.000Z'),
      now,
      minCancelNoticeMinutes: 30,
    });
    expect(result.allowed).toBe(true);
    expect(result.minutesBefore).toBe(48 * 60);
  });

  it('should allow cancellation exactly 30 minutes before', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-06-01T10:30:00.000Z'),
      now,
      minCancelNoticeMinutes: 30,
    });
    expect(result.allowed).toBe(true);
  });

  it('should refuse cancellation 29 minutes before the appointment', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-06-01T10:29:00.000Z'),
      now,
      minCancelNoticeMinutes: 30,
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('30 minutes');
  });

  it('should refuse cancellation for a past appointment', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-05-31T10:00:00.000Z'),
      now,
      minCancelNoticeMinutes: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('déjà passé');
  });

  it('should allow cancellation with no notice delay', () => {
    const result = evaluateCancellationPolicy({
      startsAt: new Date('2026-06-01T11:00:00.000Z'),
      now,
      minCancelNoticeMinutes: 0,
    });
    expect(result.allowed).toBe(true);
  });
});

describe('formatNoticeDelay', () => {
  it('should format minutes, hours and mixed durations', () => {
    expect(formatNoticeDelay(1)).toBe('1 minute');
    expect(formatNoticeDelay(30)).toBe('30 minutes');
    expect(formatNoticeDelay(60)).toBe('1 heure');
    expect(formatNoticeDelay(1440)).toBe('24 heures');
    expect(formatNoticeDelay(90)).toBe('1 h 30');
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
