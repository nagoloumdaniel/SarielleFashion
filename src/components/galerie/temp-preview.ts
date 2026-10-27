// TEMP-PREVIEW: à supprimer après vérification
// Fichier provisoire : injecte UNE entrée fictive en tête de la galerie publique (/galerie) pour
// vérifier le design à la main. Aucune donnée en base. Pour retirer : supprimer ce fichier, puis
// dans src/app/galerie/page.tsx supprimer l'import `withTempPreview` et le wrapper
// `withTempPreview(...)` (marqués TEMP-PREVIEW).
import type { PublicGalleryPhoto } from '@/modules/galerie/queries';

const TEMP_PREVIEW_PHOTO: PublicGalleryPhoto = {
  id: 'temp-preview',
  src: '/brand/logo-source.png',
  alt: 'Aperçu provisoire',
  serviceName: 'Aperçu provisoire',
  caption: 'Aperçu provisoire',
};

export function withTempPreview(photos: PublicGalleryPhoto[]): PublicGalleryPhoto[] {
  return [TEMP_PREVIEW_PHOTO, ...photos];
}
