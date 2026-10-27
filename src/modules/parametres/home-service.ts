import { z } from 'zod';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { formatEuro } from '@/i18n/format';
import { MESSAGES } from '@/i18n/messages';
import { createTranslator } from '@/i18n/translate';

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

/** Montant annoncé au public : « à partir de 15 € » (montant fixe, à la charge de la cliente). */
export function travelFeeFromLabel(
  travelFeeCents: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return createTranslator(locale, MESSAGES[locale])('catalogue.travel.from', {
    fee: formatEuro(locale, travelFeeCents),
  });
}

/** Phrase publique (FAQ, infos pratiques) : l'option est présentée comme possible, jamais obligatoire. */
export function homeServiceSentence(
  travelFeeCents: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const t = createTranslator(locale, MESSAGES[locale]);
  return travelFeeCents > 0
    ? t('catalogue.travel.sentenceWith', { fee: travelFeeFromLabel(travelFeeCents, locale) })
    : t('catalogue.travel.sentenceFree');
}
