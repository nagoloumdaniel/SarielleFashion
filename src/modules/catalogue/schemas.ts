import { z } from 'zod';
import { AnswerType, HairLength, PhotoPolicy, ServiceStatus } from '@prisma/client';

/* ============================================================
 * Schémas de validation - back-office catalogue (Phase 4)
 * Toute entrée utilisateur passe par Zod côté serveur (P1.9).
 * ============================================================ */

export const PRICE_MODES = ['FIXED', 'FROM', 'RANGE', 'ON_REQUEST'] as const;
export type PriceMode = (typeof PRICE_MODES)[number];

export const PRICE_MODE_LABELS: Record<PriceMode, string> = {
  FIXED: 'Prix fixe',
  FROM: 'Prix de départ',
  RANGE: 'Fourchette de prix',
  ON_REQUEST: 'Prix à confirmer',
};

/** Accepte « 45 », « 45,50 » et « 45.50 ». Vide ou absent devient undefined. */
function preprocessDecimal(value: unknown): unknown {
  if (value === '' || value == null) return undefined;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    return normalized === '' ? undefined : Number(normalized);
  }
  return value;
}

function preprocessCheckbox(value: unknown): boolean {
  return value === 'on' || value === true || value === 'true';
}

/** Case à cocher : absente du FormData signifie décochée. */
export const checkbox = z.preprocess(preprocessCheckbox, z.boolean().default(false));

/** Montant saisi en euros , converti en centimes côté serveur. */
export const priceEuros = z.preprocess(
  preprocessDecimal,
  z
    .number()
    .min(0, 'Le prix ne peut pas être négatif.')
    .max(5_000_000, 'Prix trop élevé.')
    .optional(),
);

/** Durée en minutes, vide accepté (durée à confirmer). */
export const durationMinutes = z.preprocess(
  preprocessDecimal,
  z.number().int('La durée doit être un nombre entier.').min(1).max(480).optional(),
);

/* ------------------------------------------------------------------ */
/* Catégories (P4.2)                                                   */
/* ------------------------------------------------------------------ */

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(80, 'Le nom est trop long (80 caractères max).'),
  slug: z
    .string()
    .trim()
    .min(2, 'Le slug doit contenir au moins 2 caractères.')
    .max(80, 'Le slug est trop long (80 caractères max).')
    .regex(/^[a-z0-9-]+$/, 'Slug invalide : lettres minuscules, chiffres et tirets uniquement.'),
  description: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().trim().max(500, 'La description est trop longue (500 caractères max).').default(''),
  ),
  order: z.coerce.number().int().min(0).default(0),
  active: checkbox,
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

/** Liste ordonnée d'identifiants (monter / descendre) : l'ordre vient de la position dans la liste. */
export const orderedIdsSchema = z
  .array(z.string().min(1).max(64))
  .min(1, 'Liste vide.')
  .max(200, 'Liste trop longue.');

/* ------------------------------------------------------------------ */
/* Prestations (P4.3)                                                  */
/* ------------------------------------------------------------------ */

export const serviceInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(120),
    slug: z
      .string()
      .trim()
      .min(2, 'Le slug doit contenir au moins 2 caractères.')
      .max(120)
      .regex(/^[a-z0-9-]+$/, 'Slug invalide : lettres minuscules, chiffres et tirets uniquement.'),
    description: z.preprocess(
      (value) => (typeof value === 'string' ? value : ''),
      z
        .string()
        .trim()
        .max(2000, 'La description est trop longue (2000 caractères max).')
        .default(''),
    ),
    categoryId: z.string().min(1, 'Choisissez une catégorie.'),
    priceMode: z.enum(PRICE_MODES).default('FROM'),
    priceFromEuros: priceEuros,
    priceToEuros: priceEuros,
    durationMinutes,
    status: z.nativeEnum(ServiceStatus).default('DRAFT'),
    order: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.priceMode === 'ON_REQUEST') return;
    if (data.priceFromEuros == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indiquez un prix.',
        path: ['priceFromEuros'],
      });
      return;
    }
    if (
      data.priceMode === 'RANGE' &&
      data.priceToEuros != null &&
      data.priceToEuros < data.priceFromEuros
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Le prix maximum ne peut pas être inférieur au prix de départ.',
        path: ['priceToEuros'],
      });
    }
  });

export type ServiceInput = z.infer<typeof serviceInputSchema>;

export const serviceStatusSchema = z.object({
  status: z.nativeEnum(ServiceStatus),
});

/** Paramètres de la liste admin : tout est optionnel, valeurs invalides ignorées. */
export const adminServiceFiltersSchema = z.object({
  search: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined),
    z.string().max(120).optional(),
  ),
  categoryId: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined),
    z.string().optional(),
  ),
  status: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined),
    z.nativeEnum(ServiceStatus).optional(),
  ),
});

export type AdminServiceFilters = z.infer<typeof adminServiceFiltersSchema>;

/* ------------------------------------------------------------------ */
/* Options payantes (P4.3)                                             */
/* ------------------------------------------------------------------ */

export const serviceOptionInputSchema = z.object({
  name: z.string().trim().min(2, "Le nom de l'option est trop court.").max(80),
  priceEuros: z.preprocess(
    preprocessDecimal,
    z
      .number()
      .min(0, "Le prix de l'option ne peut pas être négatif.")
      .max(1_000_000, "Prix de l'option trop élevé."),
  ),
  durationMinutes: z.preprocess(preprocessDecimal, z.number().int().min(0).max(480).default(0)),
  active: checkbox,
});

export type ServiceOptionInput = z.infer<typeof serviceOptionInputSchema>;

/* ------------------------------------------------------------------ */
/* Photos (P4.4, P4.5)                                                 */
/* ------------------------------------------------------------------ */

export const imageAltSchema = z.object({
  alt: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().trim().max(160, 'Le texte alternatif est limité à 160 caractères.').default(''),
  ),
});

/* ------------------------------------------------------------------ */
/* Règles de compatibilité (P4.7)                                      */
/* ------------------------------------------------------------------ */

export const compatibilityRuleInputSchema = z
  .object({
    acceptedLengths: z.preprocess(
      (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value !== '') return [value];
        return [];
      },
      z.array(z.nativeEnum(HairLength)).default([]),
    ),
    acceptedHairTypes: z.preprocess(
      (value) => {
        if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
        if (typeof value === 'string' && value !== '') return [value];
        return [];
      },
      z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    ),
    requiresLocs: checkbox,
    incompatibleLocs: checkbox,
    photoPolicy: z.nativeEnum(PhotoPolicy).default('OPTIONAL'),
    autoApprove: checkbox,
    conditionsNote: z.preprocess(
      (value) => (typeof value === 'string' ? value : ''),
      z.string().trim().max(1000, 'Les conditions sont limitées à 1000 caractères.').default(''),
    ),
    incompatibleMessage: z.preprocess(
      (value) => (typeof value === 'string' ? value : ''),
      z.string().trim().max(500).default(''),
    ),
    uncertainMessage: z.preprocess(
      (value) => (typeof value === 'string' ? value : ''),
      z.string().trim().max(500).default(''),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.requiresLocs && data.incompatibleLocs) {
      ctx.addIssue({
        code: 'custom',
        message: 'Une prestation ne peut pas à la fois exiger et refuser les locs.',
        path: ['requiresLocs'],
      });
    }
  });

export type CompatibilityRuleInput = z.infer<typeof compatibilityRuleInputSchema>;

/* ------------------------------------------------------------------ */
/* Questions capillaires (P4.8)                                        */
/* ------------------------------------------------------------------ */

export const questionInputSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(2, 'La clé doit contenir au moins 2 caractères.')
      .max(60)
      .regex(/^[a-z0-9_]+$/, 'Clé invalide : minuscules, chiffres et tirets bas uniquement.'),
    label: z.string().trim().min(3, 'La question est trop courte.').max(200),
    type: z.nativeEnum(AnswerType),
    options: z.preprocess(
      (value) => {
        const list = Array.isArray(value)
          ? value
          : typeof value === 'string'
            ? value.split(/[\n,;]+/)
            : [];
        return list
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((item) => item.length > 0)
          .slice(0, 20);
      },
      z.array(z.string().max(80)).default([]),
    ),
    required: checkbox,
    active: checkbox,
    order: z.coerce.number().int().min(0).default(0),
    conditionDependsOn: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z.string().max(60).default(''),
    ),
    conditionEquals: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z.string().max(120).default(''),
    ),
  })
  .superRefine((data, ctx) => {
    const hasDependsOn = data.conditionDependsOn !== '';
    const hasEquals = data.conditionEquals !== '';
    if (hasDependsOn !== hasEquals) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Renseignez la question de départ et la valeur attendue, ou laissez les deux vides.',
        path: [hasDependsOn ? 'conditionEquals' : 'conditionDependsOn'],
      });
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;
