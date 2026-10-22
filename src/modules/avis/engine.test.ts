import { describe, expect, it } from 'vitest';
import {
  buildReviewTokenExpiry,
  isPubliclyVisible,
  isReviewTokenValid,
  isValidRating,
} from './engine';

describe('buildReviewTokenExpiry / isReviewTokenValid', () => {
  it('builds an expiry 60 days after the appointment by default', () => {
    const endsAt = new Date('2026-06-01T10:00:00.000Z');
    expect(buildReviewTokenExpiry(endsAt).toISOString()).toBe('2026-07-31T10:00:00.000Z');
  });

  it('considers a future expiry valid', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const expiresAt = new Date('2026-06-02T10:00:00.000Z');
    expect(isReviewTokenValid(expiresAt, now)).toBe(true);
  });

  it('considers a past expiry invalid', () => {
    const now = new Date('2026-06-02T10:00:00.000Z');
    const expiresAt = new Date('2026-06-01T10:00:00.000Z');
    expect(isReviewTokenValid(expiresAt, now)).toBe(false);
  });
});

describe('isValidRating', () => {
  it.each([1, 2, 3, 4, 5])('accepts %i', (rating) => {
    expect(isValidRating(rating)).toBe(true);
  });

  it.each([0, 6, -1, 3.5, '4', null, undefined])('rejects %p', (rating) => {
    expect(isValidRating(rating)).toBe(false);
  });
});

describe('isPubliclyVisible', () => {
  it('is visible only when approved', () => {
    expect(isPubliclyVisible('APPROVED')).toBe(true);
    expect(isPubliclyVisible('PENDING')).toBe(false);
    expect(isPubliclyVisible('SUBMITTED')).toBe(false);
    expect(isPubliclyVisible('REJECTED')).toBe(false);
  });
});
