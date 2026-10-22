import { getI18n } from '@/i18n/server';
import { PrestationCard } from './PrestationCard';
import type { RatingSummary } from '@/modules/avis/engine';
import {
  bookingHref,
  categoryLabel,
  formatDuration,
  formatPrice,
  serviceImages,
  type CatalogueService,
} from '@/lib/catalogue';

/** Carte prestation du catalogue (§4.2) : adapte une prestation à la carte immersive. */
export async function ServiceCard({
  service,
  priority = false,
  rating,
}: {
  service: CatalogueService;
  priority?: boolean;
  rating?: RatingSummary;
}) {
  const { locale, t } = await getI18n();
  const count = service.options.length;
  return (
    <PrestationCard
      href={`/coiffures/${service.slug}`}
      bookHref={bookingHref(service.slug)}
      images={serviceImages(service, locale)}
      badge={categoryLabel(locale, service.category.slug, service.category.name)}
      title={service.name}
      subtitle={service.description ?? undefined}
      price={formatPrice(service, locale)}
      duration={formatDuration(service.durationMinutes, locale)}
      optionsLabel={count === 0 ? undefined : t('catalogue.card.options', { count })}
      priority={priority}
      rating={rating}
    />
  );
}
