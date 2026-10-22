import { z } from 'zod';
import { formatEuro } from '@/modules/reservations/format';

/* ============================================================
 * Réglage « Coiffure à domicile » (dashboard > Paramètres).
 * Saisie admin en euros entiers ; stockage en centimes (colonnes *Cents).
 * ============================================================ */

/** Borne raisonnable des frais de déplacement saisis (€). */
export const MAX_TRAVEL_FEE_EUR = 500;

export function eurosToCents(eur: number): number {
  return eur * 100;
}

const checkbox = z.preprocess(
  (value) => value === 'on' || value === true || value === 'true',
  z.boolean(),
);

const feeEur = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? '0' : value),
  z
    .string()
    .trim()
    .regex(/^\d+$/, 'Frais invalides : saisissez un montant entier en euros.')
    .transform(Number)
    .pipe(
      z.number().int().min(0).max(MAX_TRAVEL_FEE_EUR, `Frais limités à ${MAX_TRAVEL_FEE_EUR} €.`),
    ),
);

export const homeServiceSettingsSchema = z.object({
  homeServiceEnabled: checkbox,
  travelFeeEur: feeEur,
});

export type HomeServiceSettingsInput = z.infer<typeof homeServiceSettingsSchema>;

/** Phrase publique (FAQ, infos pratiques) : l'option est présentée comme possible, jamais obligatoire. */
export function homeServiceSentence(travelFeeCents: number): string {
  return travelFeeCents > 0
    ? `Coiffure à domicile possible en option, frais de déplacement en supplément (${formatEuro(travelFeeCents)}).`
    : 'Coiffure à domicile possible en option, sans frais de déplacement.';
}
