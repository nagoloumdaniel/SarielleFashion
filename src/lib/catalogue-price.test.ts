import { describe, expect, it } from 'vitest';
import { formatPrice, formatPriceRange } from './catalogue';

const norm = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatPriceRange', () => {
  it('affiche la fourchette avec un seul € et un tiret simple', () => {
    expect(norm(formatPriceRange(5000, 7500))).toBe('50 - 75 €');
    expect(formatPriceRange(5000, 7500)).toContain(' - ');
    expect(formatPriceRange(5000, 7500).match(/€/g)).toHaveLength(1);
  });
  it('est utilisé par formatPrice pour une fourchette', () => {
    expect(
      norm(formatPrice({ priceFromCents: 2000000, priceToCents: 3000000, priceOnRequest: false })),
    ).toBe('20 000 - 30 000 €');
  });
});
