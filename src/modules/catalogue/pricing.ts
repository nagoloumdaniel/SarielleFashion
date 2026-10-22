import type { PriceMode } from './schemas';

/**
 * Conversions pures entre le formulaire (euros) et la base (centimes).
 * Aucun accès base ni framework : testable en Vitest (P4.10).
 */

export interface ServicePriceFields {
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
}

export interface ServicePriceInput {
  priceMode: PriceMode;
  priceFromEuros?: number | null;
  priceToEuros?: number | null;
}

/** Arrondit au centime le plus proche, jamais de flottant stocké en base. */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Traduit le mode de prix choisi en champs base.
 * Les modes FIXED et FROM n'écrivent jamais de prix maximum parasite.
 */
export function priceFieldsFromInput(input: ServicePriceInput): ServicePriceFields {
  const from = input.priceFromEuros;
  const to = input.priceToEuros;

  switch (input.priceMode) {
    case 'ON_REQUEST':
      return { priceFromCents: null, priceToCents: null, priceOnRequest: true };
    case 'FIXED': {
      if (from == null) throw new Error('Prix fixe sans montant.');
      const cents = eurosToCents(from);
      return { priceFromCents: cents, priceToCents: cents, priceOnRequest: false };
    }
    case 'FROM': {
      if (from == null) throw new Error('Prix de départ sans montant.');
      return { priceFromCents: eurosToCents(from), priceToCents: null, priceOnRequest: false };
    }
    case 'RANGE': {
      if (from == null) throw new Error('Fourchette sans prix de départ.');
      const toCents = to == null ? null : eurosToCents(to);
      return {
        priceFromCents: eurosToCents(from),
        priceToCents: toCents,
        priceOnRequest: false,
      };
    }
  }
}

/** Retrouve le mode de prix d'une prestation existante pour préremplir le formulaire. */
export function priceModeFromService(price: {
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
}): PriceMode {
  if (price.priceOnRequest || price.priceFromCents == null) return 'ON_REQUEST';
  if (price.priceToCents == null) return 'FROM';
  return price.priceFromCents === price.priceToCents ? 'FIXED' : 'RANGE';
}

/** Valeur d'un champ nombre en euros, sans zéro décimal inutile. */
export function centsToEurosInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  return String(cents / 100);
}
