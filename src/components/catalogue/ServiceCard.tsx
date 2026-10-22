import { PrestationCard } from './PrestationCard';
import type { RatingSummary } from '@/modules/avis/engine';
import {
  bookingHref,
  formatDuration,
  formatPrice,
  serviceImages,
  type CatalogueService,
} from '@/lib/catalogue';

/** Carte prestation du catalogue (§4.2) : adapte une prestation à la carte immersive. */
export function ServiceCard({
  service,
  priority = false,
  rating,
}: {
  service: CatalogueService;
  priority?: boolean;
  rating?: RatingSummary;
}) {
  const count = service.options.length;
  return (
    <PrestationCard
      href={`/coiffures/${service.slug}`}
      bookHref={bookingHref(service.slug)}
      images={serviceImages(service)}
      badge={service.category.name}
      title={service.name}
      subtitle={service.description ?? undefined}
      price={formatPrice(service)}
      duration={formatDuration(service.durationMinutes)}
      optionsLabel={count === 0 ? undefined : count === 1 ? '1 option' : `${count} options`}
      priority={priority}
      rating={rating}
    />
  );
}
