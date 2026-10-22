import { describe, expect, it } from 'vitest';
import {
  MAX_TRAVEL_FEE_FCFA,
  fcfaToCents,
  homeServiceSentence,
  homeServiceSettingsSchema,
} from './home-service';

describe('homeServiceSettingsSchema', () => {
  it('should accept an enabled option with a whole FCFA fee', () => {
    const result = homeServiceSettingsSchema.safeParse({
      homeServiceEnabled: 'on',
      travelFeeFcfa: '5000',
    });
    expect(result.success && result.data).toEqual({
      homeServiceEnabled: true,
      travelFeeFcfa: 5000,
    });
  });

  it('should treat a missing checkbox as disabled and a blank fee as zero', () => {
    const result = homeServiceSettingsSchema.safeParse({
      homeServiceEnabled: '',
      travelFeeFcfa: '',
    });
    expect(result.success && result.data).toEqual({
      homeServiceEnabled: false,
      travelFeeFcfa: 0,
    });
  });

  it.each(['-1', '12.5', 'abc', '1e3', String(MAX_TRAVEL_FEE_FCFA + 1)])(
    'should reject the fee %s',
    (fee) => {
      expect(
        homeServiceSettingsSchema.safeParse({ homeServiceEnabled: 'on', travelFeeFcfa: fee })
          .success,
      ).toBe(false);
    },
  );

  it('should accept the maximum fee', () => {
    expect(
      homeServiceSettingsSchema.safeParse({
        homeServiceEnabled: 'on',
        travelFeeFcfa: String(MAX_TRAVEL_FEE_FCFA),
      }).success,
    ).toBe(true);
  });
});

describe('fcfaToCents', () => {
  it('should convert whole FCFA to the internal 1/100 unit', () => {
    expect(fcfaToCents(5000)).toBe(500000);
    expect(fcfaToCents(0)).toBe(0);
  });
});

describe('homeServiceSentence', () => {
  it('should announce the option with the extra travel fee', () => {
    const sentence = homeServiceSentence(500000);
    expect(sentence).toContain('Coiffure à domicile possible en option');
    expect(sentence).toContain('frais de déplacement en supplément');
    expect(sentence).toMatch(/5\s000/);
  });

  it('should not claim extra fees when the travel is free', () => {
    const sentence = homeServiceSentence(0);
    expect(sentence).toContain('Coiffure à domicile possible en option');
    expect(sentence).not.toContain('en supplément');
  });

  it('should never state that Patricia travels as a general rule', () => {
    expect(homeServiceSentence(500000)).not.toMatch(/se déplace chez vous/i);
  });
});
