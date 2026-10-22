const MAX_DOTS = 3;

/**
 * Indicateurs « infinis » façon Instagram : 3 points maximum, fenêtre glissante
 * autour de la photo active. Le point actif est plein, les voisins sont moyens et
 * un point de bord qui cache d'autres photos rétrécit.
 */
export function dotWindow(index: number, count: number): { start: number; sizes: number[] } {
  const visible = Math.min(count, MAX_DOTS);
  const start = Math.min(Math.max(index - 1, 0), count - visible);
  const sizes = Array.from({ length: visible }, (_, slot) => {
    const absolute = start + slot;
    if (absolute === index) return 2; // actif
    const hasMoreBeyond =
      (slot === 0 && absolute > 0) || (slot === visible - 1 && absolute < count - 1);
    return hasMoreBeyond && count > MAX_DOTS ? 0 : 1;
  });
  return { start, sizes };
}

export const DOT_CLASS = [
  'w-1 opacity-40', // petit : d'autres photos au-delà
  'w-1.5 opacity-60', // voisin
  'w-4 opacity-100', // actif
] as const;
