import { MessageSquareText } from 'lucide-react';
import { ReviewForm } from '@/components/avis/ReviewForm';
import { ReviewList } from '@/components/avis/ReviewList';
import { Stars } from '@/components/shared/Stars';
import { Title } from '@/components/ui/Title';
import { formatAverage, formatReviewCount, type RatingSummary } from '@/modules/avis/engine';
import { buildServiceReviewsJsonLd } from '@/modules/avis/jsonld';
import type { PublicReview } from '@/modules/avis/queries';

/* Section « Avis » d'une fiche prestation : moyenne, liste, formulaire. Le JSON-LD n'est
   émis que s'il existe de vrais avis. */
export function ReviewsSection({
  service,
  summary,
  reviews,
  hasMore,
  photosEnabled,
  providerName,
  url,
}: {
  service: { id: string; name: string };
  summary: RatingSummary;
  reviews: PublicReview[];
  hasMore: boolean;
  photosEnabled: boolean;
  providerName: string;
  url: string;
}) {
  const jsonLd = buildServiceReviewsJsonLd({
    serviceName: service.name,
    url,
    providerName,
    summary,
    reviews,
  });

  return (
    <section id="avis" aria-labelledby="avis-titre" className="space-y-6 border-t border-line pt-8">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <Title as="h2" id="avis-titre">
          Avis des clientes
        </Title>
        {summary.count > 0 ? (
          <div className="flex items-center gap-3" data-testid="rating-summary">
            <span className="font-heading text-4xl font-extrabold tabular-nums text-fg">
              {formatAverage(summary.average)}
            </span>
            <div className="flex flex-col gap-0.5">
              <Stars value={summary.average} size="lg" />
              <span className="text-sm text-muted">{formatReviewCount(summary.count)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div>
          {reviews.length > 0 ? (
            <ReviewList serviceId={service.id} initial={reviews} initialHasMore={hasMore} />
          ) : (
            <p className="rounded-[var(--radius-lg)] border border-dashed border-line p-8 text-center text-muted">
              Aucun avis pour cette prestation pour le moment. Sois la première à donner le tien.
            </p>
          )}
        </div>

        <div
          id="donner-mon-avis"
          className="rounded-[var(--radius-xl)] border border-line bg-card p-5 shadow-soft md:p-6 lg:sticky lg:top-28"
        >
          <h3 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-fg">
            <MessageSquareText aria-hidden="true" className="size-5 text-accent" />
            Donner mon avis
          </h3>
          <ReviewForm
            mode="public"
            serviceId={service.id}
            serviceName={service.name}
            photosEnabled={photosEnabled}
          />
        </div>
      </div>
    </section>
  );
}
