import { z } from 'zod';

export const submitReviewSchema = z.object({
  token: z.string().trim().min(1).max(128),
  rating: z
    .string()
    .trim()
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value >= 1 && value <= 5, {
      message: 'Note invalide (1 à 5).',
    }),
  comment: z.string().trim().max(1500).optional().default(''),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export const reviewModerationSchema = z.object({
  id: z.string().trim().min(1).max(64),
  decision: z.enum(['APPROVED', 'REJECTED']),
});

export const reviewIdSchema = z.object({ id: z.string().trim().min(1).max(64) });
