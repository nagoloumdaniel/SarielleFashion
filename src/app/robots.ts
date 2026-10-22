import { MetadataRoute } from 'next';
import { siteUrl } from '@/i18n/config';

/**
 * robots.txt : pages publiques explorables (fr + /de) ; espace privé, API, connexion et
 * pages à jeton (annulation, avis, confirmation de liste d'attente) exclus et en noindex.
 */
const PRIVATE = ['/dashboard/', '/api/', '/connexion', '/annulation/', '/avis/', '/liste-attente/'];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [...PRIVATE, ...PRIVATE.map((p) => `/de${p}`)],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
