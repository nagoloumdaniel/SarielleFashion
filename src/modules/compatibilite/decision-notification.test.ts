import { describe, expect, it } from 'vitest';
import { buildAssessmentDecisionNotification } from './decision-notification';

const base = {
  assessmentId: 'ev1',
  serviceName: 'Départ de locs',
  customerName: 'Amina',
  customerEmail: 'Amina@Example.com',
  message: 'Bienvenue.',
  decidedAt: new Date('2026-10-20T10:00:00.000Z'),
};

describe('buildAssessmentDecisionNotification', () => {
  it.each([
    ['ACCEPT', 'ACCEPTED'],
    ['ALLOW_CONDITIONAL', 'CONDITIONAL'],
    ['REFUSE', 'REFUSED'],
    ['REQUEST_INFO', 'INFO_REQUESTED'],
    ['PROPOSE_ALTERNATIVE', 'INFO_REQUESTED'],
  ] as const)('should map %s to the %s email variant', (decision, expected) => {
    const row = buildAssessmentDecisionNotification({ ...base, decision });
    expect(row?.templateKey).toBe('assessment_decision');
    expect((row?.payload as { decision: string }).decision).toBe(expected);
  });

  it('should target the customer email, lowercased, with an idempotency key per decision', () => {
    const row = buildAssessmentDecisionNotification({ ...base, decision: 'ACCEPT' });
    expect(row?.recipient).toBe('amina@example.com');
    expect(row?.idempotencyKey).toBe('assessment:ev1:decision:2026-10-20T10:00:00.000Z:client');
  });

  it('should return null when no usable email exists', () => {
    expect(
      buildAssessmentDecisionNotification({ ...base, decision: 'ACCEPT', customerEmail: null }),
    ).toBeNull();
    expect(
      buildAssessmentDecisionNotification({ ...base, decision: 'ACCEPT', customerEmail: '  ' }),
    ).toBeNull();
    expect(
      buildAssessmentDecisionNotification({ ...base, decision: 'ACCEPT', customerEmail: 'nope' }),
    ).toBeNull();
  });

  it('should carry the message and never any appointment data', () => {
    const row = buildAssessmentDecisionNotification({ ...base, decision: 'ACCEPT' });
    const payload = row?.payload as Record<string, unknown>;
    expect(payload.message).toBe('Bienvenue.');
    expect(payload.kind).toBe('assessment');
    expect(payload).not.toHaveProperty('appointmentId');
  });
});
