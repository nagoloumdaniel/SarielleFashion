import { describe, expect, it } from 'vitest';
import { rankPopularServices, type BookingStat } from './popular-services';

const stat = (serviceId: string, count: number, last: string, name = serviceId): BookingStat => ({
  serviceId,
  name,
  count,
  lastBookedAt: new Date(last),
});

describe('rankPopularServices', () => {
  it('retourne vide sans réservation', () => {
    expect(rankPopularServices([])).toEqual([]);
  });

  it('ignore les comptes à zéro', () => {
    expect(rankPopularServices([stat('a', 0, '2026-01-01')])).toEqual([]);
  });

  it('trie par nombre décroissant et limite à 3', () => {
    const ids = rankPopularServices([
      stat('a', 1, '2026-01-01'),
      stat('b', 5, '2026-01-01'),
      stat('c', 3, '2026-01-01'),
      stat('d', 4, '2026-01-01'),
    ]);
    expect(ids).toEqual(['b', 'd', 'c']);
  });

  it('retourne moins de 3 éléments si peu de coiffures réservées', () => {
    expect(rankPopularServices([stat('a', 2, '2026-01-01')])).toEqual(['a']);
  });

  it('départage par réservation la plus récente', () => {
    const ids = rankPopularServices([stat('a', 2, '2026-01-01'), stat('b', 2, '2026-02-01')]);
    expect(ids).toEqual(['b', 'a']);
  });

  it('départage ensuite par nom', () => {
    const ids = rankPopularServices([
      stat('z', 2, '2026-01-01', 'Vanilles'),
      stat('y', 2, '2026-01-01', 'Locs'),
    ]);
    expect(ids).toEqual(['y', 'z']);
  });
});
