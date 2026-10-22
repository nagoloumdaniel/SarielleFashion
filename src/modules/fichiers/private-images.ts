import { randomUUID } from 'node:crypto';
import { AppError } from '@/lib/errors';
import { validateImageFile } from './image-validation';
import {
  deleteImageObject,
  getImageSignedUrl,
  isStorageConfigured,
  uploadImageObject,
} from './storage';

/* ============================================================
 * Photos privées (P5.5, §15.2)
 * Les photos d'évaluation ne sont JAMAIS publiques : clé aléatoire,
 * bucket privé, URL signée à durée limitée pour le dashboard seulement.
 * ============================================================ */

export const MAX_PRIVATE_PHOTOS = 3;

export type PrivatePhotoFolder = 'assessments' | 'demandes' | 'avis';

function buildPrivateKey(folder: PrivatePhotoFolder, extension: string): string {
  return `${folder}/${randomUUID()}.${extension}`;
}

/**
 * Valide puis stocke jusqu'à 3 photos privées.
 * En cas d'échec au milieu du lot, les objets déjà envoyés sont supprimés.
 */
export async function storePrivateImages(
  files: File[],
  folder: PrivatePhotoFolder,
): Promise<string[]> {
  const realFiles = files.filter((file) => file instanceof File && file.size > 0);
  if (realFiles.length === 0) return [];
  if (realFiles.length > MAX_PRIVATE_PHOTOS) {
    throw new AppError('INVALID_IMAGE', `${MAX_PRIVATE_PHOTOS} photos maximum par demande.`, 400);
  }

  const uploaded: string[] = [];
  try {
    for (const file of realFiles) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const validated = validateImageFile({ size: file.size, type: file.type, bytes });
      const key = buildPrivateKey(folder, validated.extension);
      await uploadImageObject({ key, body: bytes, contentType: validated.mime });
      uploaded.push(key);
    }
    return uploaded;
  } catch (error) {
    await deletePrivateImages(uploaded);
    throw error;
  }
}

export interface SignedPhoto {
  key: string;
  url: string | null;
}

export async function signedPrivatePhotos(keys: string[]): Promise<SignedPhoto[]> {
  return Promise.all(keys.map(async (key) => ({ key, url: await getImageSignedUrl(key, 900) })));
}

export interface DeletePrivateImagesResult {
  /** Objets réellement supprimés. */
  deleted: number;
  /** Clés dont la suppression a échoué (identifiants aléatoires, sans donnée personnelle). */
  failed: string[];
}

/**
 * Supprime des photos privées sans avaler les erreurs : renvoie le décompte réel
 * et les clés en échec. Stockage non configuré => toutes les clés sont en échec.
 */
export async function deletePrivateImages(keys: string[]): Promise<DeletePrivateImagesResult> {
  // Les URLs de démonstration (http(s):, //, /) ne sont pas des objets du bucket.
  const objectKeys = keys.filter((key) => key && !/^https?:/.test(key) && !key.startsWith('/'));
  if (objectKeys.length === 0) return { deleted: 0, failed: [] };
  if (!isStorageConfigured()) return { deleted: 0, failed: objectKeys };
  const outcomes = await Promise.all(
    objectKeys.map(async (key) => {
      try {
        await deleteImageObject(key);
        return null;
      } catch {
        return key;
      }
    }),
  );
  const failed = outcomes.filter((key): key is string => key !== null);
  return { deleted: objectKeys.length - failed.length, failed };
}
