import type { PublicReview } from './queries';
import type { RatingSummary } from './engine';

/**
 * JSON-LD Service + AggregateRating + Review. Retourne null tant qu'il n'existe aucun
 * vrai avis : on ne publie jamais de note inventée ni vide. Seuls les avis réellement
 * affichés sur la page sont déclarés.
 */
export function buildServiceReviewsJsonLd(input: {
  serviceName: string;
  url: string;
  providerName: string;
  summary: RatingSummary;
  reviews: PublicReview[];
}): Record<string, unknown> | null {
  if (input.summary.count <= 0 || input.summary.average <= 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.serviceName,
    url: input.url,
    provider: { '@type': 'HealthAndBeautyBusiness', name: input.providerName },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: input.summary.average,
      reviewCount: input.summary.count,
      bestRating: 5,
      worstRating: 1,
    },
    review: input.reviews.map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.authorName },
      datePublished: review.submittedAt.slice(0, 10),
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      ...(review.comment ? { reviewBody: review.comment } : {}),
    })),
  };
}
