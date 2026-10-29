import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { LOCALES, absoluteUrl } from '@/i18n/config';

/**
 * P3.8 - Sitemap XML du site public.
 * Routes statiques + pages de prestations publiées (dynamiques depuis Prisma).
 * L'URL de base vient de NEXT_PUBLIC_APP_URL (fallback localhost en dev).
 */
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const STATIC_ROUTES = [
  { url: '/', changeFrequency: 'weekly' as const, priority: 1 },
  { url: '/coiffures', changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: '/contact', changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: '/galerie', changeFrequency: 'weekly' as const, priority: 0.7 },
  { url: '/faq', changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: '/infos-pratiques', changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: '/demandes-personnalisees', changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: '/mentions-legales', changeFrequency: 'yearly' as const, priority: 0.5 },
  { url: '/confidentialite', changeFrequency: 'yearly' as const, priority: 0.5 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  /** Alternates hreflang (fr, de, x-default) d'un chemin public. */
  const alternates = (path: string) => ({
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, path)])),
      'x-default': absoluteUrl('fr', path),
    },
  });

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.url}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: alternates(route.url),
  }));

  // Pages de prestations publiées (dynamiques)
  let serviceEntries: MetadataRoute.Sitemap = [];
  try {
    const services = await db.service.findMany({
      where: { status: 'PUBLISHED', category: { active: true } },
      select: { slug: true, updatedAt: true },
    });
    serviceEntries = services.map((service) => ({
      url: `${BASE_URL}/coiffures/${service.slug}`,
      lastModified: service.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      alternates: alternates(`/coiffures/${service.slug}`),
    }));
  } catch {
    // Base non disponible (build hors ligne) : on publie uniquement les routes statiques.
  }

  return [...staticEntries, ...serviceEntries];
}
