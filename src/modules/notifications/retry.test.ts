import { describe, expect, it } from 'vitest';
import { MAX_EMAIL_ATTEMPTS, retryDelayMinutes } from './retry';

describe('retryDelayMinutes', () => {
  it('should increase the delay progressively', () => {
    expect(retryDelayMinutes(1)).toBe(1);
    expect(retryDelayMinutes(2)).toBe(5);
    expect(retryDelayMinutes(3)).toBe(15);
    expect(retryDelayMinutes(4)).toBe(60);
    expect(retryDelayMinutes(5)).toBe(240);
  });

  it('should cap the delay and handle invalid attempts', () => {
    expect(retryDelayMinutes(99)).toBe(240);
    expect(retryDelayMinutes(0)).toBe(1);
    expect(MAX_EMAIL_ATTEMPTS).toBe(5);
  });
});
