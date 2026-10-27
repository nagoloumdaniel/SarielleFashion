import { unstable_cache } from 'next/cache';
import { getPublishedCategories, getPublishedServices, type CatalogueQuery } from './catalogue';
import { getSalonSettings } from '@/modules/disponibilites/queries';
import { withSignedImages } from './catalogue-images';

/* Lectures publiques mises en cache (60 s) : évite un aller-retour base de données
   (Neon) à chaque affichage de page. Invalidées par tag à chaque modification admin. */
export const CATALOGUE_TAG = 'catalogue';
export const SALON_SETTINGS_TAG = 'salon-settings';

export const getCachedCategories = unstable_cache(
  () => getPublishedCategories(),
  ['public-categories'],
  { revalidate: 60, tags: [CATALOGUE_TAG] },
);

export const getCachedServices = unstable_cache(
  async (query: CatalogueQuery) => {
    const result = await getPublishedServices(query);
    // Photos du bucket privé : URL signées (valables 1 h, cache de 60 s).
    return { ...result, services: await Promise.all(result.services.map(withSignedImages)) };
  },
  ['public-services'],
  { revalidate: 60, tags: [CATALOGUE_TAG] },
);

export const getCachedSalonSettings = unstable_cache(
  () => getSalonSettings(),
  ['public-salon-settings'],
  { revalidate: 60, tags: [SALON_SETTINGS_TAG] },
);
