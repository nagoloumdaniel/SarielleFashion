import { describe, expect, it } from 'vitest';
import {
  computeAvailableSlots,
  isSlotAvailable,
  isValidDateISO,
  weekdayOfDate,
  windowsForDate,
  type AvailabilityRuleInput,
} from './engine';

const TIME_ZONE = 'Europe/Paris';
const NOW = new Date('2026-06-01T08:00:00.000Z'); // lundi 10:00 à Paris

function weekly(
  weekday: number,
  startMinute: number,
  endMinute: number,
  active = true,
): AvailabilityRuleInput {
  return {
    kind: 'WEEKLY',
    weekday,
    date: null,
    startMinute,
    endMinute,
    active,
  };
}

const settings = {
  bufferMinutes: 0,
  slotIntervalMinutes: 30,
  minLeadTimeMinutes: 0,
  maxAdvanceDays: 60,
};

function slotsFor(overrides: Partial<Parameters<typeof computeAvailableSlots>[0]> = {}) {
  return computeAvailableSlots({
    dateISO: '2026-06-02', // mardi
    timeZone: TIME_ZONE,
    durationMinutes: 60,
    rules: [weekly(1, 9 * 60, 12 * 60)],
    blockedPeriods: [],
    busy: [],
    settings,
    now: NOW,
    ...overrides,
  });
}

describe('datetime helpers', () => {
  it('should map a date to a Monday-based weekday', () => {
    expect(weekdayOfDate('2026-06-01')).toBe(0); // lundi
    expect(weekdayOfDate('2026-06-02')).toBe(1); // mardi
    expect(weekdayOfDate('2026-06-07')).toBe(6); // dimanche
  });

  it('should validate real calendar dates', () => {
    expect(isValidDateISO('2026-02-28')).toBe(true);
    expect(isValidDateISO('2026-02-30')).toBe(false);
    expect(isValidDateISO('02-03-2026')).toBe(false);
  });
});

describe('windowsForDate', () => {
  it('treats an empty specific rule (00:00-00:00) as a closed day', () => {
    const closed: AvailabilityRuleInput = {
      kind: 'SPECIFIC',
      date: '2026-06-02',
      weekday: null,
      startMinute: 0,
      endMinute: 0,
      active: true,
    };
    expect(windowsForDate([weekly(1, 540, 720), closed], '2026-06-02')).toEqual([]);
    expect(windowsForDate([weekly(1, 540, 720), closed], '2026-06-09')).toEqual([
      { startMinute: 540, endMinute: 720 },
    ]);
  });

  it('should use the weekly rules of the matching weekday', () => {
    const windows = windowsForDate([weekly(1, 540, 720)], '2026-06-02');
    expect(windows).toEqual([{ startMinute: 540, endMinute: 720 }]);
  });

  it('should merge overlapping weekly windows', () => {
    const windows = windowsForDate([weekly(1, 540, 660), weekly(1, 600, 720)], '2026-06-02');
    expect(windows).toEqual([{ startMinute: 540, endMinute: 720 }]);
  });

  it('should let a specific date override the weekly rules', () => {
    const rules: AvailabilityRuleInput[] = [
      weekly(1, 540, 720),
      {
        kind: 'SPECIFIC',
        weekday: null,
        date: '2026-06-02',
        startMinute: 840,
        endMinute: 960,
        active: true,
      },
    ];
    expect(windowsForDate(rules, '2026-06-02')).toEqual([{ startMinute: 840, endMinute: 960 }]);
  });

  it('should ignore inactive rules', () => {
    expect(windowsForDate([weekly(1, 540, 720, false)], '2026-06-02')).toEqual([]);
  });
});

describe('computeAvailableSlots', () => {
  it('should generate slots inside opening hours with the configured interval', () => {
    const slots = slotsFor();
    expect(slots.map((slot) => slot.startMinute)).toEqual([540, 570, 600, 630, 660]);
    // 09:00 à Paris en juin = 07:00 UTC
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-06-02T07:00:00.000Z');
    expect(slots[0]?.endsAt.toISOString()).toBe('2026-06-02T08:00:00.000Z');
  });

  it('should return no slots on a closed day', () => {
    expect(
      computeAvailableSlots({
        dateISO: '2026-06-03', // mercredi, aucune règle
        timeZone: TIME_ZONE,
        durationMinutes: 60,
        rules: [weekly(1, 540, 720)],
        blockedPeriods: [],
        busy: [],
        settings,
        now: NOW,
      }),
    ).toEqual([]);
  });

  it('should remove slots overlapping a blocked period', () => {
    const slots = slotsFor({
      blockedPeriods: [
        {
          startsAt: new Date('2026-06-02T08:00:00.000Z'), // 10:00 Paris
          endsAt: new Date('2026-06-02T09:00:00.000Z'), // 11:00 Paris
        },
      ],
    });
    expect(slots.map((slot) => slot.startMinute)).toEqual([540, 660]);
  });

  it('should remove slots overlapping an existing appointment', () => {
    const slots = slotsFor({
      busy: [
        {
          startsAt: new Date('2026-06-02T07:30:00.000Z'), // 09:30
          endsAt: new Date('2026-06-02T08:30:00.000Z'), // 10:30
        },
      ],
    });
    expect(slots.map((slot) => slot.startMinute)).toEqual([630, 660]);
  });

  it('should apply a buffer between appointments', () => {
    const slots = slotsFor({
      settings: { ...settings, bufferMinutes: 15 },
      busy: [
        {
          startsAt: new Date('2026-06-02T07:30:00.000Z'),
          endsAt: new Date('2026-06-02T08:30:00.000Z'),
        },
      ],
    });
    expect(slots.map((slot) => slot.startMinute)).toEqual([660]);
  });

  it('should respect the minimum lead time', () => {
    const slots = slotsFor({
      now: new Date('2026-06-02T07:40:00.000Z'), // 09:40 Paris
      settings: { ...settings, minLeadTimeMinutes: 45 },
    });
    expect(slots[0]?.startMinute).toBe(630); // 10:30, première après 10:25
  });

  it('should refuse dates beyond the booking horizon', () => {
    expect(
      computeAvailableSlots({
        dateISO: '2026-08-30',
        timeZone: TIME_ZONE,
        durationMinutes: 60,
        rules: [weekly(6, 540, 720)],
        blockedPeriods: [],
        busy: [],
        settings,
        now: NOW,
      }),
    ).toEqual([]);
  });

  it('should invalidate an exact slot if it became busy', () => {
    const slots = slotsFor();
    expect(
      isSlotAvailable(
        {
          dateISO: '2026-06-02',
          timeZone: TIME_ZONE,
          durationMinutes: 60,
          rules: [weekly(1, 540, 720)],
          blockedPeriods: [],
          busy: [
            {
              startsAt: slots[0]!.startsAt,
              endsAt: slots[0]!.endsAt,
            },
          ],
          settings,
          now: NOW,
        },
        slots[0]!.startsAt,
      ),
    ).toBeNull();
  });

  it('should convert local minutes through DST correctly', () => {
    const spring = computeAvailableSlots({
      dateISO: '2026-03-29', // passage à l'heure d'été
      timeZone: TIME_ZONE,
      durationMinutes: 60,
      rules: [
        {
          kind: 'SPECIFIC',
          weekday: null,
          date: '2026-03-29',
          startMinute: 540,
          endMinute: 600,
          active: true,
        },
      ],
      blockedPeriods: [],
      busy: [],
      settings,
      now: new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(spring[0]?.startsAt.toISOString()).toBe('2026-03-29T07:00:00.000Z');

    const autumn = computeAvailableSlots({
      dateISO: '2026-10-25', // retour à l'heure d'hiver
      timeZone: TIME_ZONE,
      durationMinutes: 60,
      rules: [
        {
          kind: 'SPECIFIC',
          weekday: null,
          date: '2026-10-25',
          startMinute: 540,
          endMinute: 600,
          active: true,
        },
      ],
      blockedPeriods: [],
      busy: [],
      settings,
      now: new Date('2026-10-01T00:00:00.000Z'),
    });
    expect(autumn[0]?.startsAt.toISOString()).toBe('2026-10-25T08:00:00.000Z');
  });
});
