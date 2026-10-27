import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('should lowercase, strip accents and use dashes', () => {
    expect(slugify('Tresses Collées & Nattes !')).toBe('tresses-collees-nattes');
  });
  it('should return empty for a name without letters', () => {
    expect(slugify('!!!')).toBe('');
  });
  it('should truncate without trailing dash', () => {
    const slug = slugify('a'.repeat(10) + ' ' + 'b'.repeat(10), 11);
    expect(slug).toBe('aaaaaaaaaa');
  });
});

describe('uniqueSlug', () => {
  it('should keep the base when free', async () => {
    expect(await uniqueSlug('Robe wax', async () => false)).toBe('robe-wax');
  });
  it('should suffix -2, -3 on collision', async () => {
    const taken = new Set(['robe-wax', 'robe-wax-2']);
    expect(await uniqueSlug('Robe wax', async (s) => taken.has(s))).toBe('robe-wax-3');
  });
  it('should use the fallback for an empty base', async () => {
    expect(await uniqueSlug('???', async () => false, { fallback: 'prestation' })).toBe(
      'prestation',
    );
  });
  it('should keep the suffixed slug within maxLength', async () => {
    const slug = await uniqueSlug('abcdefghij', async (s) => s === 'abcdefghij', { maxLength: 10 });
    expect(slug).toBe('abcdefgh-2');
  });
});
