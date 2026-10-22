import { z } from 'zod';

export const conversationIdSchema = z.object({
  conversationId: z.string().trim().min(1).max(64),
});

export const replySchema = conversationIdSchema.extend({
  content: z
    .string()
    .trim()
    .min(2, 'Réponse trop courte (2 caractères minimum).')
    .max(5000, 'Réponse trop longue (5000 caractères maximum).'),
});

export const internalNoteSchema = conversationIdSchema.extend({
  content: z
    .string()
    .trim()
    .min(2, 'Note trop courte (2 caractères minimum).')
    .max(3000, 'Note trop longue (3000 caractères maximum).'),
});

export const conversationStatusSchema = conversationIdSchema.extend({
  status: z.enum(['NEW', 'IN_PROGRESS', 'WAITING_RESPONSE', 'TREATED', 'ARCHIVED']),
});
