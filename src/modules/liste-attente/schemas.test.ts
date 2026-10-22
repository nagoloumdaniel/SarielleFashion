import { describe, expect, it } from 'vitest';
import { waitlistEntrySchema } from './schemas';

const valid = {
  serviceId: 'svc123',
  startsAtISO: '2026-11-20T10:00:00.000Z',
  name: 'Amina Test',
  email: 'amina@example.com',
  phone: '+49 151 23456789',
  website: '',
};

describe('waitlistEntrySchema', () => {
  it('should accept a valid entry with a Senegalese phone number', () => {
    expect(waitlistEntrySchema.safeParse(valid).success).toBe(true);
  });

  it('should reject a phone with letters or markup', () => {
    expect(waitlistEntrySchema.safeParse({ ...valid, phone: '77 123 45 6a' }).success).toBe(false);
    expect(waitlistEntrySchema.safeParse({ ...valid, phone: '<b>7712345678</b>' }).success).toBe(
      false,
    );
  });

  it('should reject a too short phone', () => {
    expect(waitlistEntrySchema.safeParse({ ...valid, phone: '1234' }).success).toBe(false);
  });
});
