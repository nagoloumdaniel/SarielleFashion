import sharp from 'sharp';
import { AppError } from '@/lib/errors';
import { detectImageMime, type AllowedImageMime } from './image-validation';

/* ============================================================
 * Ré-encodage de toutes les images avant stockage :
 * - orientation EXIF appliquée aux pixels (rotate()) ;
 * - sortie SANS métadonnées (EXIF/GPS, XMP, IPTC, vignette) ;
 * - côté long limité à 2400 px, qualité 85, format conservé.
 * ============================================================ */

export const MAX_IMAGE_DIMENSION = 2400;
export const IMAGE_QUALITY = 85;

export interface SanitizedImage {
  body: Uint8Array;
  mime: AllowedImageMime;
}

export async function sanitizeImage(bytes: Uint8Array): Promise<SanitizedImage> {
  const mime = detectImageMime(bytes);
  if (!mime) {
    throw new AppError('INVALID_IMAGE', "Le contenu du fichier n'est pas une image reconnue.", 415);
  }
  try {
    // Pas de withMetadata()/keepExif() : sharp supprime tous les métadonnées en sortie.
    let pipeline = sharp(bytes, { failOn: 'error' }).rotate().resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (mime === 'image/jpeg') pipeline = pipeline.jpeg({ quality: IMAGE_QUALITY });
    else if (mime === 'image/webp') pipeline = pipeline.webp({ quality: IMAGE_QUALITY });
    else pipeline = pipeline.png({ compressionLevel: 9 });
    const buffer = await pipeline.toBuffer();
    return { body: new Uint8Array(buffer), mime };
  } catch {
    throw new AppError('INVALID_IMAGE', "L'image est illisible ou corrompue.", 415);
  }
}
