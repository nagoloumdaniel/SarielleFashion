import { z } from 'zod';

export const hairLengthSchema = z.enum(['SHORT', 'MEDIUM', 'LONG', 'VERY_LONG']);

export const customRequestSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis (2 caractères minimum).').max(100),
  email: z.string().trim().email('E-mail invalide.').max(200),
  phone: z
    .string()
    .trim()
    .min(8, 'Téléphone invalide.')
    .max(30)
    .regex(/^[+\d\s().-]*$/, 'Téléphone invalide (chiffres, espaces et + uniquement).')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .min(20, 'Décrivez votre demande en 20 caractères minimum.')
    .max(3000, 'Description trop longue (3000 caractères maximum).'),
  hairLength: hairLengthSchema,
  hairType: z.string().trim().min(2, 'Précisez votre type de cheveux.').max(120),
  currentStyle: z.string().trim().max(200).optional().default(''),
  desiredDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date souhaitée invalide.')
    .optional()
    .or(z.literal('')),
  comment: z.string().trim().max(1000).optional().default(''),
  consent: z
    .preprocess((value) => value === 'on' || value === 'true' || value === true, z.boolean())
    .refine((value) => value === true, { message: 'Votre accord est nécessaire.' }),
  website: z.string().optional().default(''),
});

export type CustomRequestInput = z.infer<typeof customRequestSchema>;

/* Prix saisi en FCFA entiers ; stocké en centièmes de FCFA (unité interne *Cents). */
export const MAX_ESTIMATED_PRICE_FCFA = 10_000_000;

export const customRequestDecisionSchema = z
  .object({
    requestId: z.string().trim().min(1).max(64),
    action: z.enum(['IN_REVIEW', 'INFO_REQUESTED', 'QUOTED', 'ACCEPTED', 'REFUSED', 'CLOSED']),
    message: z
      .string()
      .trim()
      .max(3000, 'Message trop long (3000 caractères maximum).')
      .default(''),
    estimatedPriceFcfa: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((value) => (value === '' ? null : Number(value)))
      .refine(
        (value) =>
          value === null ||
          (Number.isInteger(value) && value >= 0 && value <= MAX_ESTIMATED_PRICE_FCFA),
        { message: 'Prix estimé invalide (montant entier en FCFA).' },
      )
      .transform((value) => (value === null ? null : value * 100)),
    serviceId: z.string().trim().max(64).optional().default(''),
    proposedSlotLocal: z.string().trim().max(30).optional().default(''),
    timeZone: z.string().trim().max(80).optional().default('Africa/Dakar'),
  })
  .refine((data) => data.action === 'IN_REVIEW' || data.message.length >= 2, {
    message: 'Message requis (2 caractères minimum).',
    path: ['message'],
  });

export const conversationIdSchema = z.object({ id: z.string().trim().min(1).max(64) });
