import { describe, expect, it } from 'vitest';
import { loadMoreReviewsSchema, publicReviewSchema, tokenReviewSchema } from './schemas';

const base = { serviceId: 'svc1', authorName: 'Awa Diallo', rating: '5', comment: 'Top' };

describe('publicReviewSchema', () => {
  it('accepts a valid review and coerces the rating', () => {
    const parsed = publicReviewSchema.parse(base);
    expect(parsed.rating).toBe(5);
    expect(parsed.website).toBe('');
  });

  it('allows an empty comment', () => {
    expect(publicReviewSchema.parse({ ...base, comment: '' }).comment).toBe('');
  });

  it.each(['0', '6', 'abc', '', '3.5'])('rejects rating %p', (rating) => {
    expect(publicReviewSchema.safeParse({ ...base, rating }).success).toBe(false);
  });

  it('strips HTML from the name and the comment', () => {
    const parsed = publicReviewSchema.parse({
      ...base,
      authorName: '<b>Awa</b>',
      comment: 'Super <script>x</script>',
    });
    expect(parsed.authorName).toBe('Awa');
    expect(parsed.comment).toBe('Super x');
  });

  it('rejects a too short name and a too long comment', () => {
    expect(publicReviewSchema.safeParse({ ...base, authorName: 'A' }).success).toBe(false);
    expect(publicReviewSchema.safeParse({ ...base, comment: 'a'.repeat(1501) }).success).toBe(
      false,
    );
  });
});

describe('tokenReviewSchema', () => {
  it('requires a token', () => {
    expect(tokenReviewSchema.safeParse({ rating: '4', comment: '' }).success).toBe(false);
    expect(tokenReviewSchema.parse({ token: 't', rating: '4' }).comment).toBe('');
  });
});

describe('loadMoreReviewsSchema', () => {
  it('bounds the offset', () => {
    expect(loadMoreReviewsSchema.safeParse({ serviceId: 's', offset: -1 }).success).toBe(false);
    expect(loadMoreReviewsSchema.safeParse({ serviceId: 's', offset: 6 }).success).toBe(true);
  });
});
