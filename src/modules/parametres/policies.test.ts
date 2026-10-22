import { describe, expect, it } from 'vitest';
import {
  emailContextFromSettings,
  resolveBookingPolicy,
  resolveCancellationPolicy,
  splitParagraphs,
} from './policies';

describe('resolveCancellationPolicy', () => {
  it('should return the custom text when provided', () => {
    expect(resolveCancellationPolicy('  Annulation libre.  ', 24)).toBe('Annulation libre.');
  });

  it('should fall back to a sober default using the notice delay', () => {
    expect(resolveCancellationPolicy(null, 48)).toContain('48 heures');
    expect(resolveCancellationPolicy('   ', 24)).toContain('24 heures');
  });

  it('should not mention a delay when there is no minimum notice', () => {
    expect(resolveCancellationPolicy('', 0)).not.toMatch(/0 heures/);
  });
});

describe('resolveBookingPolicy', () => {
  it('should return the custom text when provided', () => {
    expect(resolveBookingPolicy('Acompte de 5 000 FCFA.')).toBe('Acompte de 5 000 FCFA.');
  });

  it('should fall back to a default mentioning on-site payment', () => {
    expect(resolveBookingPolicy(null)).toContain('Paiement sur place');
  });

  it('should never mention a salon', () => {
    expect(resolveBookingPolicy(null).toLowerCase()).not.toContain('salon');
    expect(resolveCancellationPolicy(null, 24).toLowerCase()).not.toContain('salon');
  });
});

describe('splitParagraphs', () => {
  it('should split on blank lines and drop empty parts', () => {
    expect(splitParagraphs('A\n\n\nB\n  \nC')).toEqual(['A', 'B', 'C']);
  });
});

describe('emailContextFromSettings', () => {
  it('should resolve policies and keep the signature', () => {
    const ctx = emailContextFromSettings({
      emailSignature: ' Patricia ',
      cancellationPolicy: null,
      bookingPolicy: 'Acompte.',
      minCancelNoticeHours: 12,
    });
    expect(ctx.signature).toBe('Patricia');
    expect(ctx.cancellationPolicy).toContain('12 heures');
    expect(ctx.bookingPolicy).toBe('Acompte.');
  });
});
