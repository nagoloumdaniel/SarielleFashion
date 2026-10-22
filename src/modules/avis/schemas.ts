import { z } from 'zod';
import { cleanReviewText, MAX_REVIEW_COMMENT_LENGTH } from './engine';

const ratingField = z
  .string()
  .trim()
  .transform((value) => Number(value))
  .refine((value) => Number.isInteger(value) && value >= 1 && value <= 5, {
    message: 'Choisis une note de 1 à 5 étoiles.',
  });

const commentField = z
  .string()
  .max(MAX_REVIEW_COMMENT_LENGTH * 2)
  .transform(cleanReviewText)
  .pipe(
    z.string().max(MAX_REVIEW_COMMENT_LENGTH, {
      message: `Ton commentaire est limité à ${MAX_REVIEW_COMMENT_LENGTH} caractères.`,
    }),
  )
  .optional()
  .default('');

/** Avis laissé depuis la fiche d'une prestation (sans lien e-mail). */
export const publicReviewSchema = z.object({
  serviceId: z.string().trim().min(1).max(64),
  authorName: z
    .string()
    .transform(cleanReviewText)
    .pipe(
      z
        .string()
        .min(2, { message: 'Indique ton prénom (2 caractères minimum).' })
        .max(60, { message: 'Ton nom est trop long (60 caractères maximum).' }),
    ),
  rating: ratingField,
  comment: commentField,
  /** Piège à robots : champ masqué qui doit rester vide. */
  website: z.string().optional().default(''),
});

export type PublicReviewInput = z.infer<typeof publicReviewSchema>;

/** Avis laissé via le lien reçu par e-mail (client vérifié). */
export const tokenReviewSchema = z.object({
  token: z.string().trim().min(1).max(128),
  rating: ratingField,
  comment: commentField,
  website: z.string().optional().default(''),
});

export type TokenReviewInput = z.infer<typeof tokenReviewSchema>;

export const reviewIdSchema = z.object({ id: z.string().trim().min(1).max(64) });

export const loadMoreReviewsSchema = z.object({
  serviceId: z.string().trim().min(1).max(64),
  offset: z.number().int().min(0).max(5000),
});
