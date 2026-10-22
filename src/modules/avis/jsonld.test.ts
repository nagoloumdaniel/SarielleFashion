import { describe, expect, it } from 'vitest';
import { buildServiceReviewsJsonLd } from './jsonld';

const review = {
  id: 'r1',
  rating: 5,
  comment: 'Très belle coiffure',
  authorName: 'Awa D.',
  verified: true,
  submittedAt: '2026-10-01T10:00:00.000Z',
  serviceName: 'Tresses',
  photos: [],
};

describe('buildServiceReviewsJsonLd', () => {
  const common = {
    serviceName: 'Tresses',
    url: 'https://x.test/coiffures/tresses',
    providerName: 'Salon',
  };

  it('returns null without real reviews', () => {
    expect(
      buildServiceReviewsJsonLd({ ...common, summary: { count: 0, average: 0 }, reviews: [] }),
    ).toBeNull();
  });

  it('declares the aggregate rating and the displayed reviews', () => {
    const ld = buildServiceReviewsJsonLd({
      ...common,
      summary: { count: 3, average: 4.7 },
      reviews: [review],
    }) as Record<string, any>;
    expect(ld['@type']).toBe('Service');
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.7, reviewCount: 3 });
    expect(ld.review).toHaveLength(1);
    expect(ld.review[0]).toMatchObject({
      datePublished: '2026-10-01',
      reviewBody: 'Très belle coiffure',
    });
  });
});
