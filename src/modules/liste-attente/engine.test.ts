import { describe, expect, it } from 'vitest';
import {
  buildNotifyExpiry,
  isNotifyTokenValid,
  pickNextWaitingEntry,
  type WaitlistCandidate,
} from './engine';

function entry(overrides: Partial<WaitlistCandidate> = {}): WaitlistCandidate {
  return {
    id: 'w1',
    serviceId: 'service-1',
    desiredStartsAt: new Date('2026-06-01T10:00:00.000Z'),
    status: 'WAITING',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('pickNextWaitingEntry', () => {
  const slot = new Date('2026-06-01T10:00:00.000Z');

  it('picks the oldest waiting entry for the exact service and slot', () => {
    const older = entry({ id: 'older', createdAt: new Date('2026-04-01T00:00:00.000Z') });
    const newer = entry({ id: 'newer', createdAt: new Date('2026-04-15T00:00:00.000Z') });
    const result = pickNextWaitingEntry([newer, older], 'service-1', slot);
    expect(result?.id).toBe('older');
  });

  it('ignores entries for a different service', () => {
    const other = entry({ serviceId: 'service-2' });
    expect(pickNextWaitingEntry([other], 'service-1', slot)).toBeNull();
  });

  it('ignores entries for a different slot', () => {
    const other = entry({ desiredStartsAt: new Date('2026-06-02T10:00:00.000Z') });
    expect(pickNextWaitingEntry([other], 'service-1', slot)).toBeNull();
  });

  it('ignores entries that are not WAITING', () => {
    const notified = entry({ status: 'NOTIFIED' });
    expect(pickNextWaitingEntry([notified], 'service-1', slot)).toBeNull();
  });

  it('returns null when the list is empty', () => {
    expect(pickNextWaitingEntry([], 'service-1', slot)).toBeNull();
  });
});

describe('buildNotifyExpiry / isNotifyTokenValid', () => {
  it('builds an expiry 2 hours ahead by default', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    expect(buildNotifyExpiry(now).toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('considers a future expiry valid', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    expect(isNotifyTokenValid(buildNotifyExpiry(now), now)).toBe(true);
  });

  it('considers a past expiry invalid', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const past = new Date('2026-06-01T09:00:00.000Z');
    expect(isNotifyTokenValid(past, now)).toBe(false);
  });

  it('considers a null expiry invalid', () => {
    expect(isNotifyTokenValid(null, new Date())).toBe(false);
  });
});
