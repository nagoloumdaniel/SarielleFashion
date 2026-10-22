import { z } from 'zod';

const isoDay = (required: string) =>
  z
    .string()
    .trim()
    .min(1, required)
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.')
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), {
      message: 'Date invalide.',
    });

/** Code promo facultatif : MAJUSCULES, 3 à 20 caractères [A-Z0-9-]. Vide = promotion automatique. */
export const promoCodeSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : ''),
  z.union([
    z.literal('').transform(() => null),
    z
      .string()
      .regex(
        /^[A-Z0-9-]{3,20}$/,
        'Le code doit faire 3 à 20 caractères : lettres, chiffres ou tirets.',
      ),
  ]),
);

export const promotionSchema = z
  .object({
    name: z.string().trim().min(2, 'Nom requis (2 caractères minimum).').max(120),
    code: promoCodeSchema,
    kind: z.enum(['PERCENT', 'FIXED']),
    // Pourcentage entier 1-100, ou montant fixe en euros entier (converti en centimes).
    value: z
      .string()
      .trim()
      .transform((value) => Number(value.replace(/\s/g, '').replace(',', '.')))
      .refine((value) => Number.isFinite(value) && value > 0, {
        message: 'Valeur de réduction invalide.',
      }),
    startsAt: isoDay('Date de début requise.'),
    endsAt: isoDay('Date de fin requise.'),
    serviceIds: z
      .array(z.string().trim().min(1).max(64))
      .min(1, 'Sélectionnez au moins une prestation.')
      .max(100),
  })
  .superRefine((input, ctx) => {
    if (input.kind === 'PERCENT' && (!Number.isInteger(input.value) || input.value > 100)) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Le pourcentage doit être un entier entre 1 et 100.',
      });
    }
    if (input.kind === 'FIXED' && (!Number.isInteger(input.value) || input.value > 100_000_000)) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Le montant doit être un nombre entier d’euros.',
      });
    }
  });

export type PromotionInput = z.infer<typeof promotionSchema>;

export const promotionIdSchema = z.object({ id: z.string().trim().min(1).max(64) });
