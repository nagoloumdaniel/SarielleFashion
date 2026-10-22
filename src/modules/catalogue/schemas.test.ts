import { describe, expect, it } from 'vitest';
import {
  adminServiceFiltersSchema,
  categoryInputSchema,
  compatibilityRuleInputSchema,
  questionInputSchema,
  serviceInputSchema,
  serviceOptionInputSchema,
} from './schemas';

const validService = {
  name: 'Tresses collées',
  slug: 'tresses-collees',
  description: 'Une pose soignée.',
  categoryId: 'cm0category0000000000000000',
  priceMode: 'FROM',
  priceFromEuros: '45',
  durationMinutes: '180',
  status: 'DRAFT',
  order: '0',
};

describe('serviceInputSchema', () => {
  it('should accept a valid price from and parse decimal commas', () => {
    const result = serviceInputSchema.safeParse({
      ...validService,
      priceFromEuros: '45,50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceFromEuros).toBe(45.5);
      expect(result.data.durationMinutes).toBe(180);
    }
  });

  it('should accept a service without duration', () => {
    const withoutDuration = Object.fromEntries(
      Object.entries(validService).filter(([key]) => key !== 'durationMinutes'),
    );
    const result = serviceInputSchema.safeParse(withoutDuration);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.durationMinutes).toBeUndefined();
  });

  it('should reject a missing price outside ON_REQUEST', () => {
    const withoutPrice = Object.fromEntries(
      Object.entries(validService).filter(([key]) => key !== 'priceFromEuros'),
    );
    const result = serviceInputSchema.safeParse(withoutPrice);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('prix');
    }
  });

  it('should accept ON_REQUEST without any amount', () => {
    const result = serviceInputSchema.safeParse({ ...validService, priceMode: 'ON_REQUEST' });
    expect(result.success).toBe(true);
  });

  it('should reject a reversed range', () => {
    const result = serviceInputSchema.safeParse({
      ...validService,
      priceMode: 'RANGE',
      priceFromEuros: '90',
      priceToEuros: '40',
    });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid slug', () => {
    const result = serviceInputSchema.safeParse({ ...validService, slug: 'Tresses Collées' });
    expect(result.success).toBe(false);
  });

  it('should reject a missing category', () => {
    const result = serviceInputSchema.safeParse({ ...validService, categoryId: '' });
    expect(result.success).toBe(false);
  });
});

describe('serviceOptionInputSchema', () => {
  it('should accept a free option', () => {
    const result = serviceOptionInputSchema.safeParse({
      name: 'Soin hydratant',
      priceEuros: '0',
      durationMinutes: '15',
      active: 'on',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.active).toBe(true);
  });

  it('should reject a negative price', () => {
    const result = serviceOptionInputSchema.safeParse({
      name: 'Soin',
      priceEuros: '-5',
    });
    expect(result.success).toBe(false);
  });
});

describe('categoryInputSchema', () => {
  it('should accept a category with checked active', () => {
    const result = categoryInputSchema.safeParse({
      name: 'Tresses',
      slug: 'tresses',
      description: '',
      order: '2',
      active: 'on',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.active).toBe(true);
  });

  it('should treat a missing checkbox as inactive', () => {
    const result = categoryInputSchema.safeParse({
      name: 'Tresses',
      slug: 'tresses',
      order: '2',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.active).toBe(false);
  });
});

describe('compatibilityRuleInputSchema', () => {
  const validRule = {
    acceptedLengths: ['SHORT', 'MEDIUM'],
    requiresLocs: '',
    incompatibleLocs: '',
    photoPolicy: 'OPTIONAL',
    autoApprove: '',
    incompatibleMessage: '',
    uncertainMessage: '',
  };

  it('should accept selected lengths', () => {
    const result = compatibilityRuleInputSchema.safeParse(validRule);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.acceptedLengths).toEqual(['SHORT', 'MEDIUM']);
  });

  it('should reject a rule that both requires and refuses locs', () => {
    const result = compatibilityRuleInputSchema.safeParse({
      ...validRule,
      requiresLocs: 'on',
      incompatibleLocs: 'on',
    });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid hair length', () => {
    const result = compatibilityRuleInputSchema.safeParse({
      ...validRule,
      acceptedLengths: ['BALD'],
    });
    expect(result.success).toBe(false);
  });
});

describe('questionInputSchema', () => {
  const validQuestion = {
    key: 'longueur_actuelle',
    label: 'Quelle est la longueur actuelle de vos cheveux ?',
    type: 'SINGLE_CHOICE',
    required: 'on',
    active: 'on',
    order: '0',
    conditionDependsOn: '',
    conditionEquals: '',
  };

  it('should accept a simple question', () => {
    const result = questionInputSchema.safeParse(validQuestion);
    expect(result.success).toBe(true);
  });

  it('should accept a complete conditional question', () => {
    const result = questionInputSchema.safeParse({
      ...validQuestion,
      conditionDependsOn: 'porte_des_locs',
      conditionEquals: 'oui',
    });
    expect(result.success).toBe(true);
  });

  it('should reject a half-filled condition', () => {
    const result = questionInputSchema.safeParse({
      ...validQuestion,
      conditionDependsOn: 'porte_des_locs',
    });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid key', () => {
    const result = questionInputSchema.safeParse({ ...validQuestion, key: 'Longueur actuelle' });
    expect(result.success).toBe(false);
  });
});

describe('adminServiceFiltersSchema', () => {
  it('should ignore empty filters', () => {
    const result = adminServiceFiltersSchema.safeParse({
      search: '',
      categoryId: '',
      status: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBeUndefined();
      expect(result.data.categoryId).toBeUndefined();
      expect(result.data.status).toBeUndefined();
    }
  });

  it('should reject an unknown status to avoid a database error', () => {
    const result = adminServiceFiltersSchema.safeParse({ status: 'PUBLISH' });
    expect(result.success).toBe(false);
  });
});
