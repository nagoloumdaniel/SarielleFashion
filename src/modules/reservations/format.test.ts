import { describe, expect, it } from 'vitest';
import { formatDuration, formatEuro, formatEuroOrPending } from './format';

describe('format EUR', () => {
  it('should convert hundredths of EUR without decimals', () => {
    expect(formatEuro(2_500_000).replace(/\s/g, ' ')).toMatch(/25 000/);
    expect(formatEuro(2_500_000)).not.toMatch(/[,.]\d{2}\b/);
  });

  it('should flag a missing price', () => {
    expect(formatEuroOrPending(null)).toBe('Prix à confirmer');
  });
});

describe('formatDuration', () => {
  it('should format minutes and hours', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(150)).toBe('2 h 30');
  });
});
