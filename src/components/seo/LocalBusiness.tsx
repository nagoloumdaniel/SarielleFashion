/**
 * P3.8 - Données structurées LocalBusiness (JSON-LD) pour Sarielle.
 * Aide les moteurs de recherche à afficher les infos de l’activité (nom, adresse,
 * horaires) dans les résultats enrichis.
 */

export interface LocalBusinessData {
  name: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
  email: string;
  priceRange: string;
  servesCity: string;
  openingHours: Array<{ dayOfWeek: string; opens: string; closes: string }>;
}

export const LOCAL_BUSINESS: LocalBusinessData = {
  name: 'Sarielle Fashion',
  address: {
    streetAddress: 'Clausthal-Zellerfeld',
    addressLocality: 'Clausthal-Zellerfeld',
    addressRegion: 'Basse-Saxe',
    addressCountry: 'DE',
  },
  email: 'sarielletalla@gmail.com',
  priceRange: '€€',
  servesCity: 'Clausthal-Zellerfeld',
  // Horaires non communiqués : à renseigner dès qu'ils sont connus (aucune valeur inventée).
  openingHours: [],
};

/**
 * Génère le bloc JSON-LD LocalBusiness.
 * Le composant est un Server Component : le script est rendu statiquement dans le HTML.
 */
export default function LocalBusiness({ data }: { data: LocalBusinessData }) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: data.name,
    logo: `${appUrl}/brand/logo-mark-og.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: data.address.streetAddress,
      addressLocality: data.address.addressLocality,
      addressRegion: data.address.addressRegion,
      addressCountry: data.address.addressCountry,
    },
    email: data.email,
    priceRange: data.priceRange,
    servesCity: data.servesCity,
    ...(data.openingHours.length > 0 && {
      openingHoursSpecification: data.openingHours.map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.dayOfWeek,
        opens: h.opens,
        closes: h.closes,
      })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
