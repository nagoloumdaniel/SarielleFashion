/* ============================================================
 * Instantanés tarif / durée d'une réservation (P6.11)
 * Une modification ultérieure du catalogue ne change jamais
 * l'historique : les valeurs sont figées à la création.
 * ============================================================ */

export interface BookingServiceInput {
  name: string;
  durationMinutes: number | null;
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest: boolean;
}

export interface BookingOptionInput {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  active?: boolean;
}

export interface SelectedOptionSnapshot {
  optionId: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
}

export interface BookingSnapshot {
  durationMinutes: number;
  priceCents: number | null;
  selectedOptions: SelectedOptionSnapshot[];
  invalidOptionIds: string[];
}

export function computeBookingSnapshot(
  service: BookingServiceInput,
  selectedOptionIds: string[],
  options: BookingOptionInput[],
): BookingSnapshot {
  const byId = new Map(options.map((option) => [option.id, option]));
  const selectedOptions: SelectedOptionSnapshot[] = [];
  const invalidOptionIds: string[] = [];
  const seen = new Set<string>();

  for (const optionId of selectedOptionIds) {
    if (seen.has(optionId)) continue;
    seen.add(optionId);
    const option = byId.get(optionId);
    if (!option || option.active === false) {
      invalidOptionIds.push(optionId);
      continue;
    }
    selectedOptions.push({
      optionId: option.id,
      name: option.name,
      priceCents: option.priceCents,
      durationMinutes: option.durationMinutes,
    });
  }

  const baseDuration = service.durationMinutes ?? 0;
  const durationMinutes =
    baseDuration +
    selectedOptions.reduce((sum, option) => sum + Math.max(0, option.durationMinutes), 0);

  const priceCents = service.priceOnRequest
    ? null
    : (service.priceFromCents ?? 0) +
      selectedOptions.reduce((sum, option) => sum + Math.max(0, option.priceCents), 0);

  return { durationMinutes, priceCents, selectedOptions, invalidOptionIds };
}

/* ------------------------------------------------------------------ */
/* Coiffure à domicile                                                 */
/* ------------------------------------------------------------------ */

export type HomeServiceResolution =
  | { ok: true; homeService: boolean; travelFeeCents: number | null }
  | { ok: false; reason: 'DISABLED' };

/**
 * Décide de l'option « à domicile » à partir des réglages serveur.
 * Les frais viennent TOUJOURS des réglages : le client n'envoie que sa demande (booléen).
 */
export function resolveHomeService(
  requested: boolean,
  settings: { homeServiceEnabled: boolean; travelFeeCents: number },
): HomeServiceResolution {
  if (!requested) return { ok: true, homeService: false, travelFeeCents: null };
  if (!settings.homeServiceEnabled) return { ok: false, reason: 'DISABLED' };
  return { ok: true, homeService: true, travelFeeCents: Math.max(0, settings.travelFeeCents) };
}

/**
 * Total figé = prix de la prestation (déjà remisé) + frais de déplacement.
 * Règle documentée : les promotions s'appliquent à la prestation et à ses options
 * uniquement, jamais aux frais de déplacement. Prix sur devis => total inconnu (null).
 */
export function addTravelFee(
  servicePriceCents: number | null,
  travelFeeCents: number | null,
): number | null {
  if (servicePriceCents == null) return null;
  return servicePriceCents + Math.max(0, travelFeeCents ?? 0);
}
