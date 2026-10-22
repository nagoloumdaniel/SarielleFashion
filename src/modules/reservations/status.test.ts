import { describe, expect, it } from 'vitest';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  allowedTransitions,
  canTransition,
  isActiveAppointmentStatus,
  TERMINAL_APPOINTMENT_STATUSES,
} from './status';

describe('appointment status machine', () => {
  it('should allow pending to become confirmed', () => {
    expect(canTransition('PENDING', 'CONFIRMED')).toBe(true);
  });

  it('should allow cancellations from active statuses', () => {
    expect(canTransition('CONFIRMED', 'CANCELLED_BY_CUSTOMER')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED_BY_ADMIN')).toBe(true);
    expect(canTransition('RESCHEDULED', 'CANCELLED_BY_CUSTOMER')).toBe(true);
  });

  it('should allow completion and no-show only for confirmed appointments', () => {
    expect(canTransition('CONFIRMED', 'COMPLETED')).toBe(true);
    expect(canTransition('CONFIRMED', 'NO_SHOW')).toBe(true);
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
    expect(canTransition('PENDING', 'NO_SHOW')).toBe(false);
  });

  it('should never leave a terminal status', () => {
    for (const status of TERMINAL_APPOINTMENT_STATUSES) {
      expect(allowedTransitions(status)).toEqual([]);
    }
  });

  it('should treat pending, confirmed and rescheduled as active', () => {
    for (const status of ACTIVE_APPOINTMENT_STATUSES) {
      expect(isActiveAppointmentStatus(status)).toBe(true);
    }
    for (const status of TERMINAL_APPOINTMENT_STATUSES) {
      expect(isActiveAppointmentStatus(status)).toBe(false);
    }
  });

  it('should refuse an unknown transition', () => {
    // @ts-expect-error statut inconnu volontaire pour tester le refus
    expect(canTransition('UNKNOWN', 'CONFIRMED')).toBe(false);
  });
});
