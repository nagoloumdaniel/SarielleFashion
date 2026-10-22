import { describe, expect, it } from 'vitest';
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from './seo-jsonld';

const base = {
  locale: 'de' as const,
  slug: 'tresses',
  name: 'Tresses',
  priceFromCents: 4500,
  priceToCents: null,
  priceOnRequest: false,
};

describe('seo-jsonld', () => {
  it('declares an EUR offer only when a price is displayed', () => {
    const ld = serviceJsonLd(base) as { offers: Record<string, unknown>; url: string };
    expect(ld.offers).toMatchObject({ '@type': 'Offer', priceCurrency: 'EUR', price: 45 });
    expect(ld.url).toContain('/de/coiffures/tresses');
    expect(serviceJsonLd({ ...base, priceOnRequest: true })).not.toHaveProperty('offers');
    expect(serviceJsonLd({ ...base, priceFromCents: null })).not.toHaveProperty('offers');
  });

  it('uses an AggregateOffer for a price range', () => {
    const ld = serviceJsonLd({ ...base, priceToCents: 9000 }) as { offers: object };
    expect(ld.offers).toMatchObject({ lowPrice: 45, highPrice: 90, priceCurrency: 'EUR' });
  });

  it('builds localized breadcrumb and FAQ data, and skips an empty FAQ', () => {
    const bc = breadcrumbJsonLd('de', [
      { name: 'Start', path: '/' },
      { name: 'FAQ', path: '/faq' },
    ]) as {
      itemListElement: Array<{ item: string }>;
    };
    expect(bc.itemListElement[1]?.item).toMatch(/\/de\/faq$/);
    expect(faqJsonLd('fr', [])).toBeNull();
    expect(faqJsonLd('fr', [{ question: 'Q', answer: 'R' }])).toMatchObject({ '@type': 'FAQPage' });
  });
});
