import { z } from 'zod';

export const galleryPhotoAltSchema = z.object({
  alt: z.string().trim().max(200).optional().default(''),
});

export const galleryPhotoIdSchema = z.object({ id: z.string().trim().min(1).max(64) });

export const galleryPhotoMetaSchema = z.object({
  id: z.string().trim().min(1).max(64),
  serviceId: z.string().trim().max(64).optional().default(''),
  alt: z.string().trim().max(200).optional().default(''),
  published: z.preprocess(
    (value) => value === 'on' || value === 'true' || value === true,
    z.boolean(),
  ),
});

export const galleryPhotoMoveSchema = z.object({
  id: z.string().trim().min(1).max(64),
  direction: z.enum(['up', 'down']),
});
