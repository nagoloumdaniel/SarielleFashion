import { describe, expect, it } from 'vitest';
import { paginate, parsePage } from './pagination';

describe('pagination', () => {
  it('should parse invalid pages as 1', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('-2')).toBe(1);
    expect(parsePage(['3', '4'])).toBe(3);
  });

  it('should clamp the page and compute skip', () => {
    expect(paginate(45, 2, 20)).toEqual({ page: 2, totalPages: 3, skip: 20, take: 20 });
    expect(paginate(45, 99, 20).page).toBe(3);
    expect(paginate(0, 1, 20)).toEqual({ page: 1, totalPages: 1, skip: 0, take: 20 });
  });
});
