'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/modules/auth/guards';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logAudit } from '@/modules/stats/audit';
import { buildGalleryImageKey, validateImageFile } from '@/modules/fichiers/image-validation';
import {
  deleteImageObject,
  isStorageConfigured,
  uploadImageObject,
  getStorageConfigurationHint,
} from '@/modules/fichiers/storage';
import { galleryPhotoIdSchema, galleryPhotoMetaSchema, galleryPhotoMoveSchema } from './schemas';

export type GalleryActionState = { error?: string; success?: string };

function handleError(error: unknown): GalleryActionState {
  if (error instanceof AppError) return { error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return { error: 'Photo introuvable.' };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    return { error: 'Prestation introuvable.' };
  }
  console.error(error);
  return { error: 'Une erreur est survenue. Réessayez plus tard.' };
}

function revalidate() {
  revalidatePath('/dashboard/galerie');
  revalidatePath('/galerie');
  revalidatePath('/');
}

/** Nombre maximal de photos par envoi (la limite d'une requête serveur est de 20 Mo, 5 Mo par photo). */
const MAX_FILES_PER_UPLOAD = 4;

export async function adminUploadGalleryPhoto(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const files = formData
    .getAll('file')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) return { error: 'Choisissez une photo à envoyer.' };
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return { error: `Envoyez ${MAX_FILES_PER_UPLOAD} photos au maximum à la fois.` };
  }
  if (!isStorageConfigured()) return { error: getStorageConfigurationHint() };

  const serviceId = String(formData.get('serviceId') ?? '').trim() || null;
  const alt = String(formData.get('alt') ?? '')
    .trim()
    .slice(0, 200);
  if (
    serviceId &&
    !(await db.service.findUnique({ where: { id: serviceId }, select: { id: true } }))
  ) {
    return { error: 'Prestation introuvable.' };
  }

  let added = 0;
  let lastError: string | null = null;
  for (const file of files) {
    let key: string | null = null;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const validated = validateImageFile({ size: file.size, type: file.type, bytes });
      key = buildGalleryImageKey(validated.extension);
      await uploadImageObject({ key, body: bytes, contentType: validated.mime });
      try {
        await db.galleryPhoto.create({
          data: { key, alt, serviceId, published: true },
        });
      } catch (databaseError) {
        // Pas d'objet orphelin si l'écriture en base échoue.
        await deleteImageObject(key).catch(() => undefined);
        throw databaseError;
      }
      added += 1;
    } catch (error) {
      lastError = handleError(error).error ?? null;
    }
  }

  if (added > 0) {
    await logAudit({
      userId: user.id,
      action: 'gallery.upload',
      entityType: 'GalleryPhoto',
      metadata: { count: added },
    });
    revalidate();
  }
  if (added === 0) return { error: lastError ?? 'Envoi impossible.' };
  const base =
    added === 1 ? 'Photo ajoutée à la galerie.' : `${added} photos ajoutées à la galerie.`;
  return lastError
    ? { success: `${base} ${files.length - added} photo(s) refusée(s) : ${lastError}` }
    : { success: base };
}

export async function adminUpdateGalleryPhoto(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = galleryPhotoMetaSchema.safeParse({
    id: formData.get('id'),
    serviceId: formData.get('serviceId'),
    alt: formData.get('alt'),
    published: formData.get('published'),
  });
  if (!parsed.success) return { error: 'Données invalides.' };
  const input = parsed.data;

  try {
    await db.galleryPhoto.update({
      where: { id: input.id },
      data: {
        serviceId: input.serviceId || null,
        alt: input.alt,
        published: input.published,
      },
    });
    await logAudit({
      userId: user.id,
      action: 'gallery.update',
      entityType: 'GalleryPhoto',
      entityId: input.id,
    });
    revalidate();
    return { success: 'Photo mise à jour.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteGalleryPhoto(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = galleryPhotoIdSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: 'Identifiant invalide.' };

  try {
    const photo = await db.galleryPhoto.delete({ where: { id: parsed.data.id } });
    await deleteImageObject(photo.key).catch(() => undefined);
    await logAudit({
      userId: user.id,
      action: 'gallery.delete',
      entityType: 'GalleryPhoto',
      entityId: photo.id,
    });
    revalidate();
    return { success: 'Photo supprimée.' };
  } catch (error) {
    return handleError(error);
  }
}

/* Déplace une photo d'un cran dans l'ordre d'affichage (galerie publique incluse). */
export async function adminMoveGalleryPhoto(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = galleryPhotoMoveSchema.safeParse({
    id: formData.get('id'),
    direction: formData.get('direction'),
  });
  if (!parsed.success) return { error: 'Données invalides.' };
  const { id, direction } = parsed.data;

  try {
    // Même tri que l'affichage ; on réécrit des positions 0..n-1 pour lever les égalités.
    const rows = await db.galleryPhoto.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    const from = rows.findIndex((row) => row.id === id);
    if (from === -1) return { error: 'Photo introuvable.' };
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= rows.length) return {};
    const ids = rows.map((row) => row.id);
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    await db.$transaction(
      ids.map((photoId, position) =>
        db.galleryPhoto.update({ where: { id: photoId }, data: { order: position } }),
      ),
    );
    revalidate();
    return {};
  } catch (error) {
    return handleError(error);
  }
}
