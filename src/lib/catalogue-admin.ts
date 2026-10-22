import { Prisma } from '@prisma/client';
import type { AnswerType, HairLength, PhotoPolicy, ServiceStatus } from '@prisma/client';
import { isPermutation, OPTION_ORDER_BY } from '@/modules/catalogue/ordering';
import { db } from './db';
import { paginate } from './pagination';
import { AppError } from './errors';

/* ============================================================
 * Couche service admin catalogue (Phase 4) - opérations Prisma.
 * Les données sont validées par Zod dans les server actions ;
 * ces fonctions restent utilisables et testables côté serveur.
 * ============================================================ */

/* ------------------------------------------------------------------ */
/* Catégories (P4.2)                                                   */
/* ------------------------------------------------------------------ */

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  active: boolean;
  serviceCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const rows = await db.category.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      order: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { services: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    order: row.order,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    serviceCount: row._count.services,
  }));
}

/** Liste légère (id, nom, état) pour les menus : pas de comptage de prestations. */
export async function listCategoryOptions(): Promise<
  Array<{ id: string; name: string; active: boolean }>
> {
  return db.category.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, active: true },
  });
}

export async function getAdminCategory(id: string) {
  return db.category.findUnique({ where: { id } });
}

export async function categorySlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await db.category.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return !!existing;
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  order: number;
  active: boolean;
}) {
  if (await categorySlugExists(data.slug)) {
    throw new AppError('DUPLICATE', 'Cette catégorie existe déjà.', 409);
  }
  return db.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      order: data.order,
      active: data.active,
    },
  });
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    order?: number;
    active?: boolean;
  },
) {
  const category = await db.category.findUnique({ where: { id } });
  if (!category) throw new AppError('NOT_FOUND', 'Catégorie introuvable.', 404);

  if (data.slug != null && data.slug !== category.slug) {
    if (await categorySlugExists(data.slug, id)) {
      throw new AppError('DUPLICATE', 'Cette catégorie existe déjà.', 409);
    }
  }

  return db.category.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.slug != null ? { slug: data.slug } : {}),
      ...(data.description != null ? { description: data.description } : {}),
      ...(data.order != null ? { order: data.order } : {}),
      ...(data.active != null ? { active: data.active } : {}),
    },
  });
}

export async function deleteCategory(id: string) {
  const category = await db.category.findUnique({
    where: { id },
    select: { id: true, _count: { select: { services: true } } },
  });
  if (!category) throw new AppError('NOT_FOUND', 'Catégorie introuvable.', 404);
  if (category._count.services > 0) {
    throw new AppError(
      'CONFLICT',
      'Impossible de supprimer : des prestations sont associées à cette catégorie.',
      409,
    );
  }
  return db.category.delete({ where: { id } });
}

export async function setCategoryActive(id: string, active: boolean) {
  const category = await db.category.findUnique({ where: { id }, select: { id: true } });
  if (!category) throw new AppError('NOT_FOUND', 'Catégorie introuvable.', 404);
  return db.category.update({ where: { id }, data: { active } });
}

/** Réordonne TOUTES les catégories : l'ordre est la position dans `orderedIds` (0..n-1). */
export async function reorderCategories(orderedIds: string[]) {
  const categories = await db.category.findMany({ select: { id: true } });
  if (
    !isPermutation(
      orderedIds,
      categories.map((category) => category.id),
    )
  ) {
    throw new AppError('CONFLICT', 'La liste des catégories a changé, rechargez la page.', 409);
  }
  await db.$transaction(
    orderedIds.map((id, order) => db.category.update({ where: { id }, data: { order } })),
  );
}

/* ------------------------------------------------------------------ */
/* Prestations (P4.3)                                                  */
/* ------------------------------------------------------------------ */

export interface AdminService {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
  durationMinutes: number | null;
  status: ServiceStatus;
  order: number;
  imageCount: number;
  optionCount: number;
  /** Clé de la photo principale (vignette), null si aucune photo. */
  thumbKey: string | null;
}

export interface AdminServiceFilters {
  search?: string;
  categoryId?: string;
  status?: ServiceStatus;
}

export interface ServiceWriteInput {
  name: string;
  slug: string;
  description?: string | null;
  categoryId: string;
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
  durationMinutes: number | null;
  status: ServiceStatus;
  order: number;
}

export async function listAdminServices(
  filters: AdminServiceFilters = {},
  requestedPage = 1,
  pageSize = 12,
): Promise<{ items: AdminService[]; total: number; page: number; totalPages: number }> {
  const where: Prisma.ServiceWhereInput = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { slug: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.status) where.status = filters.status;

  const total = await db.service.count({ where });
  const { page, totalPages, skip, take } = paginate(total, requestedPage, pageSize);
  const rows = await db.service.findMany({
    where,
    skip,
    take,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
      category: { select: { name: true, slug: true } },
      priceFromCents: true,
      priceToCents: true,
      priceOnRequest: true,
      durationMinutes: true,
      status: true,
      order: true,
      images: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], take: 1, select: { key: true } },
      _count: { select: { images: true, options: true } },
    },
  });

  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    priceFromCents: row.priceFromCents,
    priceToCents: row.priceToCents,
    priceOnRequest: row.priceOnRequest,
    durationMinutes: row.durationMinutes,
    status: row.status,
    order: row.order,
    imageCount: row._count.images,
    optionCount: row._count.options,
    thumbKey: row.images[0]?.key ?? null,
  }));
  return { items, total, page, totalPages };
}

export interface AdminServiceImage {
  id: string;
  key: string;
  alt: string;
  order: number;
  isPrimary: boolean;
}

export interface AdminServiceOption {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
}

export interface AdminQuestion {
  id: string;
  key: string;
  label: string;
  type: AnswerType;
  options: string[];
  required: boolean;
  order: number;
  active: boolean;
  condition: Prisma.JsonValue | null;
}

export interface AdminCompatibilityRule {
  acceptedLengths: HairLength[];
  acceptedHairTypes: string[];
  requiresLocs: boolean;
  incompatibleLocs: boolean;
  photoPolicy: PhotoPolicy;
  autoApprove: boolean;
  conditionsNote: string | null;
  incompatibleMessage: string | null;
  uncertainMessage: string | null;
}

export interface AdminServiceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
  durationMinutes: number | null;
  status: ServiceStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  images: AdminServiceImage[];
  options: AdminServiceOption[];
  compatibility: AdminCompatibilityRule | null;
  questions: AdminQuestion[];
  appointmentCount: number;
}

/** Fiche sans les panneaux lourds (photos, options, compatibilité, questions) : 1 requête légère. */
export type AdminServiceCore = Omit<
  AdminServiceDetail,
  'images' | 'options' | 'compatibility' | 'questions'
> & { counts: { images: number; options: number; questions: number } };

export async function getAdminServiceCore(id: string): Promise<AdminServiceCore | null> {
  const service = await db.service.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      categoryId: true,
      category: { select: { name: true } },
      priceFromCents: true,
      priceToCents: true,
      priceOnRequest: true,
      durationMinutes: true,
      status: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { appointments: true, images: true, options: true, questions: true } },
    },
  });
  if (!service) return null;
  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    description: service.description,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    priceFromCents: service.priceFromCents,
    priceToCents: service.priceToCents,
    priceOnRequest: service.priceOnRequest,
    durationMinutes: service.durationMinutes,
    status: service.status,
    order: service.order,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    appointmentCount: service._count.appointments,
    counts: {
      images: service._count.images,
      options: service._count.options,
      questions: service._count.questions,
    },
  };
}

export async function getAdminServiceImages(serviceId: string): Promise<AdminServiceImage[]> {
  const rows = await db.serviceImage.findMany({
    where: { serviceId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, key: true, alt: true, order: true, isPrimary: true },
  });
  return rows;
}

export async function getAdminServiceOptions(serviceId: string): Promise<AdminServiceOption[]> {
  return db.serviceOption.findMany({
    where: { serviceId },
    orderBy: OPTION_ORDER_BY,
    select: { id: true, name: true, priceCents: true, durationMinutes: true, active: true },
  });
}

export async function getAdminServiceCompatibility(
  serviceId: string,
): Promise<AdminCompatibilityRule | null> {
  const rule = await db.compatibilityRule.findUnique({
    where: { serviceId },
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
  });
  return rule;
}

export async function getAdminServiceQuestions(serviceId: string): Promise<AdminQuestion[]> {
  return db.questionDefinition.findMany({
    where: { serviceId },
    orderBy: [{ order: 'asc' }, { label: 'asc' }],
    select: {
      id: true,
      key: true,
      label: true,
      type: true,
      options: true,
      required: true,
      order: true,
      active: true,
      condition: true,
    },
  });
}

/** Fiche complète (toutes les sections) : les 5 lectures partent en parallèle. */
export async function getAdminServiceDetail(id: string): Promise<AdminServiceDetail | null> {
  const [core, images, options, compatibility, questions] = await Promise.all([
    getAdminServiceCore(id),
    getAdminServiceImages(id),
    getAdminServiceOptions(id),
    getAdminServiceCompatibility(id),
    getAdminServiceQuestions(id),
  ]);
  if (!core) return null;
  const { counts: _counts, ...rest } = core;
  void _counts;
  return { ...rest, images, options, compatibility, questions };
}

export interface CatalogueStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  categories: number;
}

export async function getCatalogueStats(): Promise<CatalogueStats> {
  // 2 requêtes (au lieu de 5 comptages) : répartition par statut + nombre de catégories.
  const [byStatus, categories] = await Promise.all([
    db.service.groupBy({ by: ['status'], _count: { _all: true } }),
    db.category.count(),
  ]);
  const count = (status: ServiceStatus) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const published = count('PUBLISHED');
  const draft = count('DRAFT');
  const archived = count('ARCHIVED');
  return { total: published + draft + archived, published, draft, archived, categories };
}

export async function serviceSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await db.service.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return !!existing;
}

async function assertCategoryExists(categoryId: string) {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) throw new AppError('NOT_FOUND', 'Catégorie introuvable.', 404);
}

export async function createService(data: ServiceWriteInput) {
  await assertCategoryExists(data.categoryId);
  if (await serviceSlugExists(data.slug)) {
    throw new AppError('DUPLICATE', 'Cette prestation existe déjà.', 409);
  }
  return db.service.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      categoryId: data.categoryId,
      priceFromCents: data.priceFromCents,
      priceToCents: data.priceToCents,
      priceOnRequest: data.priceOnRequest,
      durationMinutes: data.durationMinutes,
      status: data.status,
      order: data.order,
    },
  });
}

export async function updateService(id: string, data: ServiceWriteInput) {
  const service = await db.service.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!service) throw new AppError('NOT_FOUND', 'Prestation introuvable.', 404);
  await assertCategoryExists(data.categoryId);
  if (data.slug !== service.slug && (await serviceSlugExists(data.slug, id))) {
    throw new AppError('DUPLICATE', 'Cette prestation existe déjà.', 409);
  }
  return db.service.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      categoryId: data.categoryId,
      priceFromCents: data.priceFromCents,
      priceToCents: data.priceToCents,
      priceOnRequest: data.priceOnRequest,
      durationMinutes: data.durationMinutes,
      status: data.status,
      order: data.order,
    },
  });
}

export async function setServiceStatus(id: string, status: ServiceStatus) {
  const service = await db.service.findUnique({ where: { id }, select: { id: true } });
  if (!service) throw new AppError('NOT_FOUND', 'Prestation introuvable.', 404);
  return db.service.update({ where: { id }, data: { status } });
}

/**
 * P4.6 : une prestation ayant des réservations historiques n'est JAMAIS
 * supprimée, elle est seulement archivée. La suppression n'est permise
 * que si aucun rendez-vous n'y est rattaché.
 */
export async function archiveService(id: string) {
  const service = await db.service.findUnique({ where: { id }, select: { id: true } });
  if (!service) throw new AppError('NOT_FOUND', 'Prestation introuvable.', 404);
  return db.service.update({ where: { id }, data: { status: 'ARCHIVED' } });
}

export async function deleteService(id: string) {
  const service = await db.service.findUnique({
    where: { id },
    select: { id: true, _count: { select: { appointments: true } } },
  });
  if (!service) throw new AppError('NOT_FOUND', 'Prestation introuvable.', 404);
  if (service._count.appointments > 0) {
    throw new AppError(
      'CONFLICT',
      'Cette prestation a des réservations historiques : archivez-la au lieu de la supprimer.',
      409,
    );
  }
  return db.service.delete({ where: { id } });
}

/* ------------------------------------------------------------------ */
/* Options payantes (P4.3)                                             */
/* ------------------------------------------------------------------ */

export async function createServiceOption(
  serviceId: string,
  data: { name: string; priceCents: number; durationMinutes: number; active: boolean },
) {
  const service = await db.service.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) throw new AppError('NOT_FOUND', 'Prestation introuvable.', 404);
  // Nouvelle option en dernière position.
  const last = await db.serviceOption.aggregate({ where: { serviceId }, _max: { order: true } });
  const order = (last._max.order ?? -1) + 1;
  return db.serviceOption.create({ data: { serviceId, ...data, order } });
}

export async function updateServiceOption(
  optionId: string,
  data: { name: string; priceCents: number; durationMinutes: number; active: boolean },
) {
  const option = await db.serviceOption.findUnique({
    where: { id: optionId },
    select: { id: true },
  });
  if (!option) throw new AppError('NOT_FOUND', 'Option introuvable.', 404);
  return db.serviceOption.update({ where: { id: optionId }, data });
}

export async function setServiceOptionActive(optionId: string, active: boolean) {
  const option = await db.serviceOption.findUnique({
    where: { id: optionId },
    select: { id: true },
  });
  if (!option) throw new AppError('NOT_FOUND', 'Option introuvable.', 404);
  return db.serviceOption.update({ where: { id: optionId }, data: { active } });
}

export async function deleteServiceOption(optionId: string) {
  const option = await db.serviceOption.findUnique({
    where: { id: optionId },
    select: { id: true },
  });
  if (!option) throw new AppError('NOT_FOUND', 'Option introuvable.', 404);
  return db.serviceOption.delete({ where: { id: optionId } });
}

/* ------------------------------------------------------------------ */
/* Photos de prestation (P4.4, P4.5)                                   */
/* ------------------------------------------------------------------ */

export const MAX_SERVICE_IMAGES = 8;

export async function addServiceImage(serviceId: string, key: string, alt: string) {
  const service = await db.service.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) throw new AppError('NOT_FOUND', 'Prestation introuvable.', 404);

  const count = await db.serviceImage.count({ where: { serviceId } });
  if (count >= MAX_SERVICE_IMAGES) {
    throw new AppError(
      'LIMIT',
      `Cette prestation a déjà ${MAX_SERVICE_IMAGES} photos, le maximum autorisé.`,
      409,
    );
  }
  const last = await db.serviceImage.findFirst({
    where: { serviceId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  return db.serviceImage.create({
    data: {
      serviceId,
      key,
      alt,
      order: (last?.order ?? -1) + 1,
      isPrimary: count === 0,
    },
  });
}

export async function getServiceImage(imageId: string) {
  return db.serviceImage.findUnique({ where: { id: imageId } });
}

/** Clés S3 des photos d'une prestation, pour nettoyer le stockage avant suppression. */
export async function getServiceImageKeys(serviceId: string): Promise<string[]> {
  const images = await db.serviceImage.findMany({
    where: { serviceId },
    select: { key: true },
  });
  return images.map((image) => image.key);
}

export async function updateServiceImageAlt(imageId: string, alt: string) {
  const image = await db.serviceImage.findUnique({ where: { id: imageId }, select: { id: true } });
  if (!image) throw new AppError('NOT_FOUND', 'Photo introuvable.', 404);
  return db.serviceImage.update({ where: { id: imageId }, data: { alt } });
}

/** La photo principale est toujours la première : on la place en tête puis on renumérote. */
export async function setPrimaryServiceImage(serviceId: string, imageId: string) {
  const images = await db.serviceImage.findMany({
    where: { serviceId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  if (!images.some((image) => image.id === imageId)) {
    throw new AppError('NOT_FOUND', 'Photo introuvable.', 404);
  }
  await applyImageOrder([imageId, ...images.map((i) => i.id).filter((id) => id !== imageId)]);
}

export async function deleteServiceImage(imageId: string) {
  const image = await db.serviceImage.findUnique({
    where: { id: imageId },
    select: { id: true, serviceId: true, isPrimary: true, key: true },
  });
  if (!image) throw new AppError('NOT_FOUND', 'Photo introuvable.', 404);

  await db.serviceImage.delete({ where: { id: imageId } });

  if (image.isPrimary) {
    const next = await db.serviceImage.findFirst({
      where: { serviceId: image.serviceId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    if (next) {
      await db.serviceImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }
  return image;
}

/* Écrit l'ordre 0..n-1 ; la première photo devient la principale (une seule à la fois). */
async function applyImageOrder(orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.serviceImage.update({ where: { id }, data: { order: index, isPrimary: index === 0 } }),
    ),
  );
}

export async function reorderServiceImages(serviceId: string, orderedIds: string[]) {
  const images = await db.serviceImage.findMany({
    where: { serviceId },
    select: { id: true },
  });
  if (
    !isPermutation(
      orderedIds,
      images.map((image) => image.id),
    )
  ) {
    throw new AppError('CONFLICT', 'La liste des photos a changé, rechargez la page.', 409);
  }
  await applyImageOrder(orderedIds);
}

/* ------------------------------------------------------------------ */
/* Règles de compatibilité (P4.7)                                      */
/* ------------------------------------------------------------------ */

export async function getCompatibilityRule(serviceId: string) {
  return db.compatibilityRule.findUnique({ where: { serviceId } });
}

export async function upsertCompatibilityRule(
  serviceId: string,
  data: {
    acceptedLengths: HairLength[];
    acceptedHairTypes: string[];
    requiresLocs: boolean;
    incompatibleLocs: boolean;
    photoPolicy: PhotoPolicy;
    autoApprove: boolean;
    conditionsNote: string;
    incompatibleMessage: string;
    uncertainMessage: string;
  },
) {
  const service = await db.service.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) throw new AppError('NOT_FOUND', 'Prestation introuvable.', 404);

  return db.compatibilityRule.upsert({
    where: { serviceId },
    create: {
      serviceId,
      acceptedLengths: data.acceptedLengths,
      acceptedHairTypes: data.acceptedHairTypes,
      requiresLocs: data.requiresLocs,
      incompatibleLocs: data.incompatibleLocs,
      photoPolicy: data.photoPolicy,
      autoApprove: data.autoApprove,
      conditionsNote: data.conditionsNote || null,
      incompatibleMessage: data.incompatibleMessage || null,
      uncertainMessage: data.uncertainMessage || null,
    },
    update: {
      acceptedLengths: data.acceptedLengths,
      acceptedHairTypes: data.acceptedHairTypes,
      requiresLocs: data.requiresLocs,
      incompatibleLocs: data.incompatibleLocs,
      photoPolicy: data.photoPolicy,
      autoApprove: data.autoApprove,
      conditionsNote: data.conditionsNote || null,
      incompatibleMessage: data.incompatibleMessage || null,
      uncertainMessage: data.uncertainMessage || null,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Questions capillaires (P4.8)                                        */
/* ------------------------------------------------------------------ */

async function questionKeyExists(serviceId: string, key: string, excludeId?: string) {
  const existing = await db.questionDefinition.findFirst({
    where: { serviceId, key, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return !!existing;
}

export async function createServiceQuestion(
  serviceId: string,
  data: {
    key: string;
    label: string;
    type: AnswerType;
    options: string[];
    required: boolean;
    active: boolean;
    order: number;
    condition: Prisma.InputJsonValue | null;
  },
) {
  const service = await db.service.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) throw new AppError('NOT_FOUND', 'Prestation introuvable.', 404);
  if (await questionKeyExists(serviceId, data.key)) {
    throw new AppError('DUPLICATE', 'Une question utilise déjà cette clé.', 409);
  }
  return db.questionDefinition.create({
    data: {
      serviceId,
      key: data.key,
      label: data.label,
      type: data.type,
      options: data.options,
      required: data.required,
      active: data.active,
      order: data.order,
      condition: data.condition ?? undefined,
    },
  });
}

export async function updateServiceQuestion(
  questionId: string,
  data: {
    key: string;
    label: string;
    type: AnswerType;
    options: string[];
    required: boolean;
    active: boolean;
    order: number;
    condition: Prisma.InputJsonValue | null;
  },
) {
  const question = await db.questionDefinition.findUnique({
    where: { id: questionId },
    select: { id: true, serviceId: true },
  });
  if (!question) throw new AppError('NOT_FOUND', 'Question introuvable.', 404);
  if (await questionKeyExists(question.serviceId, data.key, questionId)) {
    throw new AppError('DUPLICATE', 'Une question utilise déjà cette clé.', 409);
  }
  return db.questionDefinition.update({
    where: { id: questionId },
    data: {
      key: data.key,
      label: data.label,
      type: data.type,
      options: data.options,
      required: data.required,
      active: data.active,
      order: data.order,
      condition: data.condition === null ? Prisma.JsonNull : data.condition,
    },
  });
}

export async function deleteServiceQuestion(questionId: string) {
  const question = await db.questionDefinition.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!question) throw new AppError('NOT_FOUND', 'Question introuvable.', 404);
  return db.questionDefinition.delete({ where: { id: questionId } });
}

export async function reorderServiceQuestions(serviceId: string, orderedIds: string[]) {
  const questions = await db.questionDefinition.findMany({
    where: { serviceId },
    select: { id: true },
  });
  if (
    !isPermutation(
      orderedIds,
      questions.map((question) => question.id),
    )
  ) {
    throw new AppError('CONFLICT', 'La liste des questions a changé, rechargez la page.', 409);
  }
  await db.$transaction(
    orderedIds.map((id, order) =>
      db.questionDefinition.update({ where: { id, serviceId }, data: { order } }),
    ),
  );
}

export async function reorderServiceOptions(serviceId: string, orderedIds: string[]) {
  const options = await db.serviceOption.findMany({ where: { serviceId }, select: { id: true } });
  if (
    !isPermutation(
      orderedIds,
      options.map((option) => option.id),
    )
  ) {
    throw new AppError('CONFLICT', 'La liste des options a changé, rechargez la page.', 409);
  }
  await db.$transaction(
    orderedIds.map((id, order) =>
      db.serviceOption.update({ where: { id, serviceId }, data: { order } }),
    ),
  );
}
