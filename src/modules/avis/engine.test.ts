import { describe, expect, it } from 'vitest';
import {
  buildReviewTokenExpiry,
  cleanReviewText,
  formatAverage,
  formatReviewCount,
  isPubliclyVisible,
  isReviewTokenValid,
  isValidRating,
  publicAuthorName,
  summarizeRatings,
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

  it('considers a missing expiry invalid', () => {
    expect(isReviewTokenValid(null, new Date())).toBe(false);
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
  it('is visible as soon as the review is submitted with a rating (no moderation)', () => {
    expect(isPubliclyVisible({ submittedAt: new Date(), rating: 4 })).toBe(true);
  });

  it('is hidden while the e-mail request is unanswered', () => {
    expect(isPubliclyVisible({ submittedAt: null, rating: null })).toBe(false);
    expect(isPubliclyVisible({ submittedAt: new Date(), rating: null })).toBe(false);
    expect(isPubliclyVisible({ submittedAt: null, rating: 5 })).toBe(false);
  });
});

describe('cleanReviewText', () => {
  it('removes HTML tags and control characters', () => {
    expect(cleanReviewText('Super <b>coiffure</b><script>alert(1)</script>\u0007 !')).toBe(
      'Super coiffurealert(1) !',
    );
  });

  it('drops an unterminated tag', () => {
    expect(cleanReviewText('Top <img src=x onerror=alert(1)')).toBe('Top');
  });

  it('keeps harmless angle brackets', () => {
    expect(cleanReviewText('Top <3 et 2 < 3')).toBe('Top <3 et 2 < 3');
  });

  it('normalizes line breaks and trims', () => {
    expect(cleanReviewText('  a\r\n\r\n\r\n\r\nb  ')).toBe('a\n\nb');
  });
});

describe('summarizeRatings', () => {
  it('returns an empty summary without ratings', () => {
    expect(summarizeRatings([])).toEqual({ count: 0, average: 0 });
    expect(summarizeRatings([null, undefined])).toEqual({ count: 0, average: 0 });
  });

  it('averages to one decimal and ignores invalid values', () => {
    expect(summarizeRatings([5, 4, 4, null, 9])).toEqual({ count: 3, average: 4.3 });
  });
});

describe('formatting helpers', () => {
  it('uses a French decimal comma', () => {
    expect(formatAverage(4.3)).toBe('4,3');
    expect(formatAverage(5)).toBe('5,0');
  });

  it('pluralizes the review count', () => {
    expect(formatReviewCount(1)).toBe('1 avis');
    expect(formatReviewCount(12)).toBe('12 avis');
  });

  it('shortens the public author name', () => {
    expect(publicAuthorName('Awa Diallo')).toBe('Awa D.');
    expect(publicAuthorName('  Awa  ')).toBe('Awa');
    expect(publicAuthorName('Marie Anne de la Tour')).toBe('Marie T.');
    expect(publicAuthorName('')).toBe('Cliente');
  });
});
