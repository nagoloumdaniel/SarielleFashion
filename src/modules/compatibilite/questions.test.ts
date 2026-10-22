import { describe, expect, it } from 'vitest';
import {
  CORE_KEYS,
  buildPublicQuestions,
  isQuestionAnswered,
  isQuestionVisible,
  normalizeAnswers,
  type ConfiguredQuestion,
} from './questions';

const rule = {
  acceptedLengths: ['LONG', 'VERY_LONG'] as const,
  acceptedHairTypes: [],
  requiresLocs: false,
  incompatibleLocs: true,
};

function configured(overrides: Partial<ConfiguredQuestion> = {}): ConfiguredQuestion {
  return {
    key: 'etat_cheveux',
    label: 'Quel est l’état de vos cheveux ?',
    type: 'SINGLE_CHOICE',
    required: true,
    active: true,
    order: 0,
    options: ['Sains', 'Abîmés'],
    condition: null,
    ...overrides,
  };
}

describe('buildPublicQuestions', () => {
  it('should ask only the questions linked to configured restrictions', () => {
    const questions = buildPublicQuestions({
      rule: { ...rule, acceptedLengths: [...rule.acceptedLengths] },
      configured: [],
    });
    const keys = questions.map((question) => question.key);
    expect(keys).toContain(CORE_KEYS.hairLength);
    expect(keys).toContain(CORE_KEYS.shortCut);
    expect(keys).toContain(CORE_KEYS.hasLocs);
    expect(keys).not.toContain(CORE_KEYS.hairType);
  });

  it('should not ask length or locs when there is no restriction', () => {
    const questions = buildPublicQuestions({
      rule: null,
      configured: [],
    });
    expect(questions).toHaveLength(0);
  });

  it('should ask the hair type when hair types are restricted', () => {
    const questions = buildPublicQuestions({
      rule: {
        acceptedLengths: [],
        acceptedHairTypes: ['Cheveux crépus'],
        requiresLocs: false,
        incompatibleLocs: false,
      },
      configured: [],
    });
    expect(questions.map((question) => question.key)).toContain(CORE_KEYS.hairType);
  });

  it('should include configured questions ordered, with their options and conditions', () => {
    const questions = buildPublicQuestions({
      rule: null,
      configured: [
        configured({ key: 'deux', order: 2 }),
        configured({
          key: 'un',
          order: 1,
          condition: { dependsOn: 'has_locs', equals: 'NO' },
        }),
      ],
    });
    expect(questions.map((question) => question.key)).toEqual(['un', 'deux']);
    expect(questions[0]?.options).toEqual([
      { value: 'Sains', label: 'Sains' },
      { value: 'Abîmés', label: 'Abîmés' },
    ]);
    expect(questions[0]?.condition).toEqual({ dependsOn: 'has_locs', equals: 'NO' });
  });

  it('should ignore inactive questions and core key collisions', () => {
    const questions = buildPublicQuestions({
      rule: { ...rule, acceptedLengths: [...rule.acceptedLengths] },
      configured: [
        configured({ key: CORE_KEYS.hairLength, label: 'Doublon' }),
        configured({ key: 'inactive', active: false }),
      ],
    });
    expect(questions.filter((question) => question.label === 'Doublon')).toHaveLength(0);
    expect(questions.filter((question) => question.key === 'inactive')).toHaveLength(0);
  });

  it('should fall back to default options for boolean questions', () => {
    const questions = buildPublicQuestions({
      rule: null,
      configured: [configured({ key: 'oui_non', type: 'BOOLEAN', options: [] })],
    });
    expect(questions[0]?.options.map((option) => option.value)).toEqual(['YES', 'NO']);
  });
});

describe('isQuestionVisible', () => {
  it('should always show a question without condition', () => {
    expect(isQuestionVisible(null, {})).toBe(true);
  });

  it('should compare a scalar answer', () => {
    expect(isQuestionVisible({ dependsOn: 'has_locs', equals: 'NO' }, { has_locs: 'NO' })).toBe(
      true,
    );
    expect(isQuestionVisible({ dependsOn: 'has_locs', equals: 'YES' }, { has_locs: 'NO' })).toBe(
      false,
    );
  });

  it('should compare a boolean answer', () => {
    expect(isQuestionVisible({ dependsOn: 'short_cut', equals: 'true' }, { short_cut: true })).toBe(
      true,
    );
    expect(
      isQuestionVisible({ dependsOn: 'short_cut', equals: 'false' }, { short_cut: true }),
    ).toBe(false);
  });

  it('should compare multi-choice answers', () => {
    expect(
      isQuestionVisible(
        { dependsOn: 'situations', equals: 'grossesse' },
        { situations: ['allaitement', 'grossesse'] },
      ),
    ).toBe(true);
  });
});

describe('isQuestionAnswered', () => {
  const question = {
    key: 'test',
    label: 'Test',
    type: 'TEXT' as const,
    required: true,
    options: [],
    help: null,
    condition: null,
    core: false,
  };

  it('should accept a non-empty string', () => {
    expect(isQuestionAnswered(question, { test: 'oui' })).toBe(true);
    expect(isQuestionAnswered(question, { test: '   ' })).toBe(false);
  });

  it('should accept a non-empty array and a boolean', () => {
    expect(isQuestionAnswered(question, { test: ['a'] })).toBe(true);
    expect(isQuestionAnswered(question, { test: [] })).toBe(false);
    expect(isQuestionAnswered(question, { test: false })).toBe(true);
  });
});

describe('normalizeAnswers', () => {
  it('should map core answers to the engine input', () => {
    expect(
      normalizeAnswers({
        hair_length: 'SHORT',
        has_locs: 'NO',
        short_cut: 'YES',
        hair_type: 'Cheveux crépus',
      }),
    ).toEqual({
      hairLength: 'SHORT',
      hasLocs: 'NO',
      shortCut: true,
      hairType: 'Cheveux crépus',
      notes: null,
    });
  });

  it('should map unsure answers and invalid values', () => {
    const answers = normalizeAnswers({
      hair_length: 'UNSURE',
      has_locs: 'MAYBE',
      short_cut: false,
    });
    expect(answers.hairLength).toBe('UNSURE');
    expect(answers.hasLocs).toBeNull();
    expect(answers.shortCut).toBe(false);
  });
});
