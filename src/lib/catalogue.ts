import { z } from 'zod';
import type { HairLength, PhotoPolicy, Prisma } from '@prisma/client';
import { db } from './db';
import { OPTION_ORDER_BY } from '@/modules/catalogue/ordering';

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

export const HAIR_LENGTH_LABELS: Record<HairLength, string> = {
  SHORT: 'Cheveux courts',
  MEDIUM: 'Longueur moyenne',
  LONG: 'Cheveux longs',
  VERY_LONG: 'Cheveux très longs',
};

export const PHOTO_POLICY_LABELS: Record<PhotoPolicy, string | null> = {
  REQUIRED: 'Une photo de vos cheveux est obligatoire pour l’évaluation.',
  OPTIONAL: 'Vous pouvez joindre une photo de vos cheveux (facultatif).',
  FORBIDDEN: null,
};

/** Galerie d'une fiche : images réelles, sinon photos de démonstration. */
export function serviceGallery(
  service: Pick<ServiceDetail, 'name' | 'slug' | 'images' | 'category'>,
): { key: string; src: string; alt: string }[] {
  const displayable = service.images.filter((image) => isDisplayableImageKey(image.key));
  if (displayable.length > 0) {
    return displayable.map((image, index) => ({
      key: image.id,
      src: image.key,
      alt:
        image.alt ||
        `${service.name} - photo ${index + 1} sur ${displayable.length} (${service.category.name})`,
    }));
  }

  const fallback = demoImage(service);
  return [{ key: 'demo', src: fallback.src, alt: fallback.alt }];
}

/* ------------------------------------------------------------------ */
/* Helpers d'affichage partagés (cartes, fiche, accueil)              */
/* ------------------------------------------------------------------ */

type Placeholder = { src: string; alt: string };

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

/**
 * Photos de démonstration par catégorie, tant que les uploads S3 (P4.4)
 * n'existent pas. Elles seront remplacées par les vraies photos de Patricia.
 * Source : Pexels (utilisation libre, crédit non obligatoire).
 */
const CATEGORY_PLACEHOLDERS: Record<string, Placeholder[]> = {
  tresses: [
    {
      src: pexels(36441633),
      alt: 'Tresses africaines en cours de réalisation (photo de démonstration)',
    },
    {
      src: pexels(33664383),
      alt: 'Coiffure tressée élégante vue de profil (photo de démonstration)',
    },
    {
      src: pexels(31801412),
      alt: 'Portrait d’une femme aux cheveux tressés (photo de démonstration)',
    },
  ],
  vanilles: [
    {
      src: pexels(37547660),
      alt: 'Femmes aux cheveux tressés en vanilles (photo de démonstration)',
    },
    {
      src: pexels(33475847),
      alt: 'Portrait d’une femme aux cheveux tressés (photo de démonstration)',
    },
  ],
  locs: [
    {
      src: pexels(30152002),
      alt: 'Femme portant des locs (photo de démonstration)',
    },
    {
      src: pexels(14778613),
      alt: 'Cheveux naturels bouclés en close-up (photo de démonstration)',
    },
  ],
  'depart-de-locs': [
    {
      src: pexels(31801412),
      alt: 'Portrait d’une femme aux cheveux tressés (photo de démonstration)',
    },
    {
      src: pexels(30152002),
      alt: 'Femme portant des locs (photo de démonstration)',
    },
  ],
  protectrices: [
    {
      src: pexels(16563139),
      alt: 'Mains d’une coiffeuse réalisant une coiffure protectrice (photo de démonstration)',
    },
    {
      src: pexels(11269055),
      alt: 'Femme aux cheveux courts et soignés (photo de démonstration)',
    },
  ],
  coupes: [
    {
      src: pexels(11269055),
      alt: 'Femme aux cheveux courts et soignés (photo de démonstration)',
    },
    {
      src: pexels(10825829),
      alt: 'Portrait de démonstration d’une femme coiffée (photo de démonstration)',
    },
    {
      src: pexels(10810251),
      alt: 'Cheveux courts colorés et coiffés (photo de démonstration)',
    },
  ],
};

const DEFAULT_PLACEHOLDERS = CATEGORY_PLACEHOLDERS.tresses ?? [];

/** Une clé d'image est exploitable directement si c'est déjà une URL. */
function isDisplayableImageKey(key: string): boolean {
  return /^(https?:)?\/\//.test(key) || key.startsWith('/');
}

/** Choisit une photo de démonstration stable pour une prestation donnée. */
function demoImage(service: Pick<CatalogueService, 'slug' | 'category'>): Placeholder {
  const gallery = CATEGORY_PLACEHOLDERS[service.category.slug] ?? DEFAULT_PLACEHOLDERS;
  if (gallery.length === 0) {
    throw new Error('Aucune photo de démonstration configurée.');
  }
  const index =
    [...service.slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % gallery.length;
  return gallery[index] ?? gallery[0]!;
}

/**
 * Résout l'image principale d'une prestation.
 * Les clés S3 nues (P4.4) nécessiteront une URL signée : en attendant,
 * on affiche la photo de démonstration de la catégorie.
 */
export function serviceImage(service: Pick<CatalogueService, 'slug' | 'images' | 'category'>): {
  src: string;
  alt: string;
} {
  const primary = service.images[0];
  const fallback = demoImage(service);
  return {
    src: primary && isDisplayableImageKey(primary.key) ? primary.key : fallback.src,
    alt: primary?.alt || fallback.alt,
  };
}

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CURRENCY_UNIT = 'FCFA';

/** Montant en FCFA sans décimale (valeur interne en 1/100 FCFA). */
function formatEuros(cents: number): string {
  return `${amountFormatter.format(cents / 100)} ${CURRENCY_UNIT}`;
}

/**
 * Fourchette de prix : « 50 - 75 FCFA » (demi-cadratin entouré d'espaces fines,
 * unité affichée une seule fois). Valeurs en 1/100 FCFA (colonnes *Cents).
 */
export function formatPriceRange(fromCents: number, toCents: number): string {
  return `${amountFormatter.format(fromCents / 100)} - ${formatEuros(toCents)}`;
}

/** Les 4 modes de prix du §4.4 : fixe, départ, fourchette, « Prix à confirmer ». */
export function formatPrice(service: {
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
}): string {
  const { priceFromCents: from, priceToCents: to, priceOnRequest } = service;

  if (priceOnRequest) return 'Prix à confirmer';

  if (from != null && to != null) {
    if (from === to) return formatEuros(from);
    return formatPriceRange(from, to);
  }
  if (from != null) return `À partir de ${formatEuros(from)}`;
  if (to != null) return `Jusqu'à ${formatEuros(to)}`;
  return 'Prix à confirmer';
}

export function formatDuration(durationMinutes: number | null): string {
  if (durationMinutes == null || durationMinutes <= 0) return 'Durée à confirmer';
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
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
): { src: string; alt: string }[] {
  const list = service.images
    .filter((image) => isDisplayableImageKey(image.key))
    .map((image) => ({ src: image.key, alt: image.alt || service.slug }));
  return list.length > 0 ? list : [serviceImage(service)];
}
