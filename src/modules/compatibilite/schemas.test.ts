import { describe, expect, it } from 'vitest';
import {
  assessmentDecisionSchema,
  assessmentPreviewSchema,
  assessmentSubmissionSchema,
} from './schemas';

const validSubmission = {
  serviceSlug: 'tresses-collees',
  answers: {
    hair_length: 'LONG',
    has_locs: 'NO',
  },
  name: 'Amina Test',
  email: 'amina@example.com',
  phone: '06 12 34 56 78',
  comment: 'Mes cheveux sont fins.',
  consent: 'on',
};

describe('assessmentSubmissionSchema', () => {
  it('should accept a complete request', () => {
    const result = assessmentSubmissionSchema.safeParse(validSubmission);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('amina@example.com');
      expect(result.data.consent).toBe(true);
    }
  });

  it('should reject a missing consent', () => {
    const result = assessmentSubmissionSchema.safeParse({ ...validSubmission, consent: '' });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid email or phone', () => {
    expect(
      assessmentSubmissionSchema.safeParse({ ...validSubmission, email: 'pas-un-email' }).success,
    ).toBe(false);
    expect(assessmentSubmissionSchema.safeParse({ ...validSubmission, phone: 'abc' }).success).toBe(
      false,
    );
  });

  it('should reject a too long comment', () => {
    const result = assessmentSubmissionSchema.safeParse({
      ...validSubmission,
      comment: 'x'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe('assessmentPreviewSchema', () => {
  it('should accept answers without contact information', () => {
    const result = assessmentPreviewSchema.safeParse({
      serviceSlug: 'tresses-collees',
      answers: { hair_length: 'SHORT' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject a missing service', () => {
    const result = assessmentPreviewSchema.safeParse({ serviceSlug: '', answers: {} });
    expect(result.success).toBe(false);
  });
});

describe('assessmentDecisionSchema', () => {
  const validDecision = {
    assessmentId: 'cm0assessment000000000000000',
    decision: 'ACCEPT',
    decisionMessage: 'Votre longueur est suffisante, vous pouvez réserver.',
    decisionNote: '',
  };

  it('should accept a valid decision', () => {
    expect(assessmentDecisionSchema.safeParse(validDecision).success).toBe(true);
  });

  it('should reject an unknown decision', () => {
    expect(
      assessmentDecisionSchema.safeParse({ ...validDecision, decision: 'MAYBE' }).success,
    ).toBe(false);
  });

  it('should require a message for the client', () => {
    expect(
      assessmentDecisionSchema.safeParse({ ...validDecision, decisionMessage: '' }).success,
    ).toBe(false);
  });
});
