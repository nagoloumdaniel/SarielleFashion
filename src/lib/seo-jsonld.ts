import { absoluteUrl, siteUrl, type Locale } from '@/i18n/config';

/* Constructeurs JSON-LD fidèles au contenu visible. Aucune donnée inventée :
   pas de prix sans prix affiché, pas de note sans avis réels. */

export const TIKTOK_URL = 'https://www.tiktok.com/@sarielle6';

export function breadcrumbJsonLd(
  locale: Locale,
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(locale, item.path),
    })),
  };
}

export function faqJsonLd(
  locale: Locale,
  items: Array<{ question: string; answer: string }>,
): Record<string, unknown> | null {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export interface ServiceJsonLdInput {
  locale: Locale;
  slug: string;
  name: string;
  description?: string | null;
  categoryName?: string;
  imageUrl?: string | null;
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
}

/** Service + Offer en EUR (offre omise quand le prix n'est pas affiché : « sur demande »). */
export function serviceJsonLd(input: ServiceJsonLdInput): Record<string, unknown> {
  const url = absoluteUrl(input.locale, `/coiffures/${input.slug}`);
  const low = input.priceFromCents;
  const high = input.priceToCents;
  let offers: Record<string, unknown> | undefined;
  if (!input.priceOnRequest && low !== null && low > 0) {
    offers =
      high !== null && high > low
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'EUR',
            lowPrice: low / 100,
            highPrice: high / 100,
            url,
          }
        : { '@type': 'Offer', priceCurrency: 'EUR', price: low / 100, url };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: input.name,
    url,
    inLanguage: input.locale,
    ...(input.description ? { description: input.description } : {}),
    ...(input.categoryName ? { serviceType: input.categoryName } : {}),
    ...(input.imageUrl
      ? {
          image: input.imageUrl.startsWith('http')
            ? input.imageUrl
            : `${siteUrl()}${input.imageUrl}`,
        }
      : {}),
    provider: { '@type': 'HealthAndBeautyBusiness', name: 'Sarielle Fashion', url: siteUrl() },
    areaServed: 'Clausthal-Zellerfeld',
    ...(offers ? { offers } : {}),
  };
}
