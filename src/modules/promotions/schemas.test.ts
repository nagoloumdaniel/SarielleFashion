import { describe, expect, it } from 'vitest';
import { promotionSchema } from './schemas';

const base = {
  name: 'Offre de rentrée',
  kind: 'PERCENT',
  value: '20',
  startsAt: '2026-09-01',
  endsAt: '2026-09-30',
  serviceIds: ['service-1'],
};

describe('promotionSchema : code promo', () => {
  it('accepte l’absence de code (promotion automatique)', () => {
    const empty = promotionSchema.safeParse({ ...base, code: '' });
    expect(empty.success && empty.data.code).toBeNull();
    const missing = promotionSchema.safeParse(base);
    expect(missing.success && missing.data.code).toBeNull();
  });

  it('met le code en majuscules et retire les espaces', () => {
    const result = promotionSchema.safeParse({ ...base, code: '  rentree-20 ' });
    expect(result.success && result.data.code).toBe('RENTREE-20');
  });

  it('refuse un code trop court, trop long ou avec caractères interdits', () => {
    for (const code of ['ab', 'A'.repeat(21), 'RENTRÉE', 'code espace', 'A_B']) {
      expect(promotionSchema.safeParse({ ...base, code }).success).toBe(false);
    }
  });
});
