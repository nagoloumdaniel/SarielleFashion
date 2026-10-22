import { describe, expect, it } from 'vitest';
import {
  applyPromotion,
  findActivePromotion,
  findBestPromotion,
  normalizePromoCode,
  resolvePromoCode,
  type PromotionCandidate,
} from './pricing';

function promo(overrides: Partial<PromotionCandidate> = {}): PromotionCandidate {
  return {
    id: 'promo-1',
    name: 'Soldes',
    kind: 'PERCENT',
    value: 10,
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.000Z'),
    active: true,
    serviceIds: ['service-1'],
    code: null,
    ...overrides,
  };
}

describe('findActivePromotion', () => {
  it('finds a promotion covering the service at the given instant', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const result = findActivePromotion([promo()], 'service-1', now);
    expect(result?.id).toBe('promo-1');
  });

  it('ignores an inactive promotion', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const result = findActivePromotion([promo({ active: false })], 'service-1', now);
    expect(result).toBeNull();
  });

  it('ignores a promotion outside its validity window', () => {
    const before = new Date('2025-12-01T00:00:00.000Z');
    const result = findActivePromotion([promo()], 'service-1', before);
    expect(result).toBeNull();
  });

  it('ignores a promotion that does not target the service', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const result = findActivePromotion(
      [promo({ serviceIds: ['other-service'] })],
      'service-1',
      now,
    );
    expect(result).toBeNull();
  });
});

describe('applyPromotion', () => {
  it('applies a percentage discount', () => {
    const result = applyPromotion(10_000, { id: 'p1', name: 'Soldes', kind: 'PERCENT', value: 10 });
    expect(result.discountCents).toBe(1_000);
    expect(result.finalPriceCents).toBe(9_000);
  });

  it('applies a fixed discount', () => {
    const result = applyPromotion(10_000, {
      id: 'p1',
      name: 'Soldes',
      kind: 'FIXED',
      value: 1_500,
    });
    expect(result.discountCents).toBe(1_500);
    expect(result.finalPriceCents).toBe(8_500);
  });

  it('never produces a negative final price when the fixed discount exceeds the price', () => {
    const result = applyPromotion(1_000, { id: 'p1', name: 'Soldes', kind: 'FIXED', value: 5_000 });
    expect(result.discountCents).toBe(1_000);
    expect(result.finalPriceCents).toBe(0);
  });

  it('clamps a percentage above 100 to 100', () => {
    const result = applyPromotion(10_000, {
      id: 'p1',
      name: 'Soldes',
      kind: 'PERCENT',
      value: 250,
    });
    expect(result.discountCents).toBe(10_000);
    expect(result.finalPriceCents).toBe(0);
  });

  it('treats a negative value as no discount', () => {
    const result = applyPromotion(10_000, {
      id: 'p1',
      name: 'Soldes',
      kind: 'PERCENT',
      value: -10,
    });
    expect(result.discountCents).toBe(0);
    expect(result.finalPriceCents).toBe(10_000);
  });
});

const NOW = new Date('2026-06-01T10:00:00.000Z');

describe('normalizePromoCode', () => {
  it('trims and uppercases', () => {
    expect(normalizePromoCode('  rentree-20 ')).toBe('RENTREE-20');
  });

  it('returns null for empty or invalid characters', () => {
    expect(normalizePromoCode('   ')).toBeNull();
    expect(normalizePromoCode('ab')).toBeNull();
    expect(normalizePromoCode('code avec espace')).toBeNull();
    expect(normalizePromoCode('A'.repeat(21))).toBeNull();
    expect(normalizePromoCode(undefined)).toBeNull();
  });
});

describe('promotion with a code', () => {
  const coded = promo({ id: 'coded', code: 'BIENVENUE', value: 20 });

  it('is never applied automatically', () => {
    expect(findActivePromotion([coded], 'service-1', NOW)).toBeNull();
    expect(findBestPromotion([coded], 'service-1', NOW, 10_000)).toBeNull();
  });

  it('is applied when the customer enters the code, case-insensitive', () => {
    expect(findBestPromotion([coded], 'service-1', NOW, 10_000, 'bienvenue')?.id).toBe('coded');
    expect(findActivePromotion([coded], 'service-1', NOW, ' Bienvenue ')?.id).toBe('coded');
  });

  it('is not applied with a wrong code', () => {
    expect(findBestPromotion([coded], 'service-1', NOW, 10_000, 'AUTRE')).toBeNull();
  });
});

describe('findBestPromotion', () => {
  it('keeps only one promotion: the most advantageous, code included', () => {
    const auto = promo({ id: 'auto', value: 10 });
    const coded = promo({ id: 'coded', code: 'GROS', value: 30 });
    expect(findBestPromotion([auto, coded], 'service-1', NOW, 10_000)?.id).toBe('auto');
    expect(findBestPromotion([auto, coded], 'service-1', NOW, 10_000, 'GROS')?.id).toBe('coded');
  });

  it('keeps the automatic promotion when it beats the code', () => {
    const auto = promo({ id: 'auto', value: 50 });
    const coded = promo({ id: 'coded', code: 'PETIT', value: 5 });
    expect(findBestPromotion([auto, coded], 'service-1', NOW, 10_000, 'PETIT')?.id).toBe('auto');
  });

  it('compares percent and fixed promotions on the real price', () => {
    const percent = promo({ id: 'pct', value: 10 });
    const fixed = promo({ id: 'fix', kind: 'FIXED', value: 2_000 });
    expect(findBestPromotion([percent, fixed], 'service-1', NOW, 10_000)?.id).toBe('fix');
    expect(findBestPromotion([percent, fixed], 'service-1', NOW, 50_000)?.id).toBe('pct');
  });
});

describe('resolvePromoCode', () => {
  const coded = promo({ id: 'coded', code: 'BIENVENUE' });

  it('accepts an active, in-period, covering code', () => {
    const result = resolvePromoCode([coded], 'service-1', NOW, 'bienvenue');
    expect(result).toEqual({ ok: true, promotion: coded });
  });

  it('rejects an unknown code', () => {
    expect(resolvePromoCode([coded], 'service-1', NOW, 'INCONNU').ok).toBe(false);
  });

  it('rejects an inactive code', () => {
    expect(
      resolvePromoCode([promo({ code: 'BIENVENUE', active: false })], 'service-1', NOW, 'BIENVENUE')
        .ok,
    ).toBe(false);
  });

  it('rejects an expired code', () => {
    const late = new Date('2027-02-01T00:00:00.000Z');
    expect(resolvePromoCode([coded], 'service-1', late, 'BIENVENUE').ok).toBe(false);
  });

  it('rejects a code that does not cover the service', () => {
    expect(resolvePromoCode([coded], 'service-2', NOW, 'BIENVENUE').ok).toBe(false);
  });

  it('rejects an empty or malformed code', () => {
    expect(resolvePromoCode([coded], 'service-1', NOW, '').ok).toBe(false);
    expect(resolvePromoCode([coded], 'service-1', NOW, '!!').ok).toBe(false);
  });

  it('never reveals why: all failures share one message', () => {
    const messages = new Set(
      [
        resolvePromoCode([coded], 'service-1', NOW, 'INCONNU'),
        resolvePromoCode([coded], 'service-2', NOW, 'BIENVENUE'),
        resolvePromoCode([coded], 'service-1', new Date('2027-02-01T00:00:00.000Z'), 'BIENVENUE'),
      ].map((r) => (r.ok ? 'ok' : r.error)),
    );
    expect(messages.size).toBe(1);
  });
});
