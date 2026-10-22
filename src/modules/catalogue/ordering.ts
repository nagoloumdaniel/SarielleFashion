import type { Prisma } from '@prisma/client';

/* ============================================================
 * Ordonnancement (catégories, photos, questions) - logique pure,
 * partagée par l'UI (optimistic) et testable sans base.
 * ============================================================ */

/** Déplace l'élément `index` d'un cran (-1 haut, +1 bas). Renvoie la MÊME liste si impossible. */
export function moveItem<T>(list: readonly T[], index: number, direction: -1 | 1): readonly T[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  const current = next[index] as T;
  next[index] = next[target] as T;
  next[target] = current;
  return next;
}

/** Ordre contigu 0..n-1 selon la position dans la liste (supprime les égalités d'ordre). */
export function toOrderItems(ids: readonly string[]): { id: string; order: number }[] {
  return ids.map((id, order) => ({ id, order }));
}

/** Vrai si la liste d'ids est une permutation exacte des ids connus (sans doublon). */
export function isPermutation(ids: readonly string[], knownIds: readonly string[]): boolean {
  if (ids.length !== knownIds.length) return false;
  const known = new Set(knownIds);
  const seen = new Set<string>();
  for (const id of ids) {
    if (!known.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/**
 * Tri unique des options de prestation (admin ET public) : ordre choisi dans le dashboard,
 * puis nom (ordre historique tant que rien n'a été réordonné), puis id (tri stable).
 */
export const OPTION_ORDER_BY: Prisma.ServiceOptionOrderByWithRelationInput[] = [
  { order: 'asc' },
  { name: 'asc' },
  { id: 'asc' },
];
