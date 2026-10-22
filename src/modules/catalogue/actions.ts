'use server';

import { Prisma, ServiceStatus } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { requireAdmin } from '@/modules/auth/guards';
import { AppError } from '@/lib/errors';
import { logAudit } from '@/modules/stats/audit';
import {
  addServiceImage,
  archiveService,
  createCategory,
  createService,
  createServiceOption,
  createServiceQuestion,
  deleteCategory,
  deleteService,
  deleteServiceImage,
  deleteServiceOption,
  deleteServiceQuestion,
  getServiceImage,
  getServiceImageKeys,
  reorderCategories,
  reorderServiceImages,
  reorderServiceOptions,
  reorderServiceQuestions,
  setCategoryActive,
  setPrimaryServiceImage,
  setServiceOptionActive,
  setServiceStatus,
  updateCategory,
  updateService,
  updateServiceImageAlt,
  updateServiceOption,
  updateServiceQuestion,
  upsertCompatibilityRule,
} from '@/lib/catalogue-admin';
import {
  deleteImageObject,
  getStorageConfigurationHint,
  isStorageConfigured,
  uploadImageObject,
} from '@/modules/fichiers/storage';
import { buildServiceImageKey, validateImageFile } from '@/modules/fichiers/image-validation';
import { eurosToCents, priceFieldsFromInput } from './pricing';
import {
  adminServiceFiltersSchema,
  categoryInputSchema,
  compatibilityRuleInputSchema,
  imageAltSchema,
  orderedIdsSchema,
  questionInputSchema,
  serviceInputSchema,
  serviceOptionInputSchema,
  serviceStatusSchema,
} from './schemas';

/* ============================================================
 * Server actions - back-office catalogue (Phase 4).
 * Chaque action : garde requireAdmin + validation Zod + AuditLog.
 * Aucune donnée n'est modifiée sans autorisation vérifiée côté serveur.
 * ============================================================ */

export type CatalogueActionState = { error?: string; success?: string };

function handleError(error: unknown): CatalogueActionState {
  if (error instanceof AppError) return { error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return { error: 'Cet élément existe déjà.' };
    if (error.code === 'P2025') return { error: 'Élément introuvable.' };
  }
  console.error(error);
  return { error: 'Une erreur est survenue. Réessayez plus tard.' };
}

function parseForm<T extends z.ZodType>(
  schema: T,
  raw: unknown,
): { data: z.infer<T> } | { error: string } {
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Données invalides.' };
  }
  return { data: result.data };
}

function idFrom(formData: FormData): string {
  return String(formData.get('id') ?? '').trim();
}

function revalidateCatalogue(service?: { id?: string; slug?: string }) {
  revalidateTag('catalogue');
  revalidatePath('/dashboard/catalogue');
  revalidatePath('/dashboard/historique');
  // Toutes les fiches prestation (options, photos, questions… modifiées sans connaître l'id).
  revalidatePath('/dashboard/catalogue/prestations/[id]', 'page');
  if (service?.id) revalidatePath(`/dashboard/catalogue/prestations/${service.id}`);
  revalidatePath('/coiffures');
  if (service?.slug) revalidatePath(`/coiffures/${service.slug}`);
  // Page statique dont le menu « Prestation souhaitée » liste les prestations publiées.
  revalidatePath('/liste-attente');
}

/* ============================================================ */
/* Catégories (P4.2)                                            */
/* ============================================================ */

export async function adminCreateCategory(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = parseForm(categoryInputSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  try {
    const category = await createCategory({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || undefined,
      order: parsed.data.order,
      active: parsed.data.active,
    });
    await logAudit({
      userId: user.id,
      action: 'category.create',
      entityType: 'Category',
      entityId: category.id,
      metadata: { name: category.name },
    });
    revalidateCatalogue();
    return { success: 'Catégorie créée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminUpdateCategory(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  const parsed = parseForm(categoryInputSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  try {
    const category = await updateCategory(id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      order: parsed.data.order,
      active: parsed.data.active,
    });
    await logAudit({
      userId: user.id,
      action: 'category.update',
      entityType: 'Category',
      entityId: id,
      metadata: { name: category.name },
    });
    revalidateCatalogue();
    return { success: 'Catégorie enregistrée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteCategory(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  try {
    await deleteCategory(id);
    await logAudit({
      userId: user.id,
      action: 'category.delete',
      entityType: 'Category',
      entityId: id,
    });
    revalidateCatalogue();
    return { success: 'Catégorie supprimée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminSetCategoryActive(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  const active = String(formData.get('active')) === 'true';
  if (!id) return { error: 'Identifiant invalide.' };

  try {
    await setCategoryActive(id, active);
    await logAudit({
      userId: user.id,
      action: active ? 'category.publish' : 'category.unpublish',
      entityType: 'Category',
      entityId: id,
      metadata: { active },
    });
    revalidateCatalogue();
    return { success: active ? 'Catégorie activée.' : 'Catégorie désactivée.' };
  } catch (error) {
    return handleError(error);
  }
}

/** Monter / descendre : reçoit la liste COMPLÈTE des ids dans le nouvel ordre. */
export async function adminReorderCategories(orderedIds: string[]): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = parseForm(orderedIdsSchema, orderedIds);
  if ('error' in parsed) return { error: parsed.error };

  try {
    await reorderCategories(parsed.data);
    await logAudit({
      userId: user.id,
      action: 'category.reorder',
      entityType: 'Category',
      metadata: { count: parsed.data.length },
    });
    revalidateCatalogue();
    return { success: 'Ordre des catégories enregistré.' };
  } catch (error) {
    return handleError(error);
  }
}

/* ============================================================ */
/* Prestations (P4.3, P4.6)                                     */
/* ============================================================ */

export async function adminCreateService(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = parseForm(serviceInputSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  let created: { id: string; name: string; slug: string } | null = null;
  try {
    const price = priceFieldsFromInput(parsed.data);
    const service = await createService({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      categoryId: parsed.data.categoryId,
      priceFromCents: price.priceFromCents,
      priceToCents: price.priceToCents,
      priceOnRequest: price.priceOnRequest,
      durationMinutes: parsed.data.durationMinutes ?? null,
      status: parsed.data.status,
      order: parsed.data.order,
    });
    created = { id: service.id, name: service.name, slug: service.slug };
    await logAudit({
      userId: user.id,
      action: 'service.create',
      entityType: 'Service',
      entityId: service.id,
      metadata: { name: service.name, slug: service.slug },
    });
    revalidateCatalogue(service);
  } catch (error) {
    return handleError(error);
  }

  // redirect() lève une exception interne Next.js : il doit rester en dehors
  // du try/catch, sinon l'erreur est transformée en message d'échec.
  redirect(`/dashboard/catalogue/prestations/${created.id}`);
}

export async function adminUpdateService(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  const parsed = parseForm(serviceInputSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  try {
    const price = priceFieldsFromInput(parsed.data);
    const service = await updateService(id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      categoryId: parsed.data.categoryId,
      priceFromCents: price.priceFromCents,
      priceToCents: price.priceToCents,
      priceOnRequest: price.priceOnRequest,
      durationMinutes: parsed.data.durationMinutes ?? null,
      status: parsed.data.status,
      order: parsed.data.order,
    });
    await logAudit({
      userId: user.id,
      action: 'service.update',
      entityType: 'Service',
      entityId: id,
      metadata: { name: service.name },
    });
    revalidateCatalogue(service);
    return { success: 'Prestation enregistrée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminSetServiceStatus(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  const parsed = parseForm(serviceStatusSchema, { status: String(formData.get('status')) });
  if ('error' in parsed) return { error: parsed.error };

  try {
    const service = await setServiceStatus(id, parsed.data.status);
    await logAudit({
      userId: user.id,
      action:
        parsed.data.status === ServiceStatus.PUBLISHED
          ? 'service.publish'
          : parsed.data.status === ServiceStatus.ARCHIVED
            ? 'service.archive'
            : 'service.unpublish',
      entityType: 'Service',
      entityId: id,
      metadata: { status: service.status },
    });
    revalidateCatalogue(service);
    return { success: 'Statut de la prestation mis à jour.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminArchiveService(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  try {
    const service = await archiveService(id);
    await logAudit({
      userId: user.id,
      action: 'service.archive',
      entityType: 'Service',
      entityId: id,
      metadata: { name: service.name },
    });
    revalidateCatalogue(service);
    return { success: 'Prestation archivée. Son historique est conservé.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteService(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  try {
    // Récupérer les clés avant la suppression en cascade des lignes ServiceImage.
    const imageKeys = await getServiceImageKeys(id);
    const service = await deleteService(id);
    await Promise.all(imageKeys.map((key) => deleteImageObject(key).catch(() => undefined)));
    await logAudit({
      userId: user.id,
      action: 'service.delete',
      entityType: 'Service',
      entityId: id,
      metadata: { name: service.name },
    });
    revalidateCatalogue(service);
  } catch (error) {
    return handleError(error);
  }

  // La fiche n'existe plus : retour à la liste (redirect hors du try/catch).
  redirect('/dashboard/catalogue');
}

/* ============================================================ */
/* Options payantes (P4.3)                                      */
/* ============================================================ */

export async function adminCreateOption(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const serviceId = String(formData.get('serviceId') ?? '').trim();
  if (!serviceId) return { error: 'Prestation invalide.' };

  const parsed = parseForm(serviceOptionInputSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  try {
    const option = await createServiceOption(serviceId, {
      name: parsed.data.name,
      priceCents: eurosToCents(parsed.data.priceEuros),
      durationMinutes: parsed.data.durationMinutes,
      active: parsed.data.active,
    });
    await logAudit({
      userId: user.id,
      action: 'service.option.create',
      entityType: 'ServiceOption',
      entityId: option.id,
      metadata: { serviceId, name: option.name },
    });
    revalidateCatalogue({ id: serviceId });
    return { success: 'Option ajoutée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminUpdateOption(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  const parsed = parseForm(serviceOptionInputSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  try {
    await updateServiceOption(id, {
      name: parsed.data.name,
      priceCents: eurosToCents(parsed.data.priceEuros),
      durationMinutes: parsed.data.durationMinutes,
      active: parsed.data.active,
    });
    await logAudit({
      userId: user.id,
      action: 'service.option.update',
      entityType: 'ServiceOption',
      entityId: id,
      metadata: { name: parsed.data.name },
    });
    revalidateCatalogue();
    return { success: 'Option enregistrée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminToggleOption(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  const active = String(formData.get('active')) === 'true';
  if (!id) return { error: 'Identifiant invalide.' };

  try {
    await setServiceOptionActive(id, active);
    await logAudit({
      userId: user.id,
      action: active ? 'service.option.publish' : 'service.option.unpublish',
      entityType: 'ServiceOption',
      entityId: id,
      metadata: { active },
    });
    revalidateCatalogue();
    return { success: active ? 'Option activée.' : 'Option désactivée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteOption(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  try {
    await deleteServiceOption(id);
    await logAudit({
      userId: user.id,
      action: 'service.option.delete',
      entityType: 'ServiceOption',
      entityId: id,
    });
    revalidateCatalogue();
    return { success: 'Option supprimée.' };
  } catch (error) {
    return handleError(error);
  }
}

/* ============================================================ */
/* Photos (P4.4, P4.5)                                          */
/* ============================================================ */

export async function adminUploadServiceImage(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const serviceId = String(formData.get('serviceId') ?? '').trim();
  if (!serviceId) return { error: 'Prestation invalide.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choisissez une photo à envoyer.' };
  }

  const altParsed = parseForm(imageAltSchema, { alt: String(formData.get('alt') ?? '') });
  if ('error' in altParsed) return { error: altParsed.error };

  if (!isStorageConfigured()) {
    return { error: getStorageConfigurationHint() };
  }

  let key: string | null = null;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validated = validateImageFile({ size: file.size, type: file.type, bytes });
    key = buildServiceImageKey(serviceId, validated.extension);

    await uploadImageObject({ key, body: bytes, contentType: validated.mime });
    try {
      await addServiceImage(serviceId, key, altParsed.data.alt);
    } catch (databaseError) {
      // Ne pas laisser d'objet orphelin si l'enregistrement échoue.
      await deleteImageObject(key).catch(() => undefined);
      throw databaseError;
    }

    await logAudit({
      userId: user.id,
      action: 'service.image.upload',
      entityType: 'ServiceImage',
      metadata: { serviceId, key },
    });
    revalidateCatalogue({ id: serviceId });
    return { success: 'Photo ajoutée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminUpdateImageAlt(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  const parsed = parseForm(imageAltSchema, { alt: String(formData.get('alt') ?? '') });
  if ('error' in parsed) return { error: parsed.error };

  try {
    await updateServiceImageAlt(id, parsed.data.alt);
    await logAudit({
      userId: user.id,
      action: 'service.image.alt',
      entityType: 'ServiceImage',
      entityId: id,
    });
    revalidateCatalogue();
    return { success: 'Texte alternatif enregistré.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminSetPrimaryImage(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const serviceId = String(formData.get('serviceId') ?? '').trim();
  const id = idFrom(formData);
  if (!serviceId || !id) return { error: 'Identifiant invalide.' };

  try {
    await setPrimaryServiceImage(serviceId, id);
    await logAudit({
      userId: user.id,
      action: 'service.image.primary',
      entityType: 'ServiceImage',
      entityId: id,
      metadata: { serviceId },
    });
    revalidateCatalogue({ id: serviceId });
    return { success: 'Photo principale mise à jour.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteImage(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  try {
    const image = await getServiceImage(id);
    if (!image) return { error: 'Photo introuvable.' };
    await deleteServiceImage(id);
    await deleteImageObject(image.key).catch(() => undefined);
    await logAudit({
      userId: user.id,
      action: 'service.image.delete',
      entityType: 'ServiceImage',
      entityId: id,
      metadata: { serviceId: image.serviceId },
    });
    revalidateCatalogue({ id: image.serviceId });
    return { success: 'Photo supprimée.' };
  } catch (error) {
    return handleError(error);
  }
}

/** Monter / descendre une photo : liste COMPLÈTE des ids ; la première devient la principale. */
export async function adminReorderImages(
  serviceId: string,
  orderedIds: string[],
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  if (typeof serviceId !== 'string' || !serviceId.trim()) return { error: 'Prestation invalide.' };

  const parsed = parseForm(orderedIdsSchema, orderedIds);
  if ('error' in parsed) return { error: parsed.error };

  try {
    await reorderServiceImages(serviceId, parsed.data);
    await logAudit({
      userId: user.id,
      action: 'service.image.reorder',
      entityType: 'ServiceImage',
      metadata: { serviceId, count: parsed.data.length },
    });
    revalidateCatalogue({ id: serviceId });
    return { success: 'Ordre des photos enregistré.' };
  } catch (error) {
    return handleError(error);
  }
}

/* ============================================================ */
/* Règles de compatibilité (P4.7)                               */
/* ============================================================ */

export async function adminSaveCompatibility(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const serviceId = String(formData.get('serviceId') ?? '').trim();
  if (!serviceId) return { error: 'Prestation invalide.' };

  const raw: Record<string, unknown> = Object.fromEntries(formData);
  raw.acceptedLengths = formData.getAll('acceptedLengths');
  raw.acceptedHairTypes = formData.getAll('acceptedHairTypes');

  const parsed = parseForm(compatibilityRuleInputSchema, raw);
  if ('error' in parsed) return { error: parsed.error };

  try {
    await upsertCompatibilityRule(serviceId, {
      acceptedLengths: parsed.data.acceptedLengths,
      acceptedHairTypes: parsed.data.acceptedHairTypes,
      requiresLocs: parsed.data.requiresLocs,
      incompatibleLocs: parsed.data.incompatibleLocs,
      photoPolicy: parsed.data.photoPolicy,
      autoApprove: parsed.data.autoApprove,
      conditionsNote: parsed.data.conditionsNote,
      incompatibleMessage: parsed.data.incompatibleMessage,
      uncertainMessage: parsed.data.uncertainMessage,
    });
    await logAudit({
      userId: user.id,
      action: 'service.compatibility.update',
      entityType: 'CompatibilityRule',
      entityId: serviceId,
      metadata: {
        acceptedLengths: parsed.data.acceptedLengths.join(','),
        acceptedHairTypes: parsed.data.acceptedHairTypes.join(','),
        photoPolicy: parsed.data.photoPolicy,
      },
    });
    revalidateCatalogue({ id: serviceId });
    return { success: 'Règles de compatibilité enregistrées.' };
  } catch (error) {
    return handleError(error);
  }
}

/* ============================================================ */
/* Questions capillaires (P4.8)                                 */
/* ============================================================ */

function questionCondition(parsed: {
  conditionDependsOn: string;
  conditionEquals: string;
}): Prisma.InputJsonValue | null {
  if (!parsed.conditionDependsOn) return null;
  return { dependsOn: parsed.conditionDependsOn, equals: parsed.conditionEquals };
}

export async function adminCreateQuestion(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const serviceId = String(formData.get('serviceId') ?? '').trim();
  if (!serviceId) return { error: 'Prestation invalide.' };

  const parsed = parseForm(questionInputSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  try {
    const question = await createServiceQuestion(serviceId, {
      key: parsed.data.key,
      label: parsed.data.label,
      type: parsed.data.type,
      options: parsed.data.options,
      required: parsed.data.required,
      active: parsed.data.active,
      order: parsed.data.order,
      condition: questionCondition(parsed.data),
    });
    await logAudit({
      userId: user.id,
      action: 'service.question.create',
      entityType: 'QuestionDefinition',
      entityId: question.id,
      metadata: { serviceId, key: question.key },
    });
    revalidateCatalogue({ id: serviceId });
    return { success: 'Question ajoutée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminUpdateQuestion(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  const parsed = parseForm(questionInputSchema, Object.fromEntries(formData));
  if ('error' in parsed) return { error: parsed.error };

  try {
    await updateServiceQuestion(id, {
      key: parsed.data.key,
      label: parsed.data.label,
      type: parsed.data.type,
      options: parsed.data.options,
      required: parsed.data.required,
      active: parsed.data.active,
      order: parsed.data.order,
      condition: questionCondition(parsed.data),
    });
    await logAudit({
      userId: user.id,
      action: 'service.question.update',
      entityType: 'QuestionDefinition',
      entityId: id,
      metadata: { key: parsed.data.key },
    });
    revalidateCatalogue();
    return { success: 'Question enregistrée.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteQuestion(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const id = idFrom(formData);
  if (!id) return { error: 'Identifiant invalide.' };

  try {
    await deleteServiceQuestion(id);
    await logAudit({
      userId: user.id,
      action: 'service.question.delete',
      entityType: 'QuestionDefinition',
      entityId: id,
    });
    revalidateCatalogue();
    return { success: 'Question supprimée.' };
  } catch (error) {
    return handleError(error);
  }
}

/** Monter / descendre une question : liste COMPLÈTE des ids dans le nouvel ordre. */
export async function adminReorderQuestions(
  serviceId: string,
  orderedIds: string[],
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  if (typeof serviceId !== 'string' || !serviceId.trim()) return { error: 'Prestation invalide.' };

  const parsed = parseForm(orderedIdsSchema, orderedIds);
  if ('error' in parsed) return { error: parsed.error };

  try {
    await reorderServiceQuestions(serviceId, parsed.data);
    await logAudit({
      userId: user.id,
      action: 'service.question.reorder',
      entityType: 'QuestionDefinition',
      metadata: { serviceId, count: parsed.data.length },
    });
    revalidateCatalogue({ id: serviceId });
    return { success: 'Ordre des questions enregistré.' };
  } catch (error) {
    return handleError(error);
  }
}

/** Monter / descendre une option : liste COMPLÈTE des ids dans le nouvel ordre. */
export async function adminReorderOptions(
  serviceId: string,
  orderedIds: string[],
): Promise<CatalogueActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };
  if (typeof serviceId !== 'string' || !serviceId.trim()) return { error: 'Prestation invalide.' };

  const parsed = parseForm(orderedIdsSchema, orderedIds);
  if ('error' in parsed) return { error: parsed.error };

  try {
    await reorderServiceOptions(serviceId, parsed.data);
    await logAudit({
      userId: user.id,
      action: 'service.option.reorder',
      entityType: 'ServiceOption',
      metadata: { serviceId, count: parsed.data.length },
    });
    revalidateCatalogue({ id: serviceId });
    return { success: 'Ordre des options enregistré.' };
  } catch (error) {
    return handleError(error);
  }
}

/* ============================================================ */
/* Lectures admin (filtres validés côté serveur)                */
/* ============================================================ */

export async function adminParseFilters(raw: Record<string, string | string[] | undefined>) {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' as const };
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = adminServiceFiltersSchema.safeParse(normalized);
  return { data: parsed.success ? parsed.data : {} };
}
