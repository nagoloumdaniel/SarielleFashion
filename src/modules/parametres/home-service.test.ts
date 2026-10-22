import { describe, expect, it } from 'vitest';
import {
  MAX_TRAVEL_FEE_EUR,
  eurosToCents,
  homeServiceSentence,
  travelFeeFromLabel,
  homeServiceSettingsSchema,
} from './home-service';

describe('homeServiceSettingsSchema', () => {
  it('should accept an enabled option with a whole EUR fee', () => {
    const result = homeServiceSettingsSchema.safeParse({
      homeServiceEnabled: 'on',
      travelFeeEur: '50',
    });
    expect(result.success && result.data).toEqual({
      homeServiceEnabled: true,
      travelFeeEur: 50,
    });
  });

  it('should treat a missing checkbox as disabled and a blank fee as zero', () => {
    const result = homeServiceSettingsSchema.safeParse({
      homeServiceEnabled: '',
      travelFeeEur: '',
    });
    expect(result.success && result.data).toEqual({
      homeServiceEnabled: false,
      travelFeeEur: 0,
    });
  });

  it.each(['-1', '12.5', 'abc', '1e3', String(MAX_TRAVEL_FEE_EUR + 1)])(
    'should reject the fee %s',
    (fee) => {
      expect(
        homeServiceSettingsSchema.safeParse({ homeServiceEnabled: 'on', travelFeeEur: fee })
          .success,
      ).toBe(false);
    },
  );

  it('should accept the maximum fee', () => {
    expect(
      homeServiceSettingsSchema.safeParse({
        homeServiceEnabled: 'on',
        travelFeeEur: String(MAX_TRAVEL_FEE_EUR),
      }).success,
    ).toBe(true);
  });
});

describe('eurosToCents', () => {
  it('should convert whole EUR to the internal 1/100 unit', () => {
    expect(eurosToCents(50)).toBe(5000);
    expect(eurosToCents(0)).toBe(0);
  });
});

describe('homeServiceSentence', () => {
  it('should announce the option with the extra travel fee', () => {
    const sentence = homeServiceSentence(500000);
    expect(sentence).toContain('Coiffure à domicile possible en option');
    expect(sentence).toContain('frais de déplacement à ta charge');
    expect(sentence).toMatch(/à partir de 5\s000/);
  });

  it('should not claim extra fees when the travel is free', () => {
    const sentence = homeServiceSentence(0);
    expect(sentence).toContain('Coiffure à domicile possible en option');
    expect(sentence).not.toContain('à partir de');
    expect(sentence).not.toContain('à ta charge');
  });

  it('should never state that Sarielle travels as a general rule', () => {
    expect(homeServiceSentence(500000)).not.toMatch(/se déplace chez vous/i);
  });
});

describe('travelFeeFromLabel', () => {
  it('should announce a fixed amount as a starting price', () => {
    expect(travelFeeFromLabel(1500)).toMatch(/^à partir de 15\s€$/);
  });
});
