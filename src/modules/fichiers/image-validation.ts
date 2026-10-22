import { randomUUID } from 'node:crypto';
import { AppError } from '@/lib/errors';

/* ============================================================
 * Validation des photos de prestation (P4.4)
 * - taille limitée ;
 * - type MIME déclaré ET contenu réel vérifiés (signature binaire) ;
 * - nom de fichier non prévisible.
 * Aucune confiance dans le nom ou le Content-Type fournis par le client.
 * ============================================================ */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export interface ValidatedImage {
  mime: AllowedImageMime;
  extension: 'jpg' | 'png' | 'webp';
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

/** Détecte le vrai format à partir des octets, jamais du nom de fichier. */
export function detectImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // RIFF....WEBP
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

const MIME_EXTENSIONS: Record<AllowedImageMime, ValidatedImage['extension']> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Valide un fichier reçu puis renvoie le type réel et l'extension sûre.
 * Le type déclaré n'est qu'un indice : le contenu réel fait foi.
 */
export function validateImageFile(file: {
  size: number;
  type: string;
  bytes: Uint8Array;
}): ValidatedImage {
  if (file.size <= 0) {
    throw new AppError('INVALID_IMAGE', 'Le fichier photo est vide.', 400);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new AppError(
      'INVALID_IMAGE',
      'La photo dépasse 5 Mo. Choisissez une image plus légère.',
      413,
    );
  }
  if (!ALLOWED_IMAGE_MIME.includes(file.type as AllowedImageMime)) {
    throw new AppError(
      'INVALID_IMAGE',
      'Format non accepté : utilisez une photo JPEG, PNG ou WebP.',
      415,
    );
  }
  const detected = detectImageMime(file.bytes);
  if (detected === null) {
    throw new AppError('INVALID_IMAGE', "Le contenu du fichier n'est pas une image reconnue.", 415);
  }
  if (detected !== file.type) {
    throw new AppError(
      'INVALID_IMAGE',
      "Le contenu de l'image ne correspond pas à son format annoncé.",
      415,
    );
  }
  return { mime: detected, extension: MIME_EXTENSIONS[detected] };
}

/** Clé objet imprévisible : identifiant aléatoire, jamais le nom d'origine. */
export function buildServiceImageKey(serviceId: string, extension: ValidatedImage['extension']) {
  if (!/^[a-z0-9]+$/i.test(serviceId)) {
    throw new AppError('INVALID_IMAGE', 'Référence de prestation invalide.', 400);
  }
  return `services/${serviceId}/${randomUUID()}.${extension}`;
}

/** Clé objet pour la galerie de réalisations (P8.11), même règle d'imprévisibilité. */
export function buildGalleryImageKey(extension: ValidatedImage['extension']) {
  return `gallery/${randomUUID()}.${extension}`;
}
