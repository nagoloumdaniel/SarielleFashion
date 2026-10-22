import { describe, expect, it } from 'vitest';
import { deviceTimeToUtc, formatHour, utcToDeviceParts, WEEKDAY_FR } from './dates';

const TZ = 'Europe/Paris';

describe('deviceTimeToUtc', () => {
  it('ete UTC+2', () => {
    const utc = deviceTimeToUtc('2026-06-15', 14 * 60, TZ);
    expect(utc.toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });

  it('hiver UTC+1', () => {
    const utc = deviceTimeToUtc('2026-01-15', 14 * 60, TZ);
    expect(utc.toISOString()).toBe('2026-01-15T13:00:00.000Z');
  });

  it('minuit', () => {
    const utc = deviceTimeToUtc('2026-06-15', 0, TZ);
    expect(utc.toISOString()).toBe('2026-06-14T22:00:00.000Z');
  });

  it('New York UTC-4 ete', () => {
    const utc = deviceTimeToUtc('2026-06-15', 9 * 60, 'America/New_York');
    expect(utc.toISOString()).toBe('2026-06-15T13:00:00.000Z');
  });
});

describe('utcToDeviceParts', () => {
  it('decompose instant UTC', () => {
    const parts = utcToDeviceParts(new Date('2026-06-15T12:00:00.000Z'), TZ);
    expect(parts).toEqual({ dateISO: '2026-06-15', minute: 14 * 60, weekday: 0 });
    expect(WEEKDAY_FR[parts.weekday]).toBe('lundi');
  });

  it('decompose instant hiver', () => {
    const parts = utcToDeviceParts(new Date('2026-01-15T13:00:00.000Z'), TZ);
    expect(parts).toEqual({ dateISO: '2026-01-15', minute: 14 * 60, weekday: 3 });
  });

  it('aller-retour sans perte', () => {
    const utc = deviceTimeToUtc('2026-03-29', 10 * 60 + 30, TZ);
    const parts = utcToDeviceParts(utc, TZ);
    expect(parts.dateISO).toBe('2026-03-29');
    expect(parts.minute).toBe(10 * 60 + 30);
  });
});

describe('formatHour', () => {
  it('formate HH:MM', () => {
    expect(formatHour(9 * 60)).toBe('09:00');
    expect(formatHour(14 * 60 + 5)).toBe('14:05');
    expect(formatHour(0)).toBe('00:00');
    expect(formatHour(23 * 60 + 59)).toBe('23:59');
  });
});
