/**
 * P3.8 - Données structurées LocalBusiness (JSON-LD) pour Patricia.
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
  name: 'Hairstyle by Patricia',
  address: {
    streetAddress: 'Ouest - Foire',
    addressLocality: 'Dakar',
    addressRegion: 'Dakar',
    addressCountry: 'SN',
  },
  email: 'zepatricia7@gmail.com',
  priceRange: 'FCFA',
  servesCity: 'Dakar',
  openingHours: [
    { dayOfWeek: 'https://schema.org/Monday', opens: '05:00', closes: '22:00' },
    { dayOfWeek: 'https://schema.org/Tuesday', opens: '05:00', closes: '22:00' },
    { dayOfWeek: 'https://schema.org/Wednesday', opens: '05:00', closes: '22:00' },
    { dayOfWeek: 'https://schema.org/Thursday', opens: '05:00', closes: '22:00' },
    { dayOfWeek: 'https://schema.org/Friday', opens: '05:00', closes: '22:00' },
    { dayOfWeek: 'https://schema.org/Saturday', opens: '05:00', closes: '22:00' },
    { dayOfWeek: 'https://schema.org/Sunday', opens: '05:00', closes: '22:00' },
  ],
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
    image:
      'https://images.pexels.com/photos/10825829/pexels-photo-10825829.jpeg?auto=compress&cs=tinysrgb&w=400',
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
    openingHoursSpecification: data.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dayOfWeek,
      opens: h.opens,
      closes: h.closes,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
