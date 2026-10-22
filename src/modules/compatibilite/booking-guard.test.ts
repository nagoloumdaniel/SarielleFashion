import { describe, expect, it } from 'vitest';
import { verifyBookingCompatibility } from './booking-guard';
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

const base = {
  serviceId: 'service-1',
  rule: rule(),
  answers: {},
  assessment: null,
};

describe('verifyBookingCompatibility', () => {
  it('should allow booking when the rules are compatible and auto approved', () => {
    const result = verifyBookingCompatibility(base);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('RULES_OK');
  });

  it('should reject an incompatible booking without an accepted assessment', () => {
    const result = verifyBookingCompatibility({
      ...base,
      rule: rule({ acceptedLengths: ['LONG'] }),
      answers: { hairLength: 'SHORT' },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('INCOMPATIBLE');
  });

  it('should require an assessment when the rules need manual review', () => {
    const result = verifyBookingCompatibility({
      ...base,
      rule: rule({ autoApprove: false }),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('REVIEW_REQUIRED');
  });

  it('should require an assessment when a photo is mandatory', () => {
    const result = verifyBookingCompatibility({
      ...base,
      rule: rule({ photoPolicy: 'REQUIRED' }),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('REVIEW_REQUIRED');
  });

  it('should allow booking after an accepted assessment for the same service', () => {
    const result = verifyBookingCompatibility({
      ...base,
      rule: rule({ acceptedLengths: ['LONG'] }),
      answers: { hairLength: 'SHORT' },
      assessment: { serviceId: 'service-1', status: 'ACCEPTED' },
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('ASSESSMENT_ACCEPTED');
  });

  it('should ignore an accepted assessment that belongs to another service', () => {
    const result = verifyBookingCompatibility({
      ...base,
      rule: rule({ acceptedLengths: ['LONG'] }),
      answers: { hairLength: 'SHORT' },
      assessment: { serviceId: 'service-2', status: 'ACCEPTED' },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('INCOMPATIBLE');
  });

  it('should reject when the assessment was refused', () => {
    const result = verifyBookingCompatibility({
      ...base,
      assessment: { serviceId: 'service-1', status: 'REFUSED' },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ASSESSMENT_REFUSED');
  });

  it('should wait when more information was requested', () => {
    const result = verifyBookingCompatibility({
      ...base,
      assessment: { serviceId: 'service-1', status: 'INFO_REQUESTED' },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('AWAITING_INFORMATION');
  });

  it('should wait while the assessment is being reviewed', () => {
    expect(
      verifyBookingCompatibility({
        ...base,
        assessment: { serviceId: 'service-1', status: 'RECEIVED' },
      }).reason,
    ).toBe('AWAITING_DECISION');
    expect(
      verifyBookingCompatibility({
        ...base,
        assessment: { serviceId: 'service-1', status: 'IN_PROGRESS' },
      }).reason,
    ).toBe('AWAITING_DECISION');
  });

  it('should block an uncertain case without an assessment', () => {
    const result = verifyBookingCompatibility({
      ...base,
      rule: rule({ acceptedLengths: ['LONG'] }),
      answers: { hairLength: 'UNSURE' },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('AWAITING_ASSESSMENT');
  });

  it('should not mutate the data it receives', () => {
    const input = {
      ...base,
      rule: rule({ acceptedLengths: ['LONG'] }),
      answers: { hairLength: 'SHORT' as const },
      assessment: null,
    };
    const snapshot = JSON.stringify(input);
    verifyBookingCompatibility(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
