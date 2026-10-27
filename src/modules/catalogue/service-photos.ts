import { AppError } from '@/lib/errors';

/* ============================================================
 * Photos d'une prestation saisies dans le formulaire du catalogue.
 * Module pur (sans accès base ni stockage), utilisable côté client ET serveur :
 * le client l'utilise pour bloquer tôt, le serveur reste l'autorité (re-validation).
 *
 * Contrat du formulaire :
 * - `photos`      : fichiers nouvellement choisis, dans l'ordre d'ajout ;
 * - `photoLayout` : JSON, ordre final. Chaque entrée vaut `e:<id>` (photo déjà enregistrée,
 *                   conservée) ou `n:<i>` (i-ème fichier de `photos`). La première = principale.
 *                   Une photo existante absente de la liste est supprimée.
 * ============================================================ */

export const MAX_SERVICE_PHOTOS = 3;
export const SERVICE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const SERVICE_PHOTO_ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type PhotoLayoutEntry =
  { kind: 'existing'; id: string } | { kind: 'new'; fileIndex: number };

function invalid(message: string): never {
  throw new AppError('INVALID_IMAGE', message, 400);
}

/** Valide l'ordre final des photos. Lève une AppError (message affichable) si incohérent. */
export function parsePhotoLayout(
  raw: unknown,
  context: { fileCount: number; existingIds: readonly string[] },
): PhotoLayoutEntry[] {
  if (typeof raw !== 'string') invalid('Liste de photos invalide.');
  let tokens: unknown;
  try {
    tokens = JSON.parse(raw);
  } catch {
    return invalid('Liste de photos invalide.');
  }
  if (!Array.isArray(tokens) || tokens.some((token) => typeof token !== 'string')) {
    invalid('Liste de photos invalide.');
  }
  const list = tokens as string[];
  if (list.length > MAX_SERVICE_PHOTOS) {
    invalid(`${MAX_SERVICE_PHOTOS} photos maximum par prestation.`);
  }

  const existing = new Set(context.existingIds);
  const usedExisting = new Set<string>();
  const usedFiles = new Set<number>();
  const entries: PhotoLayoutEntry[] = list.map((token) => {
    if (token.startsWith('e:')) {
      const id = token.slice(2);
      if (!existing.has(id) || usedExisting.has(id)) invalid('Photo introuvable.');
      usedExisting.add(id);
      return { kind: 'existing', id };
    }
    if (token.startsWith('n:')) {
      const fileIndex = Number(token.slice(2));
      if (
        !Number.isInteger(fileIndex) ||
        fileIndex < 0 ||
        fileIndex >= context.fileCount ||
        usedFiles.has(fileIndex)
      ) {
        invalid('Liste de photos invalide.');
      }
      usedFiles.add(fileIndex);
      return { kind: 'new', fileIndex };
    }
    return invalid('Liste de photos invalide.');
  });

  // Tout fichier envoyé doit être placé : sinon la liste et les fichiers divergent.
  if (usedFiles.size !== context.fileCount) invalid('Liste de photos invalide.');
  return entries;
}
