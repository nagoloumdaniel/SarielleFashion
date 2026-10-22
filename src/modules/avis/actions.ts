'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getClientIp } from '@/lib/client-ip';
import { AppError } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/modules/auth/guards';
import { deletePrivateImages, storePrivateImages } from '@/modules/fichiers/private-images';
import { isStorageConfigured } from '@/modules/fichiers/storage';
import { logAudit } from '@/modules/stats/audit';
import { MAX_REVIEW_PHOTOS } from './engine';
import { listServiceReviews, REVIEWS_TAG, type PublicReview } from './queries';
import {
  loadMoreReviewsSchema,
  publicReviewSchema,
  reviewIdSchema,
  tokenReviewSchema,
} from './schemas';
import { createPublicReview, deleteReview, submitTokenReview } from './service';

export type ReviewActionState = { error?: string; success?: string };

const SUCCESS_MESSAGE = 'Merci pour ton avis ! Il est déjà visible sur le site.';

function handleError(error: unknown): ReviewActionState {
  if (error instanceof AppError) return { error: error.message };
  console.error(error);
  return { error: 'Une erreur est survenue. Réessaie dans un instant.' };
}

function refresh(slug?: string) {
  revalidateTag(REVIEWS_TAG);
  revalidatePath('/');
  revalidatePath('/dashboard/avis');
  if (slug) revalidatePath(`/coiffures/${slug}`);
}

/** Photos jointes : jusqu'à 3, validées (type réel, taille) puis stockées en privé. */
async function storeReviewPhotos(formData: FormData): Promise<string[]> {
  const files = formData
    .getAll('photos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) return [];
  if (files.length > MAX_REVIEW_PHOTOS) {
    throw new AppError('INVALID_IMAGE', `${MAX_REVIEW_PHOTOS} photos maximum par avis.`, 400);
  }
  if (!isStorageConfigured()) {
    throw new AppError(
      'STORAGE',
      'L’ajout de photos est momentanément indisponible. Envoie ton avis sans photo.',
      503,
    );
  }
  return storePrivateImages(files, 'avis');
}

/** Avis laissé depuis la fiche d'une prestation. */
export async function submitPublicReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const ip = await getClientIp();
  const hourly = await rateLimit(`avis:public:${ip}`, { max: 5, windowMs: 60 * 60_000 });
  if (!hourly.allowed) {
    return { error: 'Tu as envoyé beaucoup d’avis. Réessaie un peu plus tard.' };
  }

  const parsed = publicReviewSchema.safeParse({
    serviceId: formData.get('serviceId'),
    authorName: formData.get('authorName') ?? '',
    rating: formData.get('rating') ?? '',
    comment: formData.get('comment') ?? '',
    website: formData.get('website') ?? '',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Vérifie les champs du formulaire.' };
  }
  // Piège à robots : on répond comme si tout allait bien, sans rien enregistrer.
  if (parsed.data.website.trim()) return { success: SUCCESS_MESSAGE };

  const perService = await rateLimit(`avis:public:${ip}:${parsed.data.serviceId}`, {
    max: 2,
    windowMs: 24 * 60 * 60_000,
  });
  if (!perService.allowed) {
    return { error: 'Tu as déjà donné ton avis sur cette prestation. Merci !' };
  }

  let photoKeys: string[] = [];
  try {
    photoKeys = await storeReviewPhotos(formData);
    const { slug } = await createPublicReview({
      serviceId: parsed.data.serviceId,
      authorName: parsed.data.authorName,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      photoKeys,
    });
    refresh(slug);
    return { success: SUCCESS_MESSAGE };
  } catch (error) {
    // Pas d'objet orphelin si l'écriture en base échoue.
    if (photoKeys.length > 0) await deletePrivateImages(photoKeys).catch(() => undefined);
    return handleError(error);
  }
}

/** Avis laissé via le lien reçu par e-mail (client vérifié). */
export async function submitReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const ip = await getClientIp();
  const limit = await rateLimit(`avis:token:${ip}`, { max: 10, windowMs: 60 * 60_000 });
  if (!limit.allowed) return { error: 'Trop de tentatives. Réessaie un peu plus tard.' };

  const parsed = tokenReviewSchema.safeParse({
    token: formData.get('token'),
    rating: formData.get('rating') ?? '',
    comment: formData.get('comment') ?? '',
    website: formData.get('website') ?? '',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Vérifie les champs du formulaire.' };
  }
  if (parsed.data.website.trim()) return { success: SUCCESS_MESSAGE };

  let photoKeys: string[] = [];
  try {
    photoKeys = await storeReviewPhotos(formData);
    const { slug } = await submitTokenReview({
      token: parsed.data.token,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      photoKeys,
    });
    refresh(slug);
    return { success: SUCCESS_MESSAGE };
  } catch (error) {
    if (photoKeys.length > 0) await deletePrivateImages(photoKeys).catch(() => undefined);
    return handleError(error);
  }
}

/** Page suivante des avis d'une prestation (bouton « Afficher plus » de la fiche). */
export async function loadMoreReviewsAction(
  serviceId: string,
  offset: number,
): Promise<{ items: PublicReview[]; hasMore: boolean }> {
  const parsed = loadMoreReviewsSchema.safeParse({ serviceId, offset });
  if (!parsed.success) return { items: [], hasMore: false };
  return listServiceReviews(parsed.data.serviceId, { offset: parsed.data.offset, limit: 6 });
}

/** Suppression par l'admin (seule action de modération : plus d'approbation préalable). */
export async function adminDeleteReview(id: string): Promise<ReviewActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = reviewIdSchema.safeParse({ id });
  if (!parsed.success) return { error: 'Données invalides.' };

  try {
    const { slug } = await deleteReview(parsed.data.id);
    await logAudit({
      userId: user.id,
      action: 'review.delete',
      entityType: 'Review',
      entityId: parsed.data.id,
    }).catch(() => undefined);
    refresh(slug);
    return { success: 'Avis supprimé.' };
  } catch (error) {
    return handleError(error);
  }
}
