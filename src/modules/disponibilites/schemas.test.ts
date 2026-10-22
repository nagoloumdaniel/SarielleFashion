import { describe, expect, it } from 'vitest';
import {
  blockedPeriodSchema,
  settingsSchema,
  specificRuleSchema,
  weeklyRuleSchema,
} from './schemas';

describe('weeklyRuleSchema', () => {
  it('should convert 09:30 into 570 minutes', () => {
    const result = weeklyRuleSchema.safeParse({
      weekday: '1',
      start: '09:30',
      end: '18:00',
      active: 'on',
      timeZone: 'Europe/Paris',
      confirmConflicts: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start).toBe(570);
      expect(result.data.end).toBe(1080);
      expect(result.data.active).toBe(true);
      expect(result.data.confirmConflicts).toBe(false);
    }
  });

  it('should reject an end before the start', () => {
    const result = weeklyRuleSchema.safeParse({
      weekday: '1',
      start: '18:00',
      end: '09:00',
      timeZone: 'Europe/Paris',
    });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid time format', () => {
    const result = weeklyRuleSchema.safeParse({
      weekday: '1',
      start: '9h',
      end: '18:00',
      timeZone: 'Europe/Paris',
    });
    expect(result.success).toBe(false);
  });
});

describe('specificRuleSchema', () => {
  it('should accept a specific date window', () => {
    expect(
      specificRuleSchema.safeParse({
        dateISO: '2026-06-15',
        start: '14:00',
        end: '17:00',
        timeZone: 'Europe/Paris',
      }).success,
    ).toBe(true);
  });
});

describe('blockedPeriodSchema', () => {
  it('should accept a coherent blocked period', () => {
    expect(
      blockedPeriodSchema.safeParse({
        startsAtLocal: '2026-06-15T12:00',
        endsAtLocal: '2026-06-15T13:00',
        reason: 'Pause',
        timeZone: 'Europe/Paris',
      }).success,
    ).toBe(true);
  });

  it('should reject a blocked period ending before it starts', () => {
    expect(
      blockedPeriodSchema.safeParse({
        startsAtLocal: '2026-06-15T13:00',
        endsAtLocal: '2026-06-15T12:00',
        timeZone: 'Europe/Paris',
      }).success,
    ).toBe(false);
  });
});

describe('settingsSchema', () => {
  it('should accept valid booking settings', () => {
    expect(
      settingsSchema.safeParse({
        holdSlotMinutes: '30',
        minCancelNoticeMinutes: '30',
        reminderLeadHours: '24',
        bufferMinutes: '15',
        slotIntervalMinutes: '30',
        maxAdvanceDays: '60',
        minLeadTimeMinutes: '120',
        cancelReasonRequired: 'on',
        dataRetentionMonths: '36',
        photoRetentionDays: '90',
      }).success,
    ).toBe(true);
  });

  it('should reject an interval below five minutes', () => {
    expect(
      settingsSchema.safeParse({
        holdSlotMinutes: '30',
        minCancelNoticeMinutes: '30',
        reminderLeadHours: '24',
        bufferMinutes: '0',
        slotIntervalMinutes: '2',
        maxAdvanceDays: '60',
        minLeadTimeMinutes: '120',
        dataRetentionMonths: '36',
        photoRetentionDays: '90',
      }).success,
    ).toBe(false);
  });
});
