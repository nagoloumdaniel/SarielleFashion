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
    expect(resolveCancellationPolicy(null, 30)).toContain('30 minutes');
    expect(resolveCancellationPolicy('   ', 1440)).toContain('24 heures');
  });

  it('should not mention a delay when there is no minimum notice', () => {
    expect(resolveCancellationPolicy('', 0)).not.toMatch(/0 (minutes|heures)/);
  });
});

describe('resolveBookingPolicy', () => {
  it('should return the custom text when provided', () => {
    expect(resolveBookingPolicy('Acompte de 5 000 EUR.')).toBe('Acompte de 5 000 EUR.');
  });

  it('should fall back to a default mentioning on-site payment by cash or transfer', () => {
    const text = resolveBookingPolicy(null);
    expect(text).toContain('sur place');
    expect(text).toContain('espèces');
    expect(text).toContain('virement');
  });

  it('should never mention a salon', () => {
    expect(resolveBookingPolicy(null).toLowerCase()).not.toContain('salon');
    expect(resolveCancellationPolicy(null, 30).toLowerCase()).not.toContain('salon');
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
      emailSignature: ' Sarielle ',
      cancellationPolicy: null,
      bookingPolicy: 'Acompte.',
      minCancelNoticeMinutes: 90,
    });
    expect(ctx.signature).toBe('Sarielle');
    expect(ctx.cancellationPolicy).toContain('1 h 30');
    expect(ctx.bookingPolicy).toBe('Acompte.');
  });
});
