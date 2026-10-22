'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/modules/auth/guards';
import { AppError } from '@/lib/errors';
import { logAudit } from '@/modules/stats/audit';
import { deleteReview, moderateReview, submitReview } from './service';
import { reviewIdSchema, reviewModerationSchema, submitReviewSchema } from './schemas';

export type ReviewActionState = { error?: string; success?: string };

function handleError(error: unknown): ReviewActionState {
  if (error instanceof AppError) return { error: error.message };
  console.error(error);
  return { error: 'Une erreur est survenue. Réessayez plus tard.' };
}

export async function adminModerateReview(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = reviewModerationSchema.safeParse({
    id: formData.get('id'),
    decision: formData.get('decision'),
  });
  if (!parsed.success) return { error: 'Données invalides.' };

  try {
    await moderateReview({
      id: parsed.data.id,
      decision: parsed.data.decision,
      moderatorId: user.id,
    });
    await logAudit({
      userId: user.id,
      action: `review.${parsed.data.decision.toLowerCase()}`,
      entityType: 'Review',
      entityId: parsed.data.id,
    }).catch(() => undefined);
    revalidatePath('/dashboard/avis');
    revalidatePath('/');
    return {
      success: parsed.data.decision === 'APPROVED' ? 'Avis approuvé et publié.' : 'Avis rejeté.',
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function adminDeleteReview(id: string): Promise<ReviewActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'Accès interdit.' };

  const parsed = reviewIdSchema.safeParse({ id });
  if (!parsed.success) return { error: 'Données invalides.' };

  try {
    await deleteReview(parsed.data.id);
    await logAudit({
      userId: user.id,
      action: 'review.delete',
      entityType: 'Review',
      entityId: parsed.data.id,
    }).catch(() => undefined);
    revalidatePath('/dashboard/avis');
    revalidatePath('/');
    return { success: 'Avis supprimé.' };
  } catch (error) {
    return handleError(error);
  }
}

export async function submitReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = submitReviewSchema.safeParse({
    token: formData.get('token'),
    rating: formData.get('rating'),
    comment: formData.get('comment'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  try {
    await submitReview(parsed.data);
    return { success: 'Merci pour votre avis ! Il sera publié après relecture par Patricia.' };
  } catch (error) {
    return handleError(error);
  }
}
