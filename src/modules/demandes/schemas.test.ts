import { describe, expect, it } from 'vitest';
import { customRequestDecisionSchema, customRequestSchema } from './schemas';

const validRequest = {
  name: 'Amina Test',
  email: 'amina@example.com',
  phone: '06 12 34 56 78',
  description: 'Je souhaite des tresses collées avec des mèches cuivrées pour un mariage.',
  hairLength: 'LONG',
  hairType: 'Cheveux naturels épais',
  currentStyle: 'Tresses depuis deux semaines',
  desiredDate: '2026-11-20',
  comment: 'Budget autour de 15 000 EUR.',
  consent: 'on',
  website: '',
};

describe('customRequestSchema', () => {
  it('should accept a complete custom request', () => {
    const result = customRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.consent).toBe(true);
  });

  it('should reject a request without consent', () => {
    expect(customRequestSchema.safeParse({ ...validRequest, consent: '' }).success).toBe(false);
  });

  it('should accept a Senegalese international number and an empty phone', () => {
    expect(
      customRequestSchema.safeParse({ ...validRequest, phone: '+49 151 23456789' }).success,
    ).toBe(true);
    expect(customRequestSchema.safeParse({ ...validRequest, phone: '' }).success).toBe(true);
  });

  it('should reject a phone containing letters or markup', () => {
    expect(
      customRequestSchema.safeParse({ ...validRequest, phone: '0612345678<script>' }).success,
    ).toBe(false);
    expect(
      customRequestSchema.safeParse({ ...validRequest, phone: 'appelez-moi demain' }).success,
    ).toBe(false);
  });

  it('should reject a too short description or invalid date', () => {
    expect(
      customRequestSchema.safeParse({ ...validRequest, description: 'Trop court' }).success,
    ).toBe(false);
    expect(
      customRequestSchema.safeParse({ ...validRequest, desiredDate: '20-11-2026' }).success,
    ).toBe(false);
  });
});

describe('customRequestDecisionSchema', () => {
  it('should convert an estimated price in EUR into cents', () => {
    const result = customRequestDecisionSchema.safeParse({
      requestId: 'request-1',
      action: 'QUOTED',
      message: 'Voici une proposition adaptée.',
      estimatedPriceEur: '150',
      serviceId: '',
      proposedSlotLocal: '',
      timeZone: 'Europe/Paris',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.estimatedPriceEur).toBe(15_000);
  });

  it('should accept an empty price and reject a negative one', () => {
    const base = {
      requestId: 'request-1',
      action: 'INFO_REQUESTED',
      message: 'Pouvez-vous préciser la longueur ?',
      timeZone: 'Europe/Paris',
    };
    const empty = customRequestDecisionSchema.safeParse({ ...base, estimatedPriceEur: '' });
    expect(empty.success).toBe(true);
    if (empty.success) expect(empty.data.estimatedPriceEur).toBeNull();
    expect(
      customRequestDecisionSchema.safeParse({ ...base, estimatedPriceEur: '-10' }).success,
    ).toBe(false);
  });

  it('should accept a take-over without message but require one for other decisions', () => {
    const base = { requestId: 'request-1', estimatedPriceEur: '', timeZone: 'Europe/Berlin' };
    expect(
      customRequestDecisionSchema.safeParse({ ...base, action: 'IN_REVIEW', message: '' }).success,
    ).toBe(true);
    expect(
      customRequestDecisionSchema.safeParse({ ...base, action: 'ACCEPTED', message: '' }).success,
    ).toBe(false);
  });

  it('should reject decimal EUR amounts and accept large ones', () => {
    const base = {
      requestId: 'request-1',
      action: 'QUOTED',
      message: 'Devis pour votre demande.',
      timeZone: 'Europe/Berlin',
    };
    expect(
      customRequestDecisionSchema.safeParse({ ...base, estimatedPriceEur: '15000.5' }).success,
    ).toBe(false);
    const big = customRequestDecisionSchema.safeParse({ ...base, estimatedPriceEur: '2500' });
    expect(big.success).toBe(true);
    if (big.success) expect(big.data.estimatedPriceEur).toBe(250_000);
  });
});
