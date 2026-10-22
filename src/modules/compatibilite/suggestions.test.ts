import { describe, expect, it } from 'vitest';
import { suggestCompatibleServices, type SuggestionCandidate } from './suggestions';
import type { CompatibilityRuleData } from './engine';

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

function candidate(overrides: Partial<SuggestionCandidate> = {}): SuggestionCandidate {
  return {
    id: 'service-2',
    name: 'Vanilles',
    slug: 'vanilles',
    categoryId: 'cat-vanilles',
    rule: rule(),
    ...overrides,
  };
}

describe('suggestCompatibleServices', () => {
  const answers = { hairLength: 'SHORT' as const, hasLocs: 'NO' as const };

  it('suggests a service that is directly bookable with the given answers', () => {
    const result = suggestCompatibleServices([candidate()], 'service-1', 'cat-tresses', answers);
    expect(result).toEqual([{ id: 'service-2', name: 'Vanilles', slug: 'vanilles' }]);
  });

  it('never suggests the excluded (current) service', () => {
    const self = candidate({ id: 'service-1' });
    const result = suggestCompatibleServices([self], 'service-1', 'cat-tresses', answers);
    expect(result).toEqual([]);
  });

  it('never suggests a service incompatible with the given answers', () => {
    const incompatible = candidate({ rule: rule({ acceptedLengths: ['LONG', 'VERY_LONG'] }) });
    const result = suggestCompatibleServices([incompatible], 'service-1', 'cat-tresses', answers);
    expect(result).toEqual([]);
  });

  it('never suggests a service requiring manual review or a photo (no restriction bypass)', () => {
    const manualReview = candidate({ rule: rule({ autoApprove: false }) });
    const photoRequired = candidate({ id: 'service-3', rule: rule({ photoPolicy: 'REQUIRED' }) });
    const result = suggestCompatibleServices(
      [manualReview, photoRequired],
      'service-1',
      'cat-tresses',
      answers,
    );
    expect(result).toEqual([]);
  });

  it('prioritizes services from the same category', () => {
    const sameCategory = candidate({ id: 'service-2', categoryId: 'cat-tresses' });
    const otherCategory = candidate({ id: 'service-3', categoryId: 'cat-autre' });
    const result = suggestCompatibleServices(
      [otherCategory, sameCategory],
      'service-1',
      'cat-tresses',
      answers,
    );
    expect(result[0]?.id).toBe('service-2');
  });

  it('limits the number of suggestions', () => {
    const many = Array.from({ length: 5 }, (_, i) => candidate({ id: `service-${i}` }));
    const result = suggestCompatibleServices(many, 'service-x', 'cat-tresses', answers, 3);
    expect(result).toHaveLength(3);
  });
});
