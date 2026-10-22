import { describe, expect, it } from 'vitest';
import {
  COMPATIBILITY_MESSAGES,
  evaluateCompatibility,
  type CompatibilityRuleData,
} from './engine';

function rule(overrides: Partial<CompatibilityRuleData> = {}): CompatibilityRuleData {
  return {
    acceptedLengths: [],
    acceptedHairTypes: [],
    requiresLocs: false,
    incompatibleLocs: false,
    photoPolicy: 'OPTIONAL',
    autoApprove: true,
    conditionsNote: null,
    incompatibleMessage: null,
    uncertainMessage: null,
    ...overrides,
  };
}

describe('evaluateCompatibility', () => {
  it('should accept booking when no rule is configured', () => {
    const result = evaluateCompatibility({ rule: null, answers: {} });
    expect(result.verdict).toBe('COMPATIBLE');
    expect(result.nextStep).toBe('BOOK');
    expect(result.requiresManualReview).toBe(false);
  });

  it('should block short hair when only long hair is accepted', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedLengths: ['LONG', 'VERY_LONG'] }),
      answers: { hairLength: 'SHORT' },
    });
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(result.reason).toBe('LENGTH');
    expect(result.message).toContain('longueur');
    expect(result.nextStep).toBe('SUBMIT_ASSESSMENT');
  });

  it('should use the configured incompatible message', () => {
    const result = evaluateCompatibility({
      rule: rule({
        acceptedLengths: ['LONG'],
        incompatibleMessage: 'Message personnalisé de Sarielle.',
      }),
      answers: { hairLength: 'SHORT' },
    });
    expect(result.message).toBe('Message personnalisé de Sarielle.');
  });

  it('should allow booking for an accepted length with auto approval', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedLengths: ['MEDIUM', 'LONG'] }),
      answers: { hairLength: 'LONG', shortCut: false },
    });
    expect(result.verdict).toBe('COMPATIBLE');
    expect(result.nextStep).toBe('BOOK');
  });

  it('should refuse when locs are required and absent', () => {
    const result = evaluateCompatibility({
      rule: rule({ requiresLocs: true }),
      answers: { hasLocs: 'NO' },
    });
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(result.reason).toBe('LOCS_REQUIRED');
  });

  it('should refuse when locs are incompatible and present', () => {
    const result = evaluateCompatibility({
      rule: rule({ incompatibleLocs: true }),
      answers: { hasLocs: 'YES' },
    });
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(result.reason).toBe('LOCS_INCOMPATIBLE');
  });

  it('should stay uncertain when the client is unsure about length', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedLengths: ['LONG'] }),
      answers: { hairLength: 'UNSURE' },
    });
    expect(result.verdict).toBe('UNCERTAIN');
    expect(result.reason).toBe('UNSURE_LENGTH');
    expect(result.nextStep).toBe('SUBMIT_ASSESSMENT');
  });

  it('should stay uncertain when the client is unsure about locs', () => {
    const result = evaluateCompatibility({
      rule: rule({ requiresLocs: true }),
      answers: { hasLocs: 'UNSURE' },
    });
    expect(result.verdict).toBe('UNCERTAIN');
    expect(result.reason).toBe('UNSURE_LOCS');
  });

  it('should request missing answers instead of guessing', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedLengths: ['LONG'], requiresLocs: true }),
      answers: {},
    });
    expect(result.verdict).toBe('UNCERTAIN');
    expect(result.reason).toBe('MISSING_ANSWERS');
    expect(result.missingAnswers).toEqual(['hair_length', 'has_locs']);
  });

  it('should refuse a short cut or shaved area when short hair is not accepted', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedLengths: ['MEDIUM', 'LONG'] }),
      answers: { hairLength: 'LONG', shortCut: true },
    });
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(result.reason).toBe('SHORT_CUT');
  });

  it('should accept a short cut when short hair is accepted', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedLengths: ['SHORT', 'MEDIUM'] }),
      answers: { hairLength: 'SHORT', shortCut: true },
    });
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('should stay uncertain for an unlisted hair type', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedHairTypes: ['Cheveux naturels fins'] }),
      answers: { hairType: 'Cheveux crépus' },
    });
    expect(result.verdict).toBe('UNCERTAIN');
    expect(result.reason).toBe('HAIR_TYPE');
  });

  it('should accept a listed hair type', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedHairTypes: ['Cheveux crépus'] }),
      answers: { hairType: 'Cheveux crépus' },
    });
    expect(result.verdict).toBe('COMPATIBLE');
  });

  it('should require an assessment when a photo is mandatory', () => {
    const result = evaluateCompatibility({
      rule: rule({ photoPolicy: 'REQUIRED' }),
      answers: {},
    });
    expect(result.verdict).toBe('COMPATIBLE');
    expect(result.photoRequired).toBe(true);
    expect(result.nextStep).toBe('SUBMIT_ASSESSMENT');
  });

  it('should require manual review when auto approval is disabled', () => {
    const result = evaluateCompatibility({
      rule: rule({ autoApprove: false }),
      answers: {},
    });
    expect(result.verdict).toBe('COMPATIBLE');
    expect(result.requiresManualReview).toBe(true);
    expect(result.nextStep).toBe('SUBMIT_ASSESSMENT');
    expect(result.message).toBe(COMPATIBILITY_MESSAGES.manualReview);
  });

  it('should block when the photo is forbidden and the answers are incompatible', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedLengths: ['LONG'], photoPolicy: 'FORBIDDEN' }),
      answers: { hairLength: 'SHORT' },
    });
    expect(result.verdict).toBe('INCOMPATIBLE');
    expect(result.canRequestPhotoEvaluation).toBe(false);
    expect(result.nextStep).toBe('BLOCKED');
  });

  it('should allow a comment-based assessment when the photo is forbidden but the case is uncertain', () => {
    const result = evaluateCompatibility({
      rule: rule({ acceptedLengths: ['LONG'], photoPolicy: 'FORBIDDEN' }),
      answers: { hairLength: 'UNSURE' },
    });
    expect(result.verdict).toBe('UNCERTAIN');
    expect(result.nextStep).toBe('SUBMIT_ASSESSMENT');
    expect(result.photoRequired).toBe(false);
  });

  it('should expose the configured conditions note', () => {
    const result = evaluateCompatibility({
      rule: rule({ conditionsNote: 'Prévoir 30 minutes de plus.' }),
      answers: {},
    });
    expect(result.conditionsNote).toBe('Prévoir 30 minutes de plus.');
  });

  it('should use the configured uncertain message', () => {
    const result = evaluateCompatibility({
      rule: rule({ uncertainMessage: 'Envoyez une photo récente.' }),
      answers: { hairLength: 'UNSURE', hasLocs: 'UNSURE' },
    });
    expect(result.message).toBe('Envoyez une photo récente.');
  });
});
