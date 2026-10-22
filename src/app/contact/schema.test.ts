import { describe, expect, it } from 'vitest';
import { contactSchema } from './schema';

const base = {
  name: 'Awa Diop',
  email: 'awa@example.com',
  subject: 'Question',
  message: 'Bonjour, avez-vous un créneau samedi ?',
};

describe('contactSchema', () => {
  it('accepts an empty optional phone', () => {
    const result = contactSchema.safeParse({ ...base, phone: '' });
    expect(result.success).toBe(true);
  });

  it('accepts a missing phone', () => {
    expect(contactSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a too short phone', () => {
    expect(contactSchema.safeParse({ ...base, phone: '123' }).success).toBe(false);
  });

  it('accepts a valid phone', () => {
    expect(contactSchema.safeParse({ ...base, phone: '+221 77 000 00 00' }).success).toBe(true);
  });
});
