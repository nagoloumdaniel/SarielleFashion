import { describe, expect, it } from 'vitest';
import { dotWindow } from './dots';

describe('dotWindow', () => {
  it('limite à 3 points', () => {
    expect(dotWindow(0, 7).sizes).toHaveLength(3);
    expect(dotWindow(3, 7).sizes).toHaveLength(3);
  });
  it('fait glisser la fenêtre et rétrécit les bords', () => {
    expect(dotWindow(0, 7)).toEqual({ start: 0, sizes: [2, 1, 0] });
    expect(dotWindow(3, 7)).toEqual({ start: 2, sizes: [0, 2, 0] });
    expect(dotWindow(6, 7)).toEqual({ start: 4, sizes: [0, 1, 2] });
  });
  it('affiche tous les points sans rétrécir quand il y en a 3 ou moins', () => {
    expect(dotWindow(1, 3)).toEqual({ start: 0, sizes: [1, 2, 1] });
    expect(dotWindow(0, 2)).toEqual({ start: 0, sizes: [2, 1] });
  });
});
