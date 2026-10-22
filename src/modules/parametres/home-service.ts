import { z } from 'zod';
import { formatFcfa } from '@/modules/reservations/format';

/* ============================================================
 * Réglage « Coiffure à domicile » (dashboard > Paramètres).
 * Saisie admin en FCFA entiers ; stockage en 1/100 FCFA (colonnes *Cents).
 * ============================================================ */

/** Borne raisonnable des frais de déplacement saisis (FCFA). */
export const MAX_TRAVEL_FEE_FCFA = 100_000;

export function fcfaToCents(fcfa: number): number {
  return fcfa * 100;
}

const checkbox = z.preprocess(
  (value) => value === 'on' || value === true || value === 'true',
  z.boolean(),
);

const feeFcfa = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? '0' : value),
  z
    .string()
    .trim()
    .regex(/^\d+$/, 'Frais invalides : saisissez un montant entier en FCFA.')
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(0)
        .max(MAX_TRAVEL_FEE_FCFA, `Frais limités à ${MAX_TRAVEL_FEE_FCFA} FCFA.`),
    ),
);

export const homeServiceSettingsSchema = z.object({
  homeServiceEnabled: checkbox,
  travelFeeFcfa: feeFcfa,
});

export type HomeServiceSettingsInput = z.infer<typeof homeServiceSettingsSchema>;

/** Phrase publique (FAQ, infos pratiques) : l'option est présentée comme possible, jamais obligatoire. */
export function homeServiceSentence(travelFeeCents: number): string {
  return travelFeeCents > 0
    ? `Coiffure à domicile possible en option, frais de déplacement en supplément (${formatFcfa(travelFeeCents)}).`
    : 'Coiffure à domicile possible en option, sans frais de déplacement.';
}
