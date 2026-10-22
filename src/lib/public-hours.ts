import { getCachedSalonSettings } from '@/lib/public-cache';
import { formatOpeningHours } from '@/modules/parametres/hours';

/** Lignes d'horaires publiques (« Lundi - Dimanche : 5h - 22h »), valeurs par défaut si les paramètres sont illisibles. */
export async function getPublicHoursLines(): Promise<string[]> {
  try {
    const settings = await getCachedSalonSettings();
    return formatOpeningHours(settings.openingHours);
  } catch (error) {
    console.error('[horaires] paramètres illisibles, horaires par défaut', error);
    return formatOpeningHours(null);
  }
}
