import { z } from 'zod';
import type { HairLength, PhotoPolicy, Prisma } from '@prisma/client';
import { db } from './db';
import { OPTION_ORDER_BY } from '@/modules/catalogue/ordering';
import { INTL_LOCALE, DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { MESSAGES } from '@/i18n/messages';
import { createTranslator } from '@/i18n/translate';

/* ------------------------------------------------------------------ */
/* Paramètres de requête publique (P1.9, P3.2)                        */
/* ------------------------------------------------------------------ */

/**
 * Schéma des paramètres du catalogue. Les paramètres répétés (`?search=a&search=b`)
 * sont ramenés à leur première valeur avant validation par `parseCatalogueQuery`.
 */
export const catalogueQuerySchema = z.object({
  search: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined),
    z.string().min(1).max(120).optional(),
  ),
  category: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined),
    z.string().min(1).max(80).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
});

export type CatalogueQuery = z.infer<typeof catalogueQuerySchema>;

export const DEFAULT_PAGE_SIZE = 6;

/**
 * Normalise et valide les `searchParams` d'une page publique.
 * Une valeur invalide (page « abc », catégorie absente) retombe sur les
 * paramètres par défaut : le catalogue reste consultable, jamais une erreur 500.
 */
export function parseCatalogueQuery(
  raw: Record<string, string | string[] | undefined>,
): CatalogueQuery {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = catalogueQuerySchema.safeParse(normalized);
  if (parsed.success) return parsed.data;
  return catalogueQuerySchema.parse({});
}

/* ------------------------------------------------------------------ */
/* Lecture publique                                                   */
/* ------------------------------------------------------------------ */

const CATALOGUE_SERVICE_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceFromCents: true,
  priceToCents: true,
  priceOnRequest: true,
  durationMinutes: true,
  category: { select: { name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
    take: 4,
    select: { key: true, alt: true },
  },
  options: {
    where: { active: true },
    orderBy: OPTION_ORDER_BY,
    select: { name: true, priceCents: true },
  },
} satisfies Prisma.ServiceSelect;

export type CatalogueService = Prisma.ServiceGetPayload<{
  select: typeof CATALOGUE_SERVICE_SELECT;
}>;

export type CatalogueCategory = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export async function getPublishedCategories(): Promise<CatalogueCategory[]> {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { services: { where: { status: 'PUBLISHED' } } },
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    count: category._count.services,
  }));
}

export async function getPublishedServices(query: CatalogueQuery) {
  const { search, category, page, pageSize } = query;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ServiceWhereInput = { status: 'PUBLISHED' };
  if (category) where.category = { slug: category, active: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [services, total] = await Promise.all([
    db.service.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: CATALOGUE_SERVICE_SELECT,
    }),
    db.service.count({ where }),
  ]);

  return {
    services,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/* ------------------------------------------------------------------ */
/* Fiche détaillée (P3.3)                                             */
/* ------------------------------------------------------------------ */

const SERVICE_DETAIL_SELECT = {
  ...CATALOGUE_SERVICE_SELECT,
  images: {
    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
    select: { id: true, key: true, alt: true, order: true, isPrimary: true },
  },
  options: {
    where: { active: true },
    orderBy: OPTION_ORDER_BY,
    select: { id: true, name: true, priceCents: true, durationMinutes: true },
  },
  _count: { select: { questions: { where: { active: true } } } },
  compatibility: {
    select: {
      acceptedLengths: true,
      acceptedHairTypes: true,
      requiresLocs: true,
      incompatibleLocs: true,
      photoPolicy: true,
      autoApprove: true,
      conditionsNote: true,
      incompatibleMessage: true,
      uncertainMessage: true,
    },
  },
} satisfies Prisma.ServiceSelect;

export type ServiceDetail = Prisma.ServiceGetPayload<{
  select: typeof SERVICE_DETAIL_SELECT;
}>;

export async function getPublishedServiceBySlug(slug: string): Promise<ServiceDetail | null> {
  return db.service.findFirst({
    where: { slug, status: 'PUBLISHED', category: { active: true } },
    select: SERVICE_DETAIL_SELECT,
  });
}

/** Libellé d'une longueur de cheveux dans la langue demandée. */
export function hairLengthLabel(length: HairLength, locale: Locale = DEFAULT_LOCALE): string {
  return MESSAGES[locale].catalogue.hairLength[length];
}

/** Consigne photo d'une prestation (null si aucune photo n'est demandée). */
export function photoPolicyLabel(
  policy: PhotoPolicy,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  return policy === 'FORBIDDEN' ? null : MESSAGES[locale].catalogue.photoPolicy[policy];
}

/** Nom d'une catégorie : libellé traduit pour les catégories par défaut (par slug), sinon le nom saisi par l'admin. */
export function categoryLabel(locale: Locale, slug: string, name: string): string {
  if (locale === DEFAULT_LOCALE) return name;
  return MESSAGES[locale].catalogue.categories[slug] ?? name;
}

/** Galerie d'une fiche : images réelles, sinon photos de démonstration. */
export function serviceGallery(
  service: Pick<ServiceDetail, 'name' | 'slug' | 'images' | 'category'>,
  locale: Locale = DEFAULT_LOCALE,
): { key: string; src: string; alt: string }[] {
  const t = createTranslator(locale, MESSAGES[locale]);
  const displayable = service.images.filter((image) => isDisplayableImageKey(image.key));
  if (displayable.length > 0) {
    return displayable.map((image, index) => ({
      key: image.id,
      src: image.key,
      alt:
        image.alt ||
        t('catalogue.gallery.imageAlt', {
          name: service.name,
          n: index + 1,
          count: displayable.length,
          category: categoryLabel(locale, service.category.slug, service.category.name),
        }),
    }));
  }

  const fallback = demoImage(service, locale);
  return [{ key: 'demo', src: fallback.src, alt: fallback.alt }];
}

/* ------------------------------------------------------------------ */
/* Helpers d'affichage partagés (cartes, fiche, accueil)              */
/* ------------------------------------------------------------------ */

/** `alt` = clé de `catalogue.demoAlt` (traduite à l'affichage). */
type Placeholder = { src: string; alt: keyof (typeof MESSAGES)['fr']['catalogue']['demoAlt'] };

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

/**
 * Photos de démonstration par catégorie, tant que les uploads S3 (P4.4)
 * n'existent pas. Elles seront remplacées par les vraies photos de Sarielle.
 * Source : Pexels (utilisation libre, crédit non obligatoire).
 */
const CATEGORY_PLACEHOLDERS: Record<string, Placeholder[]> = {
  tresses: [
    {
      src: pexels(36441633),
      alt: 'braids',
    },
    {
      src: pexels(33664383),
      alt: 'braidsProfile',
    },
    {
      src: pexels(31801412),
      alt: 'braidsPortrait',
    },
  ],
  vanilles: [
    {
      src: pexels(37547660),
      alt: 'vanilles',
    },
    {
      src: pexels(33475847),
      alt: 'braidsPortrait',
    },
  ],
  locs: [
    {
      src: pexels(30152002),
      alt: 'locs',
    },
    {
      src: pexels(14778613),
      alt: 'curls',
    },
  ],
  'depart-de-locs': [
    {
      src: pexels(31801412),
      alt: 'braidsPortrait',
    },
    {
      src: pexels(30152002),
      alt: 'locs',
    },
  ],
  protectrices: [
    {
      src: pexels(16563139),
      alt: 'hands',
    },
    {
      src: pexels(11269055),
      alt: 'shortHair',
    },
  ],
  coupes: [
    {
      src: pexels(11269055),
      alt: 'shortHair',
    },
    {
      src: pexels(10825829),
      alt: 'portrait',
    },
    {
      src: pexels(10810251),
      alt: 'shortColored',
    },
  ],
};

const DEFAULT_PLACEHOLDERS = CATEGORY_PLACEHOLDERS.coupes ?? [];

/** Une clé d'image est exploitable directement si c'est déjà une URL. */
function isDisplayableImageKey(key: string): boolean {
  return /^(https?:)?\/\//.test(key) || key.startsWith('/');
}

/** Choisit une photo de démonstration stable pour une prestation donnée. */
function demoImage(
  service: Pick<CatalogueService, 'slug' | 'category'>,
  locale: Locale = DEFAULT_LOCALE,
): { src: string; alt: string } {
  const gallery = CATEGORY_PLACEHOLDERS[service.category.slug] ?? DEFAULT_PLACEHOLDERS;
  if (gallery.length === 0) {
    throw new Error('Aucune photo de démonstration configurée.');
  }
  const index =
    [...service.slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % gallery.length;
  const picked = gallery[index] ?? gallery[0]!;
  return { src: picked.src, alt: MESSAGES[locale].catalogue.demoAlt[picked.alt] };
}

/**
 * Résout l'image principale d'une prestation.
 * Les clés S3 nues (P4.4) nécessiteront une URL signée : en attendant,
 * on affiche la photo de démonstration de la catégorie.
 */
export function serviceImage(
  service: Pick<CatalogueService, 'slug' | 'images' | 'category'>,
  locale: Locale = DEFAULT_LOCALE,
): {
  src: string;
  alt: string;
} {
  const primary = service.images[0];
  const fallback = demoImage(service, locale);
  return {
    src: primary && isDisplayableImageKey(primary.key) ? primary.key : fallback.src,
    alt: primary?.alt || fallback.alt,
  };
}

const amountFormatters = new Map<Locale, Intl.NumberFormat>();

function amountFormatter(locale: Locale): Intl.NumberFormat {
  let formatter = amountFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    amountFormatters.set(locale, formatter);
  }
  return formatter;
}

const CURRENCY_UNIT = '€';

/** Montant en euros sans décimale (valeur interne en centimes). */
function formatEuros(cents: number, locale: Locale): string {
  return `${amountFormatter(locale).format(cents / 100)} ${CURRENCY_UNIT}`;
}

/**
 * Fourchette de prix : « 50 - 75 € » (tiret simple entouré d'espaces,
 * unité affichée une seule fois). Valeurs en centimes (colonnes *Cents).
 */
export function formatPriceRange(
  fromCents: number,
  toCents: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return `${amountFormatter(locale).format(fromCents / 100)} - ${formatEuros(toCents, locale)}`;
}

/** Les 4 modes de prix du §4.4 : fixe, départ, fourchette, « Prix à confirmer ». */
export function formatPrice(
  service: {
    priceFromCents: number | null;
    priceToCents: number | null;
    priceOnRequest: boolean;
  },
  locale: Locale = DEFAULT_LOCALE,
): string {
  const { priceFromCents: from, priceToCents: to, priceOnRequest } = service;
  const words = MESSAGES[locale].catalogue.price;
  const t = createTranslator(locale, MESSAGES[locale]);

  if (priceOnRequest) return words.onRequest;

  if (from != null && to != null) {
    if (from === to) return formatEuros(from, locale);
    return formatPriceRange(from, to, locale);
  }
  if (from != null) return t('catalogue.price.from', { price: formatEuros(from, locale) });
  if (to != null) return t('catalogue.price.upTo', { price: formatEuros(to, locale) });
  return words.onRequest;
}

export function formatDuration(
  durationMinutes: number | null,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (durationMinutes == null || durationMinutes <= 0) {
    return MESSAGES[locale].catalogue.price.durationPending;
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (locale === 'de') {
    if (hours > 0 && minutes > 0) return `${hours} Std. ${minutes} Min.`;
    if (hours > 0) return `${hours} Std.`;
    return `${minutes} Min.`;
  }
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes.toString().padStart(2, '0')}`;
  if (hours > 0) return `${hours} h`;
  return `${minutes} min`;
}

/** CTA « Réserver » d'une carte ou d'une fiche : le parcours arrive en Phase 6. */
export function bookingHref(slug: string): string {
  return `/reserver?service=${encodeURIComponent(slug)}`;
}

/** Toutes les photos affichables d'une prestation (jusqu'à 4), repli démo sinon. */
export function serviceImages(
  service: Pick<CatalogueService, 'slug' | 'images' | 'category'>,
  locale: Locale = DEFAULT_LOCALE,
): { src: string; alt: string }[] {
  const list = service.images
    .filter((image) => isDisplayableImageKey(image.key))
    .map((image) => ({ src: image.key, alt: image.alt || service.slug }));
  return list.length > 0 ? list : [serviceImage(service, locale)];
}
