import { describe, expect, it } from 'vitest';
import { categoryLabel, formatDuration, formatPrice, formatPriceRange } from './catalogue';

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

describe('formatPrice / formatDuration (allemand)', () => {
  it('should format prices and durations in German', () => {
    const base = { priceFromCents: 5000, priceToCents: null, priceOnRequest: false };
    expect(norm(formatPrice(base, 'de'))).toBe('Ab 50 €');
    expect(norm(formatPrice({ ...base, priceToCents: 7500 }, 'de'))).toBe('50 - 75 €');
    expect(formatPrice({ ...base, priceOnRequest: true }, 'de')).toBe('Preis auf Anfrage');
    expect(formatDuration(90, 'de')).toBe('1 Std. 30 Min.');
    expect(formatDuration(45, 'de')).toBe('45 Min.');
    expect(formatDuration(null, 'de')).toBe('Dauer nach Absprache');
  });

  it('should keep French output by default', () => {
    expect(formatDuration(90)).toBe('1 h 30');
    expect(formatDuration(0)).toBe('Durée à confirmer');
    expect(
      norm(formatPrice({ priceFromCents: 5000, priceToCents: null, priceOnRequest: false })),
    ).toBe('À partir de 50 €');
  });
});

describe('categoryLabel', () => {
  it('should translate default categories only, never admin-entered ones', () => {
    expect(categoryLabel('de', 'pose-de-lace', 'Pose de lace')).toBe('Lace-Installation');
    expect(categoryLabel('de', 'nouvelle-categorie', 'Ma catégorie')).toBe('Ma catégorie');
    expect(categoryLabel('fr', 'pose-de-lace', 'Pose de lace')).toBe('Pose de lace');
  });
});
