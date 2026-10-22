/* ============================================================
 * Moteur de promotions (P8.12) - fonctions pures, testables sans base.
 * Une promotion ne s'applique jamais au-delà de 100 % ni en dessous
 * de 0 : le prix réduit est toujours un entier positif ou nul.
 * ============================================================ */

export type PromotionKind = 'PERCENT' | 'FIXED';

export interface PromotionCandidate {
  id: string;
  name: string;
  kind: PromotionKind;
  value: number;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
  serviceIds: string[];
  /** Code saisi par la cliente (MAJUSCULES) ; null/absent = promotion automatique. */
  code?: string | null;
}

export interface AppliedDiscount {
  promotionId: string;
  promotionName: string;
  discountCents: number;
  finalPriceCents: number;
}

export const PROMO_CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;
export const INVALID_PROMO_CODE_MESSAGE = 'Ce code promo n’est pas valide.';

/** Normalise un code saisi (espaces, casse) ; null si vide ou au mauvais format. */
export function normalizePromoCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').trim().toUpperCase();
  return PROMO_CODE_PATTERN.test(code) ? code : null;
}

/**
 * Promotions applicables à une prestation à un instant donné.
 * Règle : une promotion AVEC code n'est éligible que si la cliente saisit ce code ;
 * une promotion SANS code s'applique automatiquement.
 */
function eligiblePromotions(
  promotions: PromotionCandidate[],
  serviceId: string,
  now: Date,
  code: string | null,
): PromotionCandidate[] {
  return promotions.filter(
    (promo) =>
      promo.active &&
      promo.serviceIds.includes(serviceId) &&
      promo.startsAt.getTime() <= now.getTime() &&
      promo.endsAt.getTime() >= now.getTime() &&
      (!promo.code || (code !== null && promo.code === code)),
  );
}

/**
 * Choisit la promotion active pour une prestation à un instant donné.
 * S'il y en a plusieurs, la première de la liste fournie (triée par l'appelant)
 * l'emporte - un seul rabais à la fois.
 */
export function findActivePromotion(
  promotions: PromotionCandidate[],
  serviceId: string,
  now: Date,
  enteredCode?: string | null,
): PromotionCandidate | null {
  return eligiblePromotions(promotions, serviceId, now, normalizePromoCode(enteredCode))[0] ?? null;
}

/**
 * Une seule promotion, la plus avantageuse pour la cliente (code saisi inclus),
 * comparée sur le prix réel. À rabais égal, la première de la liste l'emporte.
 */
export function findBestPromotion(
  promotions: PromotionCandidate[],
  serviceId: string,
  now: Date,
  priceCents: number,
  enteredCode?: string | null,
): PromotionCandidate | null {
  let best: PromotionCandidate | null = null;
  let bestDiscount = -1;
  for (const promo of eligiblePromotions(
    promotions,
    serviceId,
    now,
    normalizePromoCode(enteredCode),
  )) {
    const { discountCents } = applyPromotion(priceCents, promo);
    if (discountCents > bestDiscount) {
      best = promo;
      bestDiscount = discountCents;
    }
  }
  return best;
}

export type PromoCodeResolution =
  { ok: true; promotion: PromotionCandidate } | { ok: false; error: string };

/**
 * Valide un code pour une prestation. Un seul message d'échec, quelle que soit la cause
 * (inconnu, inactif, expiré, prestation non couverte) : aucune fuite d'information.
 */
export function resolvePromoCode(
  promotions: PromotionCandidate[],
  serviceId: string,
  now: Date,
  rawCode: string | null | undefined,
): PromoCodeResolution {
  const code = normalizePromoCode(rawCode);
  const promotion = code
    ? (eligiblePromotions(promotions, serviceId, now, code).find((promo) => promo.code === code) ??
      null)
    : null;
  return promotion ? { ok: true, promotion } : { ok: false, error: INVALID_PROMO_CODE_MESSAGE };
}

/**
 * Applique le rabais d'une promotion à un prix en centimes.
 * Le prix final ne descend jamais sous 0, le rabais jamais au-delà du prix.
 */
export function applyPromotion(
  priceCents: number,
  promotion: Pick<PromotionCandidate, 'id' | 'name' | 'kind' | 'value'>,
): AppliedDiscount {
  const rawDiscount =
    promotion.kind === 'PERCENT'
      ? Math.round((priceCents * Math.min(100, Math.max(0, promotion.value))) / 100)
      : Math.max(0, promotion.value);
  const discountCents = Math.min(rawDiscount, Math.max(0, priceCents));
  return {
    promotionId: promotion.id,
    promotionName: promotion.name,
    discountCents,
    finalPriceCents: Math.max(0, priceCents - discountCents),
  };
}
