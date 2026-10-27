import { getImageSignedUrl } from '@/modules/fichiers/storage';

/* Le bucket est privé : les clés S3 des photos de prestation doivent être remplacées par des
   URL signées avant d'atteindre les composants publics (qui n'affichent que des URL).
   Les clés déjà publiques (photos de démonstration) passent telles quelles ; une photo dont
   l'URL ne peut pas être signée est écartée (le repli de démonstration prend le relais). */
export async function withSignedImages<T extends { images: { key: string }[] }>(
  service: T,
): Promise<T> {
  const images = (
    await Promise.all(
      service.images.map(async (image) => {
        const url = await getImageSignedUrl(image.key, 3600).catch(() => null);
        return url ? { ...image, key: url } : null;
      }),
    )
  ).filter((image): image is T['images'][number] => image !== null);
  return { ...service, images };
}
