import { describe, expect, it } from 'vitest';
import { localizeMessage } from '@/i18n/server-messages';
import { BOOKING_GUARD_MESSAGES } from './booking-guard';
import { buildAssessmentDecisionNotification } from './decision-notification';
import { COMPATIBILITY_MESSAGES, evaluateCompatibility } from './engine';
import { buildPublicQuestions, HAIR_LENGTH_OPTIONS, HAIR_TYPE_OPTIONS } from './questions';
import {
  readAssessmentLocale,
  withAssessmentLocale,
  withoutAssessmentLocale,
} from './assessment-locale';

describe('messages de compatibilité traduits à l’affichage', () => {
  it('traduit chaque message du moteur et de la garde de réservation', () => {
    for (const message of [
      ...Object.values(COMPATIBILITY_MESSAGES),
      ...Object.values(BOOKING_GUARD_MESSAGES),
    ]) {
      const de = localizeMessage('de', message);
      expect(de, message).not.toBe(message);
      expect(localizeMessage('fr', message)).toBe(message);
    }
  });

  it('traduit les questions de base et leurs options, mais pas les textes saisis par l’admin', () => {
    const questions = buildPublicQuestions({
      rule: {
        acceptedLengths: ['LONG'],
        acceptedHairTypes: [...HAIR_TYPE_OPTIONS],
        requiresLocs: true,
        incompatibleLocs: false,
      },
      configured: [
        {
          key: 'custom',
          label: 'Question libre de l’admin ?',
          type: 'TEXT',
          required: false,
          active: true,
          order: 1,
          options: [],
          condition: null,
        },
      ],
    });
    for (const question of questions.filter((q) => q.core)) {
      expect(localizeMessage('de', question.label), question.label).not.toBe(question.label);
      for (const option of question.options) {
        expect(localizeMessage('de', option.label), option.label).not.toBe(option.label);
      }
    }
    expect(HAIR_LENGTH_OPTIONS.length).toBeGreaterThan(0);
    const custom = questions.find((q) => q.key === 'custom');
    expect(localizeMessage('de', custom?.label)).toBe('Question libre de l’admin ?');
  });

  it('garde le message personnalisé de l’admin tel quel', () => {
    const result = evaluateCompatibility({
      rule: {
        acceptedLengths: ['LONG'],
        acceptedHairTypes: [],
        requiresLocs: false,
        incompatibleLocs: false,
        photoPolicy: 'OPTIONAL',
        autoApprove: true,
        conditionsNote: null,
        incompatibleMessage: 'Message de Sarielle.',
        uncertainMessage: null,
      },
      answers: { hairLength: 'SHORT' },
    });
    expect(localizeMessage('de', result.message)).toBe('Message de Sarielle.');
  });
});

describe('langue de l’évaluation', () => {
  it('mémorise la langue dans les réponses puis la retire pour le dashboard', () => {
    const stored = withAssessmentLocale({ hair_length: 'LONG' }, 'de');
    expect(readAssessmentLocale(stored)).toBe('de');
    expect(withoutAssessmentLocale(stored)).toEqual({ hair_length: 'LONG' });
    expect(readAssessmentLocale({})).toBe('fr');
  });

  it('place la langue de la cliente dans le payload de la décision', () => {
    const row = buildAssessmentDecisionNotification({
      assessmentId: 'a1',
      decision: 'ACCEPT',
      serviceName: 'Tresses',
      customerName: 'Awa',
      customerEmail: 'awa@example.com',
      message: 'ok',
      decidedAt: new Date('2026-10-22T10:00:00Z'),
      locale: 'de',
    });
    expect(row?.payload).toMatchObject({ locale: 'de' });
  });
});
