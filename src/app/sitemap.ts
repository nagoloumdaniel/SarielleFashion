import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { LOCALES, absoluteUrl } from '@/i18n/config';

/**
 * Sitemap XML multilingue : chaque page existe en fr et en de, avec alternates
 * (fr, de, x-default = français) sur chaque entrée. Prestations publiées incluses.
 * L'URL de base vient de NEXT_PUBLIC_APP_URL.
 */
const STATIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
  { path: '/coiffures', changeFrequency: 'weekly' as const, priority: 0.9 },
  { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/galerie', changeFrequency: 'weekly' as const, priority: 0.7 },
  { path: '/faq', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/infos-pratiques', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/demandes-personnalisees', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/compatibilite', changeFrequency: 'monthly' as const, priority: 0.6 },
  { path: '/mentions-legales', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/confidentialite', changeFrequency: 'yearly' as const, priority: 0.3 },
] as const;

function entries(
  path: string,
  lastModified: Date,
  changeFrequency: 'weekly' | 'monthly' | 'yearly',
  priority: number,
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = absoluteUrl(locale, path);
  languages['x-default'] = absoluteUrl('fr', path);
  return LOCALES.map((locale) => ({
    url: absoluteUrl(locale, path),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const result: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((route) =>
    entries(route.path, now, route.changeFrequency, route.priority),
  );

  try {
    const [services, lastPhoto] = await Promise.all([
      db.service.findMany({
        where: { status: 'PUBLISHED', category: { active: true } },
        select: { slug: true, updatedAt: true },
      }),
      db.galleryPhoto.findFirst({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    for (const service of services) {
      result.push(...entries(`/coiffures/${service.slug}`, service.updatedAt, 'monthly', 0.8));
    }
    if (lastPhoto) {
      // La galerie change quand une photo est ajoutée : date réelle de la dernière photo.
      for (const item of result) {
        if (/\/galerie$/.test(item.url)) item.lastModified = lastPhoto.createdAt;
      }
    }
  } catch {
    // Base non disponible (build hors ligne) : on publie uniquement les routes statiques.
  }

  return result;
}
