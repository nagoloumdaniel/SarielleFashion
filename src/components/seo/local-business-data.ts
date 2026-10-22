/**
 * Données de l'activité (Sarielle Fashion) pour le JSON-LD LocalBusiness.
 * Fichier .ts séparé du composant pour rester testable sans JSX.
 */
import { OPENING_MAX, OPENING_MIN } from '@/modules/parametres/hours';

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
  // Horaires communiqués par Sarielle : lundi - dimanche, 5h - 22h (comme l'ancien site).
  openingHours: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
    (dayOfWeek) => ({ dayOfWeek, opens: OPENING_MIN, closes: OPENING_MAX }),
  ),
};
