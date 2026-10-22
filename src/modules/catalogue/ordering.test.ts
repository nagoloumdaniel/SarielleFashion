import { describe, expect, it } from 'vitest';
import { isPermutation, moveItem, toOrderItems } from './ordering';

describe('moveItem', () => {
  const list = ['a', 'b', 'c'];

  it('monte et descend un élément', () => {
    expect(moveItem(list, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(list, 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('ne change rien aux bords (même référence)', () => {
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 2, 1)).toBe(list);
    expect(moveItem(list, 5, 1)).toBe(list);
  });

  it('ne mute pas la liste source', () => {
    moveItem(list, 0, 1);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});

describe('toOrderItems', () => {
  it('attribue un ordre contigu même si les ordres initiaux étaient égaux', () => {
    expect(toOrderItems(['x', 'y', 'z'])).toEqual([
      { id: 'x', order: 0 },
      { id: 'y', order: 1 },
      { id: 'z', order: 2 },
    ]);
  });
});

describe('isPermutation', () => {
  it('accepte une permutation exacte', () => {
    expect(isPermutation(['b', 'a'], ['a', 'b'])).toBe(true);
  });

  it('refuse doublon, inconnu ou taille différente', () => {
    expect(isPermutation(['a', 'a'], ['a', 'b'])).toBe(false);
    expect(isPermutation(['a', 'z'], ['a', 'b'])).toBe(false);
    expect(isPermutation(['a'], ['a', 'b'])).toBe(false);
  });
});
