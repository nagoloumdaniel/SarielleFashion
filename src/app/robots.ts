import { MetadataRoute } from 'next';

/**
 * P3.8 - robots.txt du site public.
 * Autorise l'exploration de toutes les pages publiques et pointe vers le sitemap.
 */
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/dashboard/', '/api/', '/connexion', '/annulation/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
