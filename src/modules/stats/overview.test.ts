import { describe, expect, it } from 'vitest';
import { parseStatsPeriod, salonDayBounds } from './overview';

describe('salonDayBounds', () => {
  it('should return the Berlin local day (CEST, UTC+2) in UTC', () => {
    const bounds = salonDayBounds(new Date('2026-10-19T10:00:00.000Z'));
    expect(bounds.start.toISOString()).toBe('2026-10-18T22:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-10-19T22:00:00.000Z');
  });

  it('should follow the season (CET, UTC+1, in winter)', () => {
    const bounds = salonDayBounds(new Date('2026-12-01T10:00:00.000Z'));
    expect(bounds.start.toISOString()).toBe('2026-11-30T23:00:00.000Z');
  });
});

describe('parseStatsPeriod', () => {
  it('should accept known periods and fall back to 30 days', () => {
    expect(parseStatsPeriod('7')).toBe('7');
    expect(parseStatsPeriod(['365', '7'])).toBe('365');
    expect(parseStatsPeriod('abc')).toBe('30');
    expect(parseStatsPeriod(undefined)).toBe('30');
  });
});
