import { describe, expect, it } from 'vitest';
import {
  adminCancelSchema,
  adminRescheduleSchema,
  bookingRequestSchema,
  bookingSlotsSchema,
  calendarQuerySchema,
  customerCancelSchema,
} from './schemas';

const validBooking = {
  serviceSlug: 'tresses-collees',
  dateISO: '2026-06-15',
  startsAt: '2026-06-15T08:00:00.000Z',
  timeZone: 'Europe/Paris',
  name: 'Amina Test',
  email: 'amina@example.com',
  phone: '06 12 34 56 78',
  comment: 'Cheveux fins.',
  consent: 'on',
};

describe('bookingRequestSchema', () => {
  it('should accept a complete booking request', () => {
    const result = bookingRequestSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('amina@example.com');
      expect(result.data.consent).toBe(true);
    }
  });

  it('should reject a missing consent', () => {
    expect(bookingRequestSchema.safeParse({ ...validBooking, consent: '' }).success).toBe(false);
  });

  it('should reject an invalid timezone', () => {
    expect(
      bookingRequestSchema.safeParse({ ...validBooking, timeZone: 'Mars/Olympus' }).success,
    ).toBe(false);
  });

  it('should reject an invalid date or start instant', () => {
    expect(bookingRequestSchema.safeParse({ ...validBooking, dateISO: '15-06-2026' }).success).toBe(
      false,
    );
    expect(bookingRequestSchema.safeParse({ ...validBooking, startsAt: 'demain' }).success).toBe(
      false,
    );
  });

  it('should default the optional promo code to an empty string and trim it', () => {
    const none = bookingRequestSchema.safeParse(validBooking);
    expect(none.success && none.data.promoCode).toBe('');
    const coded = bookingRequestSchema.safeParse({ ...validBooking, promoCode: '  bienvenue ' });
    expect(coded.success && coded.data.promoCode).toBe('bienvenue');
  });

  it('should reject an invalid phone number', () => {
    expect(bookingRequestSchema.safeParse({ ...validBooking, phone: 'abc' }).success).toBe(false);
  });
});

describe('bookingSlotsSchema', () => {
  it('should accept a date and timezone query', () => {
    expect(
      bookingSlotsSchema.safeParse({
        serviceSlug: 'tresses-collees',
        dateISO: '2026-06-15',
        timeZone: 'Europe/Paris',
      }).success,
    ).toBe(true);
  });
});

describe('customerCancelSchema', () => {
  it('should accept a 64-character hexadecimal token', () => {
    expect(
      customerCancelSchema.safeParse({ token: 'a'.repeat(64), reason: 'Empêchement' }).success,
    ).toBe(true);
  });

  it('should reject a malformed token', () => {
    expect(customerCancelSchema.safeParse({ token: 'abc', reason: '' }).success).toBe(false);
  });
});

describe('adminCancelSchema and adminRescheduleSchema', () => {
  it('should accept an admin cancellation', () => {
    expect(
      adminCancelSchema.safeParse({
        appointmentId: 'cm0appointment000000000000',
        reason: 'Indisponible',
      }).success,
    ).toBe(true);
  });

  it('should accept an admin reschedule', () => {
    expect(
      adminRescheduleSchema.safeParse({
        appointmentId: 'cm0appointment000000000000',
        dateISO: '2026-06-16',
        startsAt: '2026-06-16T13:00:00.000Z',
        timeZone: 'Europe/Paris',
      }).success,
    ).toBe(true);
  });
});

describe('calendarQuerySchema', () => {
  it('should default to week view', () => {
    const result = calendarQuerySchema.safeParse({ timeZone: 'Europe/Paris' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.view).toBe('week');
  });

  it('should reject an unknown view', () => {
    expect(calendarQuerySchema.safeParse({ timeZone: 'Europe/Paris', view: 'year' }).success).toBe(
      false,
    );
  });
});

describe('bookingRequestSchema home service', () => {
  it('should default to no home service and an empty address', () => {
    const result = bookingRequestSchema.safeParse(validBooking);
    expect(result.success && result.data.homeService).toBe(false);
    expect(result.success && result.data.homeAddress).toBe('');
  });

  it('should require an address when the home service is requested', () => {
    expect(bookingRequestSchema.safeParse({ ...validBooking, homeService: 'on' }).success).toBe(
      false,
    );
    expect(
      bookingRequestSchema.safeParse({ ...validBooking, homeService: 'on', homeAddress: '  ab ' })
        .success,
    ).toBe(false);
  });

  it('should accept and trim a home address', () => {
    const result = bookingRequestSchema.safeParse({
      ...validBooking,
      homeService: 'on',
      homeAddress: '  Mermoz, rue 12, villa 4  ',
    });
    expect(result.success && result.data.homeService).toBe(true);
    expect(result.success && result.data.homeAddress).toBe('Mermoz, rue 12, villa 4');
  });

  it('should bound the address length', () => {
    expect(
      bookingRequestSchema.safeParse({
        ...validBooking,
        homeService: 'on',
        homeAddress: 'a'.repeat(301),
      }).success,
    ).toBe(false);
  });

  it('should drop a stray address when the home service is not requested', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, homeAddress: 'Mermoz' });
    expect(result.success && result.data.homeAddress).toBe('');
  });
});
